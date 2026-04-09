'use strict';

const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let pool;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required. Add it to backend/.env');
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL_MAX) || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    pool.on('error', (error) => {
      // eslint-disable-next-line no-console
      console.error('Unexpected PostgreSQL pool error:', error);
    });
  }
  return pool;
}

module.exports = {
  query: (text, params) => getPool().query(text, params),
  getClient: () => getPool().connect(),
  get pool() {
    return getPool();
  },
};
