'use strict';

const logger = require('./logger');

// ── Custom error classes ──────────────────────────────────────────────────────

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name       = 'AppError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) { super(message, 400); this.name = 'ValidationError'; }
}

class NotFoundError extends AppError {
  constructor(message) { super(message, 404); this.name = 'NotFoundError'; }
}

class ExternalServiceError extends AppError {
  constructor(service, detail) {
    super(`${service} service error: ${detail}`, 502);
    this.name = 'ExternalServiceError';
  }
}

// ── Express global error handler middleware ───────────────────────────────────

function errorHandler(err, _req, res, _next) {
  const status  = err.statusCode || 500;
  const message = err.message    || 'Internal server error';

  if (status >= 500) {
    logger.error(`[ERROR] ${err.name || 'Error'}: ${message}`);
    if (process.env.NODE_ENV !== 'production') {
      logger.error(err.stack);
    }
  } else {
    logger.warn(`[WARN] ${err.name || 'ClientError'}: ${message}`);
  }

  res.status(status).json({
    error:   message,
    ...(process.env.NODE_ENV !== 'production' && status >= 500 && { stack: err.stack }),
  });
}

module.exports = { AppError, ValidationError, NotFoundError, ExternalServiceError, errorHandler };
