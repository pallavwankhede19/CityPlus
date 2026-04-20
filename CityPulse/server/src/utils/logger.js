'use strict';

/**
 * logger.js — thin wrapper around console so log levels are consistent.
 * In production swap this for Winston or Pino with structured JSON output.
 */

const LEVELS = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };

const ENV_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const CURRENT   = LEVELS[ENV_LEVEL] ?? LEVELS.debug;

function stamp() {
  return new Date().toISOString();
}

function log(level, msg) {
  if ((LEVELS[level] ?? 99) > CURRENT) return;
  const line = `${stamp()} [${level.toUpperCase().padEnd(5)}] ${msg}`;
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

module.exports = {
  error: (msg) => log('error', msg),
  warn:  (msg) => log('warn',  msg),
  info:  (msg) => log('info',  msg),
  http:  (msg) => log('http',  msg),
  debug: (msg) => log('debug', msg),
};
