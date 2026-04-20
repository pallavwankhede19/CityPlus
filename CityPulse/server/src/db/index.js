'use strict';

const path = require('path');
const { Pool } = require('pg');
const logger = require('../utils/logger');

require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: true });

let pool;
let hasLoggedPoolCreation = false;
let hasLoggedFirstQuery = false;

function onPoolError(error) {
  logger.error(`Unexpected PostgreSQL pool error: ${error.message}`);
}

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      logger.error('DATABASE_URL is required. Add it to backend/.env');
      return null;
    }
    try {
      if (!hasLoggedPoolCreation) {
        logger.debug('Creating PostgreSQL Pool');
        hasLoggedPoolCreation = true;
      }
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: Number(process.env.DB_POOL_MAX) || 50,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        ssl: { rejectUnauthorized: false },
      });
      pool.on('error', onPoolError);
    } catch (error) {
      logger.error(`Failed to initialize PostgreSQL pool: ${error.message}`);
      pool = null;
    }
  }
  return pool;
}

module.exports = {
  query: async (text, params) => {
    const instance = getPool();
    if (!instance) {
      throw new Error('Database pool unavailable');
    }
    try {
      if (!hasLoggedFirstQuery) {
        logger.debug('Executing first database query');
        hasLoggedFirstQuery = true;
      }
      return await instance.query(text, params);
    } catch (error) {
      logger.error(`Database query error: ${error.message}`);
      throw error;
    }
  },
  getClient: async () => {
    const instance = getPool();
    if (!instance) {
      throw new Error('Database pool unavailable');
    }
    try {
      return await instance.connect();
    } catch (error) {
      logger.error(`Database connection error: ${error.message}`);
      throw error;
    }
  },
  get pool() {
    return getPool();
  },
};
