const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const logger = require('../utils/logger');

/**
 * 🛰️ SIGNAL PULSE ENGINE
 * This service simulates live traffic signal hardware by cycling 
 * through RED/GREEN phases and broadcasting counts to connected clients.
 */
class SignalPulseEngine {
  constructor(socketIO) {
    this.io = socketIO;
    this.signalStates = {}; // Live cache
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('[CITYPULSE] Signal Pulse Engine Started');
    
    // 🚀 The AI Agent is now the "Master Heartbeat".
    // We no longer need the backend to tick manually.
    // setInterval(() => this._tick(), 1000);
  }

  async _tick() {
    try {
      // 1. Fetch current signal data from DB
      const result = await pool.query('SELECT intersection_id as id, name, data FROM signals');
      const signals = result.rows;

      const regionalUpdates = [];

      for (let s of signals) {
        let data = s.data || { signals: { north: { state: 'RED', remaining_time: 30 } } };
        
        // 🚀 PASS-THROUGH MODE: The Backend no longer "Simulates" the clock. 
        // It simply relays exactly what the AI Agent (the Master Brain) has calculated.
        
        regionalUpdates.push({
          intersection_id: s.id,
          intersection_name: s.name,
          signals: data.signals || data
        });
      }

      // 🚀 BULK BROADCAST: Send all 100 updates in ONE event
      this.io.emit('regional_update', { updates: regionalUpdates });
    } catch (error) {
     // logger.error(`[CITYPULSE] Pulse Error: ${error.message}`);
    }
  }
}

module.exports = SignalPulseEngine;
