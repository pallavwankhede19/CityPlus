'use strict';

require('dotenv').config({
  path: require('path').join(__dirname, '..', '.env'),
  override: true
});

const http = require('http');
const { Server } = require('socket.io');
const db = require('./src/db');
const app = require('./src/app');
const { setIo } = require('./src/socket');
const SignalPulseEngine = require('./src/services/signalService');

const PORT = Number(process.env.PORT) || 3000;

async function bootstrap() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('Missing required env var: DATABASE_URL');
    }
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error('Missing required env var: GOOGLE_MAPS_API_KEY');
    }

    // 1. Verify Database
    await db.query('SELECT 1;');
    await db.query('SELECT PostGIS_Version();');
    console.log('Database connection and PostGIS verified.');

    // 2. Setup Server
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
      },
    });

    setIo(io);
    const pulseEngine = new SignalPulseEngine(io);
    pulseEngine.start();

    // 3. Listen
    const listener = server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server listening on port ${PORT} (Regional Mode Active)`);
    });

    listener.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`ERROR: Port ${PORT} is already in use by another process.`);
      } else {
        console.error('SERVER ERROR:', err);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('BOOTSTRAP CRASH:', error.message || error);
    process.exit(1);
  }
}

bootstrap();
