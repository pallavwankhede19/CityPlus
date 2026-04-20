const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkDensity() {
  console.log('🛰️  Starting Deep Database Audit for Aurangabad...');
  try {
    // Aurangabad BBox: 19.82, 75.25 to 19.95, 75.40
    const res = await pool.query(`
      SELECT count(*) 
      FROM signals 
      WHERE ST_Within(location::geometry, ST_MakeEnvelope(75.20, 19.80, 75.50, 20.00, 4326))
    `);
    console.log(`[CITYPULSE] Total signals in Aurangabad Region: ${res.rows[0].count}`);
    
    // Check for "Cidco" specifically
    const cidcoRes = await pool.query(`
      SELECT count(*) FROM signals WHERE data->>'name' ILIKE '%Cidco%'
    `);
    console.log(`[CITYPULSE] Total "Cidco" signals found: ${cidcoRes.rows[0].count}`);

  } catch (err) {
    console.error('❌ Audit Failed:', err.message);
  } finally {
    await pool.end();
  }
}

checkDensity();
