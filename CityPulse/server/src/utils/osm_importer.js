'use strict';

/**
 * osm_importer.js — Imports real-world traffic signals for Maharashtra from OpenStreetMap.
 * Uses the Overpass API to fetch highway=traffic_signals.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Bounding box for Maharashtra (Approximate)
const MH_BBOX = '15.60,72.60,22.10,80.90';

async function importSignals() {
  console.log('🛰️  Starting Maharashtra Signal Intelligence Import...');
  console.log(`🌍  Target Region: Maharashtra (BBox: ${MH_BBOX})`);

  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  const query = `
    [out:json][timeout:180];
    area["name"="Maharashtra"]->.searchArea;
    (
      node["highway"="traffic_signals"](area.searchArea);
      node["highway"="crossing"]["crossing"="traffic_signals"](area.searchArea);
      node["traffic_signals"="signal"](area.searchArea);
    );
    out body;
  `;

  try {
    console.log('📡  Querying OpenStreetMap (Overpass API)... This may take a minute.');
    const response = await axios.post(overpassUrl, `data=${encodeURIComponent(query)}`);
    
    const elements = response.data?.elements || [];
    console.log(`✅  Found ${elements.length} Traffic Signals in Maharashtra.`);

    if (elements.length === 0) {
      console.log('ℹ️  No signals found in this region.');
      return;
    }

    console.log('💾  Injecting signals into PostGIS database...');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      
      let count = 0;
      for (const node of elements) {
        const intersectionId = `OSM_${node.id}`;
        const lat = node.lat;
        const lng = node.lon;
        const data = JSON.stringify({
          name: node.tags?.name || `Intersection ${node.id}`,
          source: 'OpenStreetMap',
          osm_id: node.id,
          signals: {
            north: { state: 'GREEN', timer: 30, queue_length: 5 },
            south: { state: 'RED', timer: 30, queue_length: 8 }
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
        if (count % 100 === 0) process.stdout.write('.');
      }

      await client.query('COMMIT');
      console.log(`\n\n🎉  Successfully imported ${count} signals into Maharashtra!`);
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌  Import Failed:', error.message);
    if (error.response) console.error('Response Data:', error.response.data);
  } finally {
    await pool.end();
  }
}

importSignals();
