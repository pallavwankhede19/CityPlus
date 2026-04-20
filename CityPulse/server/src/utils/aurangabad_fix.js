'use strict';

/**
 * aurangabad_fix.js — Performs a hyper-dense import of traffic signals for Aurangabad.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function importAurangabad() {
  console.log('🛰️  Starting Hyper-Dense Aurangabad Signal Scan...');

  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  // Focused BBox for Chhatrapati Sambhajinagar (Aurangabad)
  const query = `
    [out:json][timeout:90];
    (
      node["highway"="traffic_signals"](19.80, 75.20, 20.05, 75.50);
      node["traffic_signals"="signal"](19.80, 75.20, 20.05, 75.50);
    );
    out body;
  `;

  try {
    console.log('📡  Executing High-Resolution Scan...');
    const response = await axios.post(overpassUrl, `data=${encodeURIComponent(query)}`);
    
    const elements = response.data?.elements || [];
    console.log(`✅  Found ${elements.length} High-Density Signals in Aurangabad.`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let count = 0;
      for (const node of elements) {
        const intersectionId = `OSM_AD_${node.id}`;
        const data = JSON.stringify({
          name: node.tags?.name || `Junction ${node.id}`,
          city: 'Aurangabad',
          osm_id: node.id,
          signals: {
            north: { state: 'RED', timer: 30, queue_length: 5 },
            south: { state: 'GREEN', timer: 30, queue_length: 5 }
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
            data = EXCLUDED.data,
            last_updated = NOW();
        `, [intersectionId, node.lon, node.lat, data]);
        count++;
      }
      await client.query('COMMIT');
      console.log(`🎉  Injected ${count} signals for Aurangabad!`);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌  Hyper-Scan Failed:', err.message);
  } finally {
    await pool.end();
  }
}

importAurangabad();
