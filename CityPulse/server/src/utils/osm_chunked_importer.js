'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const CITIES = [
  { name: 'Aurangabad', bbox: '19.80, 75.20, 20.00, 75.50' },
  { name: 'Mumbai', bbox: '18.85, 72.75, 19.30, 73.05' },
  { name: 'Pune', bbox: '18.40, 73.70, 18.65, 74.00' },
  { name: 'Nagpur', bbox: '21.00, 79.00, 21.25, 79.25' },
  { name: 'Nashik', bbox: '19.90, 73.70, 20.10, 73.90' }
];

async function runChunkedImport() {
  console.log('🛰️ Starting Chunked State-Wide Signal Import...');
  
  for (const city of CITIES) {
    console.log(`\n🏙️  Scanning City: ${city.name} [${city.bbox}]...`);
    
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const query = `
      [out:json][timeout:90];
      (
        node["highway"="traffic_signals"](${city.bbox});
        node["highway"="crossing"]["crossing"="traffic_signals"](${city.bbox});
        node["traffic_signals"="signal"](${city.bbox});
        node["highway"="traffic_light"](${city.bbox});
      );
      out body;
    `;

    try {
      const response = await axios.post(overpassUrl, `data=${encodeURIComponent(query)}`);
      const elements = response.data?.elements || [];
      console.log(`✅ Found ${elements.length} signals in ${city.name}.`);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const node of elements) {
          const intersectionId = `OSM_CH_${node.id}`;
          const data = JSON.stringify({
            name: node.tags?.name || `Junction ${city.name} ${node.id}`,
            city: city.name,
            osm_id: node.id,
            signals: { north: { state: 'GREEN', timer: 30 } }
          });

          await client.query(`
            INSERT INTO signals (intersection_id, location, data, last_updated)
            VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4::jsonb, NOW())
            ON CONFLICT (intersection_id) DO UPDATE SET last_updated = NOW();
          `, [intersectionId, node.lon, node.lat, data]);
        }
        await client.query('COMMIT');
        console.log(`🎉 Injected ${elements.length} signals for ${city.name}.`);
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(`❌ Failed city ${city.name}:`, err.message);
    }
  }
  
  console.log('\n🌟 Chunked State-Wide Import Complete!');
  await pool.end();
}

runChunkedImport();
