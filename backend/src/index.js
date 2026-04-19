/**
 * Curalink Backend Server
 * Entry point - Initializes app, connects to DB, and starts the server
 */

import config from './config/env.js';
import { connectDB } from './config/database.js';
import { setupApp, setupRoutes } from './config/server.js';
import logger from './utils/logger.js';

// Import route handlers
import chatRoutes from './routes/chat.js';
import searchRoutes from './routes/search.js';
import userRoutes from './routes/user.js';

async function startServer() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Initialize Express app
    const app = setupApp();

    // 3. Setup routes
    const routes = {
      '/chat': chatRoutes,
      '/search': searchRoutes,
      '/user': userRoutes,
    };
    setupRoutes(app, routes);

    // 4. Start listening
    const server = app.listen(config.port, () => {
      logger.info(
        `🚀 Curalink server running on http://localhost:${config.port}`,
      );
      logger.info(`Environment: ${config.nodeEnv}`);
    });

    // 5. Graceful shutdown
    const gracefulShutdown = async () => {
      logger.info('Shutting down gracefully...');
      server.close(async () => {
        logger.info('Server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Force shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
