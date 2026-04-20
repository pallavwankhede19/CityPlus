'use strict';
const db = require('../src/db');

async function fixSchema() {
  console.log('🐘 Starting Database Schema Renovation...');
  try {
    // 1. Add 'name' column if missing
    await db.query('ALTER TABLE signals ADD COLUMN IF NOT EXISTS name TEXT;');
    console.log('✅ Column "name" ensured.');

    // 2. Add 'intersection_id' unique constraint if somehow missing (safety first)
    // Already handled by existing migrations but good to check.

    process.exit(0);
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
    process.exit(1);
  }
}

fixSchema();
