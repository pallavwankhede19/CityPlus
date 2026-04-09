'use strict';

const postgisService = require('../services/postgis');
const { AppError } = require('../utils/errors');
const { getIo } = require('../socket');

async function ingestIntersectionData(req, res, next) {
  try {
    const { intersection_id, location, signals } = req.body || {};

    const id = typeof intersection_id === 'string' ? intersection_id.trim() : '';
    const lat = location?.lat !== undefined ? Number(location.lat) : NaN;
    const lng = location?.lng !== undefined ? Number(location.lng) : NaN;

    if (!id) {
      throw new AppError('Invalid input: intersection_id is required.', 400);
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new AppError('Invalid input: location.lat and location.lng must be numbers.', 400);
    }
    if (signals === null || signals === undefined || typeof signals !== 'object') {
      throw new AppError('Invalid input: signals JSON is required.', 400);
    }

    await postgisService.upsertIntersectionData({
      intersection_id: id,
      location: { lat, lng },
      signals,
    });

    const io = getIo();
    if (io) {
      io.emit('intersection_update', {
        intersection_id: id,
        location: { lat, lng },
        signals,
        last_updated: new Date().toISOString(),
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = { ingestIntersectionData };
