'use strict';

/**
 * seed.js — Seeds realistic Pune traffic signal data into the database.
 *
 * Run after migrate.js:
 *   node src/db/seed.js
 *
 * This lets you test WITHOUT real AI agents running.
 * Simulates 10 Pune intersections with realistic signal states.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'citypulse',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

// ── Seed data — matches PUNE_INTERSECTIONS in agent.py ───────────────────────
const SEED_SIGNALS = [
  {
    id: 'INT_001', name: 'FC Road & Bhandarkar Rd',
    lat: 18.5204, lng: 73.8567,
    phase: 'north', cycle: 120,
    signals: {
      north: { state: 'GREEN',  remaining_time: 22, queue_length: 8,  density: 'Medium' },
      south: { state: 'RED',    remaining_time: 58, queue_length: 12, density: 'Medium' },
      east:  { state: 'RED',    remaining_time: 81, queue_length: 3,  density: 'Low'    },
      west:  { state: 'RED',    remaining_time: 98, queue_length: 6,  density: 'Medium' },
    },
  },
  {
    id: 'INT_002', name: 'Shivajinagar Signal',
    lat: 18.5308, lng: 73.8474,
    phase: 'south', cycle: 100,
    signals: {
      north: { state: 'RED',    remaining_time: 35, queue_length: 5,  density: 'Low'    },
      south: { state: 'GREEN',  remaining_time: 18, queue_length: 14, density: 'Medium' },
      east:  { state: 'RED',    remaining_time: 57, queue_length: 20, density: 'High'   },
      west:  { state: 'RED',    remaining_time: 74, queue_length: 9,  density: 'Medium' },
    },
  },
  {
    id: 'INT_003', name: 'Karve Road & Paud Road',
    lat: 18.5088, lng: 73.8238,
    phase: 'east', cycle: 90,
    signals: {
      north: { state: 'RED',    remaining_time: 40, queue_length: 7,  density: 'Medium' },
      south: { state: 'RED',    remaining_time: 62, queue_length: 2,  density: 'Low'    },
      east:  { state: 'GREEN',  remaining_time: 15, queue_length: 18, density: 'High'   },
      west:  { state: 'RED',    remaining_time: 79, queue_length: 11, density: 'Medium' },
    },
  },
  {
    id: 'INT_004', name: 'Pune Station Junction',
    lat: 18.5287, lng: 73.8741,
    phase: 'north', cycle: 130,
    signals: {
      north: { state: 'GREEN',  remaining_time: 30, queue_length: 25, density: 'High'   },
      south: { state: 'RED',    remaining_time: 65, queue_length: 22, density: 'High'   },
      east:  { state: 'RED',    remaining_time: 90, queue_length: 17, density: 'High'   },
      west:  { state: 'RED',    remaining_time: 110,queue_length: 19, density: 'High'   },
    },
  },
  {
    id: 'INT_005', name: 'Swargate Bus Stand',
    lat: 18.5018, lng: 73.8636,
    phase: 'west', cycle: 110,
    signals: {
      north: { state: 'RED',    remaining_time: 20, queue_length: 4,  density: 'Low'    },
      south: { state: 'RED',    remaining_time: 45, queue_length: 6,  density: 'Medium' },
      east:  { state: 'RED',    remaining_time: 68, queue_length: 8,  density: 'Medium' },
      west:  { state: 'GREEN',  remaining_time: 12, queue_length: 15, density: 'Medium' },
    },
  },
  {
    id: 'INT_006', name: 'Viman Nagar Signal',
    lat: 18.5679, lng: 73.9143,
    phase: 'north', cycle: 80,
    signals: {
      north: { state: 'GREEN',  remaining_time: 20, queue_length: 3,  density: 'Low'    },
      south: { state: 'RED',    remaining_time: 43, queue_length: 5,  density: 'Low'    },
      east:  { state: 'RED',    remaining_time: 58, queue_length: 2,  density: 'Low'    },
      west:  { state: 'RED',    remaining_time: 70, queue_length: 4,  density: 'Low'    },
    },
  },
  {
    id: 'INT_007', name: 'Kothrud Depot Signal',
    lat: 18.5080, lng: 73.8065,
    phase: 'south', cycle: 95,
    signals: {
      north: { state: 'RED',    remaining_time: 28, queue_length: 9,  density: 'Medium' },
      south: { state: 'GREEN',  remaining_time: 19, queue_length: 13, density: 'Medium' },
      east:  { state: 'RED',    remaining_time: 51, queue_length: 6,  density: 'Medium' },
      west:  { state: 'RED',    remaining_time: 72, queue_length: 3,  density: 'Low'    },
    },
  },
  {
    id: 'INT_008', name: 'Hadapsar Industrial Estate',
    lat: 18.5019, lng: 73.9346,
    phase: 'east', cycle: 105,
    signals: {
      north: { state: 'RED',    remaining_time: 33, queue_length: 11, density: 'Medium' },
      south: { state: 'RED',    remaining_time: 55, queue_length: 8,  density: 'Medium' },
      east:  { state: 'GREEN',  remaining_time: 17, queue_length: 16, density: 'High'   },
      west:  { state: 'RED',    remaining_time: 76, queue_length: 7,  density: 'Medium' },
    },
  },
  {
    id: 'INT_009', name: 'Wakad-Hinjewadi Junction',
    lat: 18.5930, lng: 73.7559,
    phase: 'north', cycle: 115,
    signals: {
      north: { state: 'GREEN',  remaining_time: 25, queue_length: 20, density: 'High'   },
      south: { state: 'RED',    remaining_time: 60, queue_length: 18, density: 'High'   },
      east:  { state: 'RED',    remaining_time: 85, queue_length: 12, density: 'Medium' },
      west:  { state: 'RED',    remaining_time: 103,queue_length: 15, density: 'Medium' },
    },
  },
  {
    id: 'INT_010', name: 'Deccan Gymkhana Signal',
    lat: 18.5168, lng: 73.8462,
    phase: 'west', cycle: 88,
    signals: {
      north: { state: 'RED',    remaining_time: 22, queue_length: 6,  density: 'Medium' },
      south: { state: 'RED',    remaining_time: 44, queue_length: 4,  density: 'Low'    },
      east:  { state: 'RED',    remaining_time: 61, queue_length: 7,  density: 'Medium' },
      west:  { state: 'GREEN',  remaining_time: 14, queue_length: 10, density: 'Medium' },
    },
  },
];

async function seed() {
  const client = await pool.connect();
  console.log('✔  Connected to PostgreSQL.\n');
  console.log('  Seeding 10 Pune intersection signals...\n');

  try {
    await client.query('BEGIN');

    for (const s of SEED_SIGNALS) {
      const data = JSON.stringify({
        name:            s.name,
        signals:         s.signals,
        current_phase:   s.phase,
        cycle_time:      s.cycle,
      });

      await client.query(`
        INSERT INTO signals (intersection_id, location, data, last_updated)
        VALUES (
          $1,
          ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
          $4::jsonb,
          NOW()
        )
        ON CONFLICT (intersection_id) DO UPDATE
          SET location     = EXCLUDED.location,
              data         = EXCLUDED.data,
              last_updated = NOW();
      `, [s.id, s.lng, s.lat, data]);

      console.log(`  ✔  ${s.id} — ${s.name} (${s.lat}, ${s.lng})`);
    }

    await client.query('COMMIT');
    console.log(`\n✅  Seeded ${SEED_SIGNALS.length} signals successfully.\n`);
    console.log('  You can now test:\n');
    console.log('  POST http://localhost:5000/api/mobile/route');
    console.log('  Body: { "origin": "Pune Station", "destination": "Hinjewadi Phase 1" }\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌  Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
