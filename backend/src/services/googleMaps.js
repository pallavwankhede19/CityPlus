'use strict';

const axios = require('axios');
const { ExternalServiceError } = require('../utils/errors');
const logger = require('../utils/logger');

const BASE_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 20000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch routes from Google Routes API.
 *
 * @param {string} origin       - Origin address or "lat,lng"
 * @param {string} destination  - Destination address or "lat,lng"
 * @returns {Promise<Array>}
 */
async function getRoutes(origin, destination) {
  if (!API_KEY) {
    throw new ExternalServiceError('Google Routes API', 'GOOGLE_MAPS_API_KEY is not configured.');
  }

  const toLatLng = (input, label) => {
    if (input && typeof input === 'object') {
      const lat = Number(input.lat);
      const lng = Number(input.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }

    const raw = String(input ?? '').trim();
    const parts = raw.split(',');
    if (parts.length === 2) {
      const lat = Number(parts[0].trim());
      const lng = Number(parts[1].trim());
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { latitude: lat, longitude: lng };
      }
    }

    throw new ExternalServiceError('Google Routes API', `${label} must be in "lat,lng" format.`);
  };

  const originLatLng = toLatLng(origin, 'origin');
  const destinationLatLng = toLatLng(destination, 'destination');

  const payload = {
    origin: {
      location: {
        latLng: originLatLng,
      },
    },
    destination: {
      location: {
        latLng: destinationLatLng,
      },
    },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
    computeAlternativeRoutes: true,
  };

  const requestConfig = {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.travelAdvisory.speedReadingIntervals',
    },
    timeout: REQUEST_TIMEOUT_MS,
  };

  let response;
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      logger.debug(`Google Routes API call attempt ${attempt}/${MAX_RETRIES}: ${origin} -> ${destination}`);
      response = await axios.post(BASE_URL, payload, requestConfig);
      logger.debug(`Google Routes API call success on attempt ${attempt}`);
      logger.debug(`Google Routes API success response: ${JSON.stringify(response.data)}`);
      break;
    } catch (error) {
      lastError = error;
      const delay = 500 * (2 ** (attempt - 1));
      logger.warn(`Google Routes API retry ${attempt}/${MAX_RETRIES} failed: ${error.message}`);
      if (error.response?.data) {
        logger.error(`Google Routes API error response: ${JSON.stringify(error.response.data)}`);
      }
      if (attempt < MAX_RETRIES) {
        await sleep(delay);
      }
    }
  }

  if (!response) {
    const isTimeout = lastError?.code === 'ECONNABORTED';
    const failureMessage = isTimeout
      ? 'Google Routes API timeout'
      : (lastError?.message || 'Google Routes API request failed');
    logger.error(`Google Routes API call failed after retries: ${failureMessage}`);
    throw new ExternalServiceError('Google Routes API', failureMessage);
  }

  const { data } = response;
  const routes = Array.isArray(data?.routes) ? data.routes : [];

  if (!routes.length) {
    return [];
  }

  return routes.map((route) => {
    const durationSeconds = Number.parseInt(String(route?.duration || '0s').replace('s', ''), 10) || 0;
    const speedReadingIntervals = (Array.isArray(route?.legs) ? route.legs : []).flatMap((leg) => (
      Array.isArray(leg?.travelAdvisory?.speedReadingIntervals) ? leg.travelAdvisory.speedReadingIntervals : []
    ));

    return {
      polyline: route?.polyline?.encodedPolyline || '',
      duration: durationSeconds,
      duration_seconds: durationSeconds,
      speedReadingIntervals,
    };
  });
}

module.exports = { getRoutes };
