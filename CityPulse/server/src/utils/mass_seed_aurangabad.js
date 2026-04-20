'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const AURANGABAD_SIGNALS = [
  { id: 'AD_001', name: 'Kranti Chowk Main Circle', lat: 19.8732, lng: 75.3251 },
  { id: 'AD_002', name: 'Baba Petrol Pump Junction', lat: 19.8784, lng: 75.3186 },
  { id: 'AD_003', name: 'MGM Hospital Corner', lat: 19.8882, lng: 75.3408 },
  { id: 'AD_004', name: 'Cidco Bus Stand Traffic Light', lat: 19.8856, lng: 75.3524 },
  { id: 'AD_005', name: 'Seven Hills Flyover Intersection', lat: 19.8791, lng: 75.3552 },
  { id: 'AD_006', name: 'Aakashwani Signal', lat: 19.8830, lng: 75.3450 },
  { id: 'AD_007', name: 'Prozone Mall / Cidco N-3', lat: 19.8942, lng: 75.3684 },
  { id: 'AD_008', name: 'High Court Junction', lat: 19.8865, lng: 75.3342 },
  { id: 'AD_009', name: 'Cannaught Place Entry', lat: 19.8910, lng: 75.3620 },
  { id: 'AD_010', name: 'Nirala Bazar Signal', lat: 19.8812, lng: 75.3298 },
  { id: 'AD_011', name: 'Paithan Gate Signal', lat: 19.8765, lng: 75.3210 },
  { id: 'AD_012', name: 'Railway Station Road', lat: 19.8605, lng: 75.3204 },
  { id: 'AD_013', name: 'Beed Bypass (Deolali Chowk)', lat: 19.8450, lng: 75.3580 },
  { id: 'AD_014', name: 'Mondha Naka Signal', lat: 19.8805, lng: 75.3370 },
  { id: 'AD_015', name: 'Garkheda / Gajanan Temple Road', lat: 19.8650, lng: 75.3520 },
  { id: 'AD_016', name: 'Zalta Phata (Outer Aurangabad)', lat: 19.8400, lng: 75.4050 },
  { id: 'AD_017', name: 'Dhoot Hospital Junction', lat: 19.8980, lng: 75.3850 },
  { id: 'AD_018', name: 'Harsul T-Point Signal', lat: 19.9250, lng: 75.3420 },
  { id: 'AD_019', name: 'City Chowk Signal', lat: 19.8850, lng: 75.3180 },
  { id: 'AD_020', name: 'Aurangapura Signal', lat: 19.8800, lng: 75.3220 }
];

async function seed() {
  console.log('🛰️  Deploying Aurangabad Total Coverage Signal Layer...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let count = 0;
    for (const s of AURANGABAD_SIGNALS) {
      const data = JSON.stringify({
        name: s.name,
        city: 'Aurangabad',
        signals: { north: { state: 'GREEN', timer: 30 } }
      });
      await client.query(`
        INSERT INTO signals (intersection_id, location, data, last_updated)
        VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4::jsonb, NOW())
        ON CONFLICT (intersection_id) DO UPDATE SET data = EXCLUDED.data, last_updated = NOW();
      `, [s.id, s.lng, s.lat, data]);
      count++;
    }
    await client.query('COMMIT');
    console.log(`🎉 Successfully deployed ${count} High-Density signals!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Deployment failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
