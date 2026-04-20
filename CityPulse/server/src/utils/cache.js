'use strict';

/**
 * cache.js — In-memory route cache with optional Redis upgrade path.
 *
 * By default uses a simple Map with TTL.
 * Set REDIS_ENABLED=true in .env to use Redis instead.
 *
 * Why cache routes?
 *   Google Directions API has per-request cost + latency (~200–500 ms).
 *   Caching for 15–30 s means back-to-back identical route requests (common
 *   on mobile when the user re-opens the app) hit the cache instead.
 */

const logger = require('./logger');

const TTL_MS       = parseInt(process.env.ROUTE_CACHE_TTL || '25', 10) * 1000;
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

// ── In-memory backend ─────────────────────────────────────────────────────────
const _store = new Map();                // key → { value, expiresAt }

function _memGet(key) {
  const entry = _store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _store.delete(key); return null; }
  return entry.value;
}

function _memSet(key, value) {
  _store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

// ── Redis backend (optional) ──────────────────────────────────────────────────
let _redis = null;

async function _initRedis() {
  if (!REDIS_ENABLED) return;
  try {
    const { createClient } = require('redis');
    _redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    _redis.on('error', err => logger.warn(`[CACHE] Redis error: ${err.message}`));
    await _redis.connect();
    logger.info('[CACHE] Redis connected. Route caching via Redis.');
  } catch (err) {
    logger.warn(`[CACHE] Redis unavailable (${err.message}). Falling back to in-memory cache.`);
    _redis = null;
  }
}

// Kick-off Redis connection (non-blocking)
_initRedis();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build a deterministic cache key from origin/destination strings.
 * Lower-cased + trimmed so "Pune Station" and "pune station" hit the same bucket.
 */
function buildKey(origin, destination) {
  return `route:${origin.trim().toLowerCase()}::${destination.trim().toLowerCase()}`;
}

async function get(key) {
  if (_redis && _redis.isOpen) {
    const raw = await _redis.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  return _memGet(key);
}

async function set(key, value) {
  if (_redis && _redis.isOpen) {
    await _redis.setEx(key, Math.ceil(TTL_MS / 1000), JSON.stringify(value));
    return;
  }
  _memSet(key, value);
}

module.exports = { buildKey, get, set };
