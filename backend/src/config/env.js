/**
 * Environment Configuration
 * Validates and exports environment variables
 */

import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = ['MONGODB_URI'];

const optionalEnvVars = {
  PORT: 3000,
  NODE_ENV: 'development',
  FRONTEND_URL: 'http://localhost:3000',
  OLLAMA_BASE_URL: 'http://localhost:11434',
  OLLAMA_MODEL: 'llama3.2',
};

// Validate required env vars
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(`Missing environment variables: ${missingVars.join(', ')}`);
}

// Build config object
export const config = {
  port: parseInt(process.env.PORT || optionalEnvVars.PORT, 10),
  nodeEnv: process.env.NODE_ENV || optionalEnvVars.NODE_ENV,
  mongodb: {
    uri: process.env.MONGODB_URI,
  },
  frontend: {
    url: process.env.FRONTEND_URL || optionalEnvVars.FRONTEND_URL,
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || optionalEnvVars.OLLAMA_BASE_URL,
    model: process.env.OLLAMA_MODEL || optionalEnvVars.OLLAMA_MODEL,
  },
  isDevelopment:
    (process.env.NODE_ENV || optionalEnvVars.NODE_ENV) === 'development',
  isProduction:
    (process.env.NODE_ENV || optionalEnvVars.NODE_ENV) === 'production',
};

export default config;
