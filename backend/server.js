'use strict';

require('dotenv').config({
  path: require('path').resolve(__dirname, '.env'),
});

const http = require('http');
const { Server } = require('socket.io');
const db = require('./src/db');
const app = require('./src/app');
const { setIo } = require('./src/socket');

const PORT = Number(process.env.PORT) || 3000;

async function bootstrap() {
  if (!process.env.DATABASE_URL) {
    // eslint-disable-next-line no-console
    console.error('Missing required env var: DATABASE_URL');
    process.exit(1);
  }
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    // eslint-disable-next-line no-console
    console.error('Missing required env var: GOOGLE_MAPS_API_KEY');
    process.exit(1);
  }

  try {
    await db.query('SELECT 1;');
    await db.query('SELECT PostGIS_Version();');
    // eslint-disable-next-line no-console
    console.log('Database connection and PostGIS verified.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to connect to PostgreSQL:', error.message);
    process.exit(1);
  }

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  setIo(io);

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${PORT}`);
  });
}

bootstrap();
