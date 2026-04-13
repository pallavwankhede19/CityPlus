'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');
const db = require('../db');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const OVERPASS_QUERY = `
[out:json][timeout:90];
area["name"="Pune"]["boundary"="administrative"]->.searchArea;
(
  node["highway"="traffic_signals"](area.searchArea);
);
out body;
`;

function toIntersectionId(element) {
  return `OSM_NODE_${element.id}`;
}

async function fetchPuneSignals() {
  const response = await axios.post(
    OVERPASS_URL,
    OVERPASS_QUERY,
    {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 60000,
    }
  );

  const elements = Array.isArray(response.data?.elements) ? response.data.elements : [];
  return elements.filter(
    (el) => el && el.type === 'node' && Number.isFinite(Number(el.lat)) && Number.isFinite(Number(el.lon))
  );
}

async function upsertSignals(elements) {
  if (!elements.length) {
    return { inserted: 0, updated: 0, total: 0 };
  }

  const sql = `
    INSERT INTO signals (intersection_id, location, data, last_updated)
    VALUES (
      $1,
      ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
      '{}'::jsonb,
      NOW()
    )
    ON CONFLICT (intersection_id)
    DO UPDATE SET
      location = EXCLUDED.location,
      data = COALESCE(signals.data, '{}'::jsonb),
      last_updated = NOW();
  `;

  let inserted = 0;
  let updated = 0;

  for (const el of elements) {
    const intersectionId = toIntersectionId(el);
    const lon = Number(el.lon);
    const lat = Number(el.lat);

    const result = await db.query(sql, [intersectionId, lon, lat]);
    if (result.rowCount > 0) {
      if (result.command === 'INSERT') {
        inserted += 1;
      } else {
        updated += 1;
      }
    }
  }

  return { inserted, updated, total: elements.length };
}

async function run() {
  try {
    const signals = await fetchPuneSignals();
    const summary = await upsertSignals(signals);
    // eslint-disable-next-line no-console
    console.log(`Done. Total: ${summary.total}, inserted: ${summary.inserted}, updated: ${summary.updated}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Import failed: ${error.message}`);
    process.exitCode = 1;
  }
}

run();
