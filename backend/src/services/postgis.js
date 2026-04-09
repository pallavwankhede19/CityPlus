'use strict';

const db = require('../db');
const { AppError } = require('../utils/errors');

const SEARCH_RADIUS_METERS = Number(process.env.SIGNAL_SEARCH_RADIUS_METRES) || 50;

/**
 * Finds signals near a route using ST_DWithin.
 * @param {string} routeLineStringWkt
 * @returns {Promise<Array<{intersection_id: string, location: {lat: number, lng: number}}>>}
 */
async function getSignalsNearRoute(routeLineStringWkt) {
  const sql = `
    SELECT
      s.intersection_id,
      ST_Y(s.location::geometry) AS lat,
      ST_X(s.location::geometry) AS lng,
      s.data,
      ST_LineLocatePoint(
        ST_GeomFromText($1, 4326),
        s.location::geometry
      ) AS route_fraction
    FROM signals s
    WHERE ST_DWithin(
      s.location,
      ST_GeomFromText($1, 4326)::geography,
      $2
    )
    ORDER BY route_fraction ASC;
  `;

  let result;
  try {
    result = await db.query(sql, [routeLineStringWkt, SEARCH_RADIUS_METERS]);
  } catch (error) {
    throw new AppError(`Database failure while reading route signals: ${error.message}`, 500);
  }

  return result.rows.map((row) => ({
    ...extractSignalState(row.data),
    intersection_id: row.intersection_id,
    location: {
      lat: Number(row.lat),
      lng: Number(row.lng),
    },
  }));
}

async function upsertIntersectionData({ intersection_id, location, signals }) {
  const sql = `
    INSERT INTO signals (intersection_id, location, data, last_updated)
    VALUES (
      $1,
      ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
      $4::jsonb,
      NOW()
    )
    ON CONFLICT (intersection_id)
    DO UPDATE SET
      location = EXCLUDED.location,
      data = EXCLUDED.data,
      last_updated = NOW();
  `;

  let payload;
  try {
    payload = JSON.stringify(signals);
  } catch (_error) {
    throw new AppError('Invalid input: signals must be valid JSON.', 400);
  }

  try {
    await db.query(sql, [intersection_id, location.lng, location.lat, payload]);
  } catch (error) {
    throw new AppError(`Database failure while upserting intersection data: ${error.message}`, 500);
  }
}

function extractSignalState(data) {
  if (!data || typeof data !== 'object') {
    return {
      state: null,
      remaining_time: null,
      queue_length: null,
    };
  }

  if (data.state !== undefined || data.remaining_time !== undefined || data.queue_length !== undefined) {
    return {
      state: data.state ?? null,
      remaining_time: data.remaining_time ?? null,
      queue_length: data.queue_length ?? null,
    };
  }

  const signalKeys = Object.keys(data);
  for (const key of signalKeys) {
    const item = data[key];
    if (item && typeof item === 'object' && item.state !== undefined) {
      return {
        state: item.state ?? null,
        remaining_time: item.remaining_time ?? null,
        queue_length: item.queue_length ?? null,
      };
    }
  }

  return {
    state: null,
    remaining_time: null,
    queue_length: null,
  };
}

module.exports = { getSignalsNearRoute, upsertIntersectionData };
