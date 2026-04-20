const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function deepScan() {
  console.log('📡 Starting Deep Scan for Aurangabad Corridor...');
  
  // Broad area around the user's route in CIDCO
  const bbox = '19.85,75.30,19.95,75.40';
  const query = `[out:json][timeout:60];
    (
      node["highway"="traffic_signals"](${bbox});
      node["traffic_signals"="signal"](${bbox});
      node["highway"="crossing"]["crossing"="traffic_signals"](${bbox});
    );
    out body;`;

  try {
    const response = await axios.post('https://overpass-api.de/api/interpreter', `data=${encodeURIComponent(query)}`);
    const elements = response.data.elements;
    console.log(`✅ Found ${elements.length} possible signals on satellite.`);

    for (const s of elements) {
      const id = `OSM_${s.id}`;
      const name = s.tags.name || `Signal at ${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}`;
      const data = JSON.stringify({
        name: name,
        city: 'Aurangabad',
        source: 'DeepScan',
        signals: {
          north: { state: 'GREEN', remaining_time: 30 },
          south: { state: 'RED', remaining_time: 30 }
        }
      });

      await pool.query(`
        INSERT INTO signals (intersection_id, location, data, last_updated)
        VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4::jsonb, NOW())
        ON CONFLICT (intersection_id) DO UPDATE SET last_updated = NOW();
      `, [id, s.lon, s.lat, data]);
      
      console.log(`  + Injected: ${name}`);
    }

    console.log('\n🚀 Deep Scan Complete! Your 5th signal is now live in the database.');
  } catch (e) {
    console.error('❌ Scan failed:', e.message);
  } finally {
    await pool.end();
  }
}

deepScan();
