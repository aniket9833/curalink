/**
 * Error Handling Utilities
 * Custom error classes and error handling middleware
 */

import logger from './logger.js';

/**
 * Custom Application Error
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      statusCode: this.statusCode,
      ...(this.details && { details: this.details }),
      timestamp: this.timestamp,
    };
  }
}

/**
 * Validation Error
 */
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized Error
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Database Error
 */
export class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, originalError?.message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * External Service Error
 */
export class ExternalServiceError extends AppError {
  constructor(serviceName, message, statusCode = 503) {
    super(`${serviceName} error: ${message}`, statusCode);
    this.name = 'ExternalServiceError';
    this.serviceName = serviceName;
  }
}

/**
 * Express Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  logger.error('Error encountered:', {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
  });

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle MongoDB Validation Errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Handle MongoDB Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      error: `${field} already exists`,
      field,
    });
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Handle unhandled errors
  res.status(err.statusCode || 500).json({
    error: 'Internal Server Error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export default errorHandler;
