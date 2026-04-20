'use strict';

require('dotenv').config();

const fs = require('fs/promises');
const path = require('path');
const db = require('./index');

async function migrate() {
  const client = await db.getClient();

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = await fs.readFile(schemaPath, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    // eslint-disable-next-line no-console
    console.log('Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    // eslint-disable-next-line no-console
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.pool.end();
  }
}

migrate();
