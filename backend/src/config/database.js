/**
 * Database Configuration
 * MongoDB connection setup
 */

import mongoose from 'mongoose';
import config from './env.js';
import logger from '../utils/logger.js';

export async function connectDB() {
  try {
    await mongoose.connect(config.mongodb.uri);
    logger.info('✅ MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error.message);
    // Exit process in production, log warning in development
    if (config.isProduction) {
      process.exit(1);
    }
    throw error;
  }
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    logger.info('✅ MongoDB disconnected');
  } catch (error) {
    logger.error('❌ Error disconnecting MongoDB:', error.message);
    throw error;
  }
}

export default {
  connectDB,
  disconnectDB,
};
