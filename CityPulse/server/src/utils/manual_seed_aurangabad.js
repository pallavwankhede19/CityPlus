'use strict';

/**
 * manual_seed_aurangabad.js
 * Injects high-resolution traffic signal coordinates for the Chhatrapati Sambhajinagar (Aurangabad) region.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const AD_SIGNALS = [
  { id: 'AD_001', name: 'Cidco Bus Stand Main Junction', lat: 19.8856, lng: 75.3524 },
  { id: 'AD_002', name: 'MGM Hospital Corner Signal', lat: 19.8882, lng: 75.3408 },
  { id: 'AD_003', name: 'Baba Petrol Pump Crossing', lat: 19.8784, lng: 75.3186 },
  { id: 'AD_004', name: 'Kranti Chowk Circle', lat: 19.8732, lng: 75.3251 },
  { id: 'AD_005', name: 'Seven Hills Flyover Signal', lat: 19.8791, lng: 75.3552 },
  { id: 'AD_006', name: 'Prozone Mall / Cidco Cannaught Signal', lat: 19.8942, lng: 75.3684 },
  { id: 'AD_007', name: 'Railway Station Road Junction', lat: 19.8605, lng: 75.3204 },
  { id: 'AD_008', name: 'Nirala Bazar Signal', lat: 19.8812, lng: 75.3298 },
  { id: 'AD_009', name: 'Aakashwani Signal', lat: 19.8830, lng: 75.3450 },
  { id: 'AD_010', name: 'Garkheda Signal', lat: 19.8650, lng: 75.3520 }
];

async function seed() {
  console.log('🛰️  Injecting Aurangabad High-Resolution Signals...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let count = 0;
    for (const s of AD_SIGNALS) {
      const data = JSON.stringify({
        name: s.name,
        city: 'Aurangabad',
        signals: {
          north: { state: 'GREEN', timer: 30, queue_length: 5 }
        }
      });

      await client.query(`
        INSERT INTO signals (intersection_id, location, data, last_updated)
        VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4::jsonb, NOW())
        ON CONFLICT (intersection_id) DO UPDATE SET
          location = EXCLUDED.location,
          data = EXCLUDED.data,
          last_updated = NOW();
      `, [s.id, s.lng, s.lat, data]);
      count++;
    }
    await client.query('COMMIT');
    console.log(`🎉 Successfully injected ${count} Aurangabad signals!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
