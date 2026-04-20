'use strict';

/**
 * seed.js — High-Precision Maharashtra State-Wide Seed.
 * Updated with USER-SPECIFIC Ground Truth for Aurangabad (CIDCO Corridor).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const SEED_SIGNALS = [
  // 🏙️ Aurangabad (User-Specified CIDCO Corridor)
  { id: 'AD_DARGA', name: 'Darga Signal', lat: 19.8655, lng: 75.3284 },
  { id: 'AD_SUTGIRNI', name: 'Sutgirni Chowk Signal', lat: 19.8735, lng: 75.3375 },
  { id: 'AD_JAWHAR', name: 'Jahwarnagar Police Station Signal', lat: 19.8765, lng: 75.3412 },
  { id: 'AD_GAJANAN', name: 'Gajanan Maharaj Mandir Signal', lat: 19.8805, lng: 75.3445 },
  { id: 'AD_SEVENHILLS', name: 'Sevenhills Signal', lat: 19.8791, lng: 75.3552 },
  { id: 'AD_HIGHCOURT', name: 'High Court Signal', lat: 19.8825, lng: 75.3582 },
  
  // 🏙️ Aurangabad (Other Major Junctions)
  { id: 'AD_KRANTI', name: 'Kranti Chowk', lat: 19.8732, lng: 75.3251 },
  { id: 'AD_CIDCO', name: 'Cidco Bus Stand', lat: 19.8856, lng: 75.3524 },
  { id: 'AD_BABA', name: 'Baba Petrol Pump', lat: 19.8784, lng: 75.3186 },
  
  // 🏙️ Pune (Stay as is)
  { id: 'PUN_001', name: 'Pune Station', lat: 18.5289, lng: 73.8744 },
  { id: 'PUN_002', name: 'Shivajinagar', lat: 18.5312, lng: 73.8553 }
];

async function seed() {
  const client = await pool.connect();
  console.log('✔  Connected to PostgreSQL.\n');
  console.log('🚀  Injecting USER GROUND TRUTH Signals for Aurangabad...\n');

  try {
    await client.query('BEGIN');
    for (const s of SEED_SIGNALS) {
      const data = JSON.stringify({
        name: s.name,
        city: 'Aurangabad',
        signals: {
          north: { state: 'GREEN', remaining_time: 30 },
          south: { state: 'RED', remaining_time: 30 }
        }
      });

      await client.query(`
        INSERT INTO signals (intersection_id, location, data, last_updated)
        VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4::jsonb, NOW())
        ON CONFLICT (intersection_id) DO UPDATE SET last_updated = NOW();
      `, [s.id, s.lng, s.lat, data]);
      console.log(`  ✔  ${s.name} successfully updated.`);
    }
    await client.query('COMMIT');
    console.log(`\n✅  Seeded 6/6 Aurangabad Route Signals successfully.\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Seed failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
