'use strict';

/**
 * osm_import_pune.js — Imports real traffic signals for Pune from OpenStreetMap Overpass API.
 * Uses multiple mirrors for resilience. Focused on Greater Pune bounding box.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Overpass API mirrors (fallback chain)
const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

// Tight bounding box: Greater Pune only (Hinjewadi to Hadapsar)
const SOUTH = 18.42;
const WEST  = 73.72;
const NORTH = 18.65;
const EAST  = 73.96;

async function queryOverpass(query) {
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      console.log(`  📡 Trying: ${mirror}`);
      const response = await axios.post(mirror, `data=${encodeURIComponent(query)}`, {
        timeout: 120000, // 2 min timeout
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      if (response.data?.elements) {
        return response.data.elements;
      }
    } catch (err) {
      console.log(`  ⚠️  Mirror failed: ${err.message}`);
    }
  }
  return null;
}

async function importPuneSignals() {
  console.log('🛰️  Pune OSM Signal Import (Overpass API)');
  console.log(`🌍  Bounding Box: [${SOUTH}, ${WEST}, ${NORTH}, ${EAST}]`);
  console.log(`📡  Mirrors available: ${OVERPASS_MIRRORS.length}\n`);

  const query = `
    [out:json][timeout:90];
    (
      node["highway"="traffic_signals"](${SOUTH},${WEST},${NORTH},${EAST});
    );
    out body;
  `;

  const elements = await queryOverpass(query);

  if (!elements) {
    console.error('❌  All Overpass mirrors failed. Try again later.');
    await pool.end();
    return;
  }

  console.log(`\n✅  Found ${elements.length} traffic signals in Pune via Overpass API.\n`);

  if (elements.length === 0) {
    console.log('ℹ️  No signals in this bounding box.');
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let count = 0;
    for (const node of elements) {
      const intersectionId = `OSM_${node.id}`;
      const lat = node.lat;
      const lng = node.lon;
      const name = node.tags?.name || `OSM Signal ${node.id}`;
      const timer = 20 + Math.floor(Math.random() * 40);
      const state = Math.random() > 0.5 ? 'GREEN' : 'RED';

      const data = JSON.stringify({
        name,
        source: 'OpenStreetMap',
        osm_id: node.id,
        state,
        timer,
        remaining_time: timer,
        queue_length: Math.floor(Math.random() * 12),
        signals: {
          north: { state, timer, remaining_time: timer, queue_length: Math.floor(Math.random() * 10) },
          south: { state: state === 'GREEN' ? 'RED' : 'GREEN', timer, remaining_time: timer, queue_length: Math.floor(Math.random() * 10) }
        }
      });

      await client.query(`
        INSERT INTO signals (intersection_id, location, data, last_updated)
        VALUES (
          $1,
          ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
          $4::jsonb,
          NOW()
        )
        ON CONFLICT (intersection_id) DO UPDATE SET
          location = EXCLUDED.location,
          data = EXCLUDED.data,
          last_updated = NOW();
      `, [intersectionId, lng, lat, data]);

      count++;
      if (count % 100 === 0) {
        process.stdout.write(`\r  💾 Imported ${count}/${elements.length}...`);
      }
    }

    await client.query('COMMIT');
    console.log(`\n\n🎉  Successfully imported ${count} OSM signals into Pune!`);

    const verify = await client.query('SELECT COUNT(*) FROM signals;');
    console.log(`📊  Total signals in database: ${verify.rows[0].count}`);

    // Show how many are near the Hinjewadi-Viman Nagar route corridor
    const corridor = await client.query(`
      SELECT COUNT(*) FROM signals
      WHERE ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint(73.82, 18.56), 4326)::geography,
        15000
      );
    `);
    console.log(`🛣️  Signals within 15km of Pune center: ${corridor.rows[0].count}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  DB Insert Failed:', err.message);
  } finally {
    client.release();
    await pool.end();
    console.log('🔌  Done.');
  }
}

importPuneSignals();
