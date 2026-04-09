'use strict';

const axios = require('axios');
const { ExternalServiceError } = require('../utils/errors');

const BASE_URL = 'https://maps.googleapis.com/maps/api/directions/json';
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Fetch a driving route from Google Directions API.
 *
 * @param {string} origin       - Origin address or "lat,lng"
 * @param {string} destination  - Destination address or "lat,lng"
 * @returns {Promise<{ polyline: string, duration: string, traffic_duration: string }>}
 */
async function getRoute(origin, destination) {
  if (!API_KEY) {
    throw new ExternalServiceError('Google Directions API', 'GOOGLE_MAPS_API_KEY is not configured.');
  }

  let response;
  try {
    response = await axios.get(BASE_URL, {
      params: {
        origin,
        destination,
        mode: 'driving',
        departure_time: 'now',
        key: API_KEY,
      },
      timeout: 10000,
    });
  } catch (error) {
    throw new ExternalServiceError('Google Directions API', error.message);
  }

  const { data } = response;

  if (data.status !== 'OK' || !data.routes || !data.routes[0] || !data.routes[0].legs || !data.routes[0].legs[0]) {
    throw new ExternalServiceError('Google Directions API', data.status || 'UNKNOWN');
  }

  const route = data.routes[0];
  const leg = route.legs[0];

  return {
    polyline: route.overview_polyline.points,
    duration: leg.duration.text,
    traffic_duration: leg.duration_in_traffic ? leg.duration_in_traffic.text : leg.duration.text,
  };
}

module.exports = { getRoute };
