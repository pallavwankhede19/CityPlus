'use strict';

const postgisService = require('../services/postgis');
const { AppError } = require('../utils/errors');
const { getIo } = require('../socket');

async function ingestIntersectionData(req, res, next) {
  try {
    const lat = Number(req.body?.lat);
    const lon = Number(req.body?.lon);
    const queueLength = Number(req.body?.queue_length);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new AppError('Invalid input: lat must be a valid latitude.', 400);
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
      throw new AppError('Invalid input: lon must be a valid longitude.', 400);
    }
    if (!Number.isFinite(queueLength) || queueLength < 0) {
      throw new AppError('Invalid input: queue_length must be a non-negative number.', 400);
    }

    const greenTime = (queueLength / 1.8) + 4;
    const state = queueLength > 5 ? 'RED' : 'GREEN';

    const updated = await postgisService.updateNearestSignalByQueue({
      lat,
      lon,
      queueLength,
      state,
      greenTime,
    });

    if (!updated) {
      throw new AppError('No signals available to update.', 404);
    }

    const io = getIo();
    if (io) {
      io.emit('intersection_update', {
        intersection_id: updated.intersection_id,
        location: { lat, lon },
        data: updated.data,
        last_updated: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      intersection_id: updated.intersection_id,
      updated_data: updated.data,
    });
  } catch (error) {
    return next(error);
  }
}

async function getAllSignals(req, res, next) {
  try {
    const signals = await postgisService.getAllSignals();
    return res.status(200).json({
      success: true,
      count: signals.length,
      signals: signals.map(s => ({
        intersection_id: s.id,
        intersection_name: s.name,
        location: { latitude: s.lat, longitude: s.lng },
        data: s.data
      }))
    });
  } catch (error) {
    return next(error);
  }
}

async function bulkIngestData(req, res, next) {
  try {
    const updates = req.body?.updates;
    if (!Array.isArray(updates)) {
      throw new AppError('Invalid input: updates must be an array.', 400);
    }

    const results = [];
    // Process in batches or parallel to keep it fast
    for (const item of updates) {
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      const queueLength = Number(item.queue_length);
      const greenTime = (queueLength / 1.8) + 4;
      const state = queueLength > 5 ? 'RED' : 'GREEN';

      const updated = await postgisService.updateNearestSignalByQueue({
        lat, lon, queueLength, state, greenTime
      });
      if (updated) results.push(updated);
    }

    return res.status(200).json({ success: true, count: results.length });
  } catch (error) {
    return next(error);
  }
}

module.exports = { ingestIntersectionData, getAllSignals, bulkIngestData };
