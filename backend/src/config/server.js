/**
 * Server Configuration
 * Express app setup with middleware
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import config from './env.js';
import { RATE_LIMIT_CONFIG } from './constants.js';
import errorHandler from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

export function setupApp() {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );

  // Logging
  app.use(morgan('dev'));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_CONFIG.windowMs,
    max: RATE_LIMIT_CONFIG.max,
    message: {
      error: 'Too many requests, please try again later.',
    },
  });
  app.use('/api/', limiter);

  // Request logging middleware for debugging
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });

  return app;
}

export function setupRoutes(app, routes) {
  // Mount routes
  Object.entries(routes).forEach(([path, router]) => {
    app.use(`/api${path}`, router);
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

export function createServer() {
  const app = setupApp();
  return app;
}

export default {
  setupApp,
  setupRoutes,
  createServer,
};
