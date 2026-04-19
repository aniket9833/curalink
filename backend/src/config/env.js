/**
 * Environment Configuration
 * Validates and exports environment variables
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

const requiredEnvVars = ['MONGODB_URI', 'HF_TOKEN'];

const optionalEnvVars = {
  PORT: 3000,
  NODE_ENV: 'development',
  FRONTEND_URL: 'http://localhost:5173',
  HF_MODEL: 'meta-llama/Llama-3.1-8B-Instruct',
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
  huggingFace: {
    token: process.env.HF_TOKEN,
    model: process.env.HF_MODEL || optionalEnvVars.HF_MODEL,
  },
  isDevelopment:
    (process.env.NODE_ENV || optionalEnvVars.NODE_ENV) === 'development',
  isProduction:
    (process.env.NODE_ENV || optionalEnvVars.NODE_ENV) === 'production',
};

export default config;
