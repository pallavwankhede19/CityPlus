'use strict';

const polyline = require('../utils/polyline');
const cache = require('../utils/cache');
const { AppError } = require('../utils/errors');
const googleMapsService = require('../services/googleMaps');
const postgisService = require('../services/postgis');

async function getRouteSignals(req, res, next) {
  try {
    const { origin, destination } = req.body;

    if (!origin || !destination || typeof origin !== 'string' || typeof destination !== 'string') {
      throw new AppError('Invalid input: origin and destination are required strings.', 400);
    }

    const cacheKey = cache.buildKey(origin, destination);
    let cached = null;
    try {
      cached = await cache.get(cacheKey);
    } catch (_error) {
      cached = null;
    }
    if (cached) {
      return res.status(200).json(cached);
    }

    const route = await googleMapsService.getRoute(origin, destination);
    const coordinates = polyline.decode(route.polyline);
    const routeLineString = polyline.coordsToWKT(coordinates);

    const signals = await postgisService.getSignalsNearRoute(routeLineString);

    const responseBody = {
      route: {
        polyline: route.polyline,
        duration: route.duration,
        traffic_duration: route.traffic_duration,
      },
      signals: signals.map((signal) => ({
        intersection_id: signal.intersection_id,
        location: signal.location,
        state: signal.state,
        remaining_time: signal.remaining_time,
        queue_length: signal.queue_length,
      })),
    };

    try {
      await cache.set(cacheKey, responseBody);
    } catch (_error) {
      // Ignore cache write errors to avoid failing successful API responses.
    }

    return res.status(200).json(responseBody);
  } catch (error) {
    return next(error);
  }
}

module.exports = { getRouteSignals };
