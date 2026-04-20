'use strict';

const db = require('../db');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

const SEARCH_RADIUS_METERS =
  Number(process.env.SIGNAL_SEARCH_RADIUS_METERS || process.env.SIGNAL_SEARCH_RADIUS_METRES) || 50;

/**
 * Finds signals near a route using ST_DWithin.
 * @param {string} routeLineStringWkt
 * @returns {Promise<Array<{intersection_id: string, location: {lat: number, lng: number}}>>}
 */
async function getSignalsNearRoute(routeLineStringWkt) {
  const sql = `
    WITH route AS (
      SELECT ST_GeomFromText($1, 4326) AS geom
    )
    SELECT
      s.intersection_id,
      ST_Y(s.location::geometry) AS lat,
      ST_X(s.location::geometry) AS lng,
      s.data,
      ST_LineLocatePoint(route.geom, s.location::geometry) AS route_fraction
    FROM signals s
    CROSS JOIN route
    WHERE ST_DWithin(s.location, route.geom::geography, $2)
    ORDER BY route_fraction ASC;
  `;

  let result;
  try {
    result = await db.query(sql, [routeLineStringWkt, SEARCH_RADIUS_METERS]);
  } catch (error) {
    throw new AppError(`Database failure while reading route signals: ${error.message}`, 500);
  }

  const uniqueSignals = [];
  const seenPositions = new Set();

  for (const row of result.rows) {
    const gridKey = `${Number(row.lng).toFixed(3)}_${Number(row.lat).toFixed(3)}`;
    if (!seenPositions.has(gridKey)) {
      uniqueSignals.push(row);
      seenPositions.add(gridKey);
    }
  }

  return uniqueSignals.map((row) => ({
    ...extractSignalState(row.data),
    intersection_id: row.intersection_id,
    location: {
      lat: Number(row.lat),
      lng: Number(row.lng),
    },
  }));
}

async function upsertIntersectionData({ intersection_id, name, location, signals }) {
  const sql = `
    INSERT INTO signals (intersection_id, name, location, data, last_updated)
    VALUES (
      $1, $2,
      ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography,
      $5::jsonb,
      NOW()
    )
    ON CONFLICT (intersection_id)
    DO UPDATE SET
      name = EXCLUDED.name,
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
    await db.query(sql, [intersection_id, name, location.lng, location.lat, payload]);
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

/**
 * Finds signals along a route within 30m, ordered by position.
 * @param {string} routeWkt
 * @returns {Promise<Array>}
 */
async function getSignalsAlongRoute(routeWkt) {
  const sql = `
    WITH route AS (
      SELECT ST_GeomFromText($1, 4326) AS geom
    )
    SELECT
      s.intersection_id AS id,
      ST_Y(s.location::geometry) AS lat,
      ST_X(s.location::geometry) AS lng,
      s.data AS data,
      ST_LineLocatePoint(route.geom, s.location::geometry) AS position,
      ST_Distance(s.location, route.geom::geography) AS distance
    FROM signals s, route
    WHERE ST_DWithin(s.location, route.geom::geography, 100)
    ORDER BY position ASC;
  `;

  try {
    const { rows } = await db.query(sql, [routeWkt]);
    
    // 🤝 Distance-Based Consolidation (60m)
    const uniqueSignals = [];
    for (const row of rows) {
      let isDuplicate = false;
      for (const unique of uniqueSignals) {
        // Simple Euclidean distance for performance (approximate in small areas)
        const dLat = Number(row.lat) - unique.lat;
        const dLng = Number(row.lng) - unique.lng;
        const distApprox = Math.sqrt(dLat * dLat + dLng * dLng) * 111320; // Deg to Meters
        
        if (distApprox < 60) {
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        uniqueSignals.push(row);
      }
    }
    
    logger.debug(`PostGIS query done: getSignalsAlongRoute (original=${rows.length}, unique=${uniqueSignals.length})`);
    return uniqueSignals;
  } catch (error) {
    logger.error(`PostGIS error in getSignalsAlongRoute: ${error.message}`);
    return [];
  }
}

async function updateNearestSignalByQueue({ lat, lon, queueLength, state, greenTime }) {
  const payload = JSON.stringify({
    state,
    timer: greenTime,
    queue_length: queueLength,
    last_updated: new Date().toISOString(),
  });

  const sql = `
    WITH point AS (
      SELECT ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography AS geom
    ),
    within_radius AS (
      SELECT s.intersection_id
      FROM signals s
      CROSS JOIN point p
      WHERE ST_DWithin(s.location, p.geom, 100)
      ORDER BY ST_Distance(s.location, p.geom) ASC
      LIMIT 1
    ),
    fallback_nearest AS (
      SELECT s.intersection_id
      FROM signals s
      CROSS JOIN point p
      ORDER BY ST_Distance(s.location, p.geom) ASC
      LIMIT 1
    ),
    nearest AS (
      SELECT intersection_id FROM within_radius
      UNION ALL
      SELECT intersection_id FROM fallback_nearest
      WHERE NOT EXISTS (SELECT 1 FROM within_radius)
      LIMIT 1
    )
    UPDATE signals s
    SET
      data = $3::jsonb,
      last_updated = NOW()
    FROM nearest
    WHERE s.intersection_id = nearest.intersection_id
    RETURNING s.intersection_id, s.data;
  `;

  try {
    const { rows } = await db.query(sql, [lon, lat, payload]);
    return rows[0] || null;
  } catch (error) {
    throw new AppError(`Database failure while updating nearest signal: ${error.message}`, 500);
  }
}

async function getAllSignals() {
  const sql = `
    SELECT
      intersection_id AS id,
      name,
      ST_Y(location::geometry) AS lat,
      ST_X(location::geometry) AS lng,
      data
    FROM signals;
  `;
  try {
    const { rows } = await db.query(sql);
    return rows;
  } catch (error) {
    throw new AppError(`Database failure while fetching all signals: ${error.message}`, 500);
  }
}

module.exports = {
  getSignalsNearRoute,
  upsertIntersectionData,
  getSignalsAlongRoute,
  updateNearestSignalByQueue,
  getAllSignals,
};
