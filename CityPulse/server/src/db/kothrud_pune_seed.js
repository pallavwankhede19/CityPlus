'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const KOTHRUD_SIGNALS = [
  { id: 'PUN_KOT_001', name: 'MIT World Peace University', lat: 18.5173, lng: 73.8150 },
  { id: 'PUN_KOT_002', name: 'City Pride Kothrud', lat: 18.5034, lng: 73.8211 },
  { id: 'PUN_KOT_003', name: 'Karve Nagar Chowk', lat: 18.4912, lng: 73.8189 },
  { id: 'PUN_KOT_004', name: 'Chandani Chowk', lat: 18.5058, lng: 73.7852 },
  { id: 'PUN_KOT_005', name: 'Vanaz Corner', lat: 18.5065, lng: 73.8012 },
  { id: 'PUN_KOT_006', name: 'Paud Road Junction', lat: 18.5125, lng: 73.8145 },
  { id: 'PUN_KOT_007', name: 'Mayur Colony Signal', lat: 18.5032, lng: 73.8130 },
  { id: 'PUN_KOT_008', name: 'Ideal Colony Signal', lat: 18.5110, lng: 73.8205 },
  { id: 'PUN_WAK_001', name: 'Wakad Bridge', lat: 18.5954, lng: 73.7654 },
  { id: 'PUN_HIN_001', name: 'Hinjawadi Phase 1', lat: 18.5912, lng: 73.7389 }
];

async function seed() {
  const client = await pool.connect();
  console.log('🚀 [PUNE GRID] Injecting Traffic Intelligence for Kothrud/Wakad Corridor...\n');

  try {
    await client.query('BEGIN');
    for (const s of KOTHRUD_SIGNALS) {
      const data = JSON.stringify({
        name: s.name,
        city: 'Pune',
        signals: {
          north: { state: 'GREEN', remaining_time: 45 },
          south: { state: 'RED', remaining_time: 45 }
        }
      });

      await client.query(`
        INSERT INTO signals (intersection_id, location, data, last_updated)
        VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4::jsonb, NOW())
        ON CONFLICT (intersection_id) DO UPDATE SET last_updated = NOW();
      `, [s.id, s.lng, s.lat, data]);
      console.log(`  🟢 [PUNE] ${s.name} activated.`);
    }
    await client.query('COMMIT');
    console.log(`\n✅ CityPulse Pune Grid is LIVE with ${KOTHRUD_SIGNALS.length} junctions.\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Pune Seed Failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
