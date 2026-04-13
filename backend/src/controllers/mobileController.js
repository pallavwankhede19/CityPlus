'use strict';

const polyline = require('../utils/polyline');
const cache = require('../utils/cache');
const { AppError, ExternalServiceError } = require('../utils/errors');
const { getRoutes } = require('../services/googleMaps');
const postgisService = require('../services/postgis');

function normalizeEndpoint(value) {
  if (typeof value === 'string') {
    const t = value.trim();
    return t.length ? t : null;
  }
  if (
    value &&
    typeof value === 'object' &&
    Number.isFinite(Number(value.lat)) &&
    Number.isFinite(Number(value.lng))
  ) {
    return `${Number(value.lat)},${Number(value.lng)}`;
  }
  return null;
}

const logger = require('../utils/logger');

function createSimpleRouteResponse(polylineValue) {
  return {
    best_route: {
      polyline: polylineValue || '',
      total_delay: 0,
      traffic_delay: 0,
      signal_delay: 0,
      score: 0,
      signals: [],
      meta: {
        signals_count: 0
      }
    },
    alternatives: []
  };
}

function normalizeSignal(signal) {
  const data = (signal && typeof signal === 'object' && signal.data && typeof signal.data === 'object')
    ? signal.data
    : {};

  const state = data.state || 'UNKNOWN';
  const rawTimer = data.timer;
  const timer = (rawTimer !== null && rawTimer !== undefined && !Number.isNaN(Number(rawTimer)))
    ? Number(rawTimer)
    : 0;
  const rawQueue = data.queue_length;
  const queueLength = (rawQueue !== null && rawQueue !== undefined && !Number.isNaN(Number(rawQueue)))
    ? Number(rawQueue)
    : 0;
  const delay = state === 'RED' ? timer : 0;

  return {
    ...signal,
    data: {
      ...data,
      state,
      timer,
      queue_length: queueLength
    },
    state,
    timer,
    queue_length: queueLength,
    delay
  };
}

function getTrafficDelay(intervals) {
  if (!Array.isArray(intervals) || !intervals.length) {
    return 0;
  }

  return intervals.reduce((sum, interval) => {
    const speed = String(interval?.speed || '').toUpperCase();
    if (speed === 'TRAFFIC_JAM') {
      return sum + 20;
    }
    if (speed === 'SLOW') {
      return sum + 10;
    }
    return sum;
  }, 0);
}

async function getRouteSignals(req, res, next) {
  try {
    const origin = normalizeEndpoint(req.body?.origin);
    const destination = normalizeEndpoint(req.body?.destination);
    logger.debug(`Fetching routes: ${origin} -> ${destination}`);

    if (!origin || !destination) {
      throw new AppError('origin and destination are required.', 400);
    }

    if (origin === destination) {
      return res.status(200).json(createSimpleRouteResponse(''));
    }

    let routes;
    try {
      routes = await getRoutes(origin, destination);
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        logger.error(`Google service failure: ${error.message}`);
        return res.status(502).json({ error: 'External service failure' });
      }
      throw error;
    }
    if (!routes || routes.length === 0) {
      throw new AppError('No routes found', 404);
    }

    logger.debug(`Found ${routes.length} alternative routes`);

    const evaluatedRoutes = await Promise.all(routes.map(async (r, index) => {
      logger.debug(`Route ${index + 1}: polyline decode start`);
      const coords = polyline.decode(r.polyline);
      logger.debug(`Route ${index + 1}: polyline decode done (coords=${coords.length})`);
      if (!coords || coords.length < 2) {
        const trafficDelay = 0;
        return {
          polyline: r.polyline,
          duration: r.duration,
          duration_seconds: r.duration_seconds,
          traffic_duration: r.duration,
          traffic_duration_seconds: r.duration_seconds,
          total_delay: 0,
          traffic_delay: trafficDelay,
          signal_delay: 0,
          signals_count: 0,
          signals: [],
          score: 0
        };
      }

      const routeWkt = polyline.coordsToWKT(coords);
      logger.debug(`Route ${index + 1}: DB query start (signals along route)`);
      let signals = [];
      try {
        signals = await postgisService.getSignalsAlongRoute(routeWkt);
      } catch (error) {
        logger.error(`Route ${index + 1}: DB failure, falling back to empty signals: ${error.message}`);
        signals = [];
      }
      logger.debug(`Route ${index + 1}: DB query done (rows=${(signals || []).length})`);
      logger.debug(`Route ${index + 1}: signal mapping start`);
      const signalsWithDelay = (signals || []).map(normalizeSignal);
      logger.debug(`Route ${index + 1}: signal mapping done (mapped=${signalsWithDelay.length})`);
      const signalDelay = signalsWithDelay.reduce((sum, s) => sum + (Number(s.delay) || 0), 0);
      const trafficDelay = 0;
      const routeDelay = signalDelay;
      const score = signalDelay;
      logger.info(`Route ${index + 1}: Delay = ${routeDelay}s, Score = ${score.toFixed(1)}, Signals = ${signalsWithDelay.length}`);

      return {
        polyline: r.polyline,
        duration: Number(r.duration_seconds) || 0,
        duration_seconds: Number(r.duration_seconds) || 0,
        traffic_duration: Number(r.duration_seconds) || 0,
        traffic_duration_seconds: Number(r.duration_seconds) || 0,
        total_delay: routeDelay,
        traffic_delay: trafficDelay,
        signal_delay: signalDelay,
        signals_count: signalsWithDelay.length,
        signals: signalsWithDelay,
        score
      };
    }));

    if (!evaluatedRoutes.length) {
      throw new AppError('No routes found', 404);
    }

    // Use the same evaluated route objects for best route and alternatives.
    const candidateRoutes = evaluatedRoutes.filter((route) => route.signals_count > 0);
    const sortableRoutes = candidateRoutes.length ? candidateRoutes : evaluatedRoutes;
    sortableRoutes.sort((a, b) => (
      (a.score - b.score) ||
      (a.total_delay - b.total_delay)
    ));
    const bestRoute = sortableRoutes[0];
    logger.info(`Best Route Selected: Score = ${bestRoute.score.toFixed(1)}, Signals = ${bestRoute.signals_count}`);

    const alternatives = evaluatedRoutes
      .filter(r => r.polyline !== bestRoute.polyline)
      .map(r => ({
        delay: r.total_delay,
        traffic_delay: r.traffic_delay,
        signal_delay: r.signal_delay,
        signals_count: r.signals_count,
        score: r.score
      }));

    return res.status(200).json({
      best_route: {
        polyline: bestRoute.polyline,
        total_delay: bestRoute.total_delay,
        traffic_delay: bestRoute.traffic_delay,
        signal_delay: bestRoute.signal_delay,
        score: bestRoute.score,
        signals: bestRoute.signals,
        meta: {
          signals_count: bestRoute.signals_count
        }
      },
      alternatives
    });
  } catch (error) {
    logger.error(`Error in getRouteSignals: ${error.message}`);
    return next(error);
  }
}

module.exports = { getRouteSignals };
