import NodeCache from 'node-cache';
import crypto from 'crypto';
import { CachedResearch } from '../models/index.js';
import { CACHE_CONFIG } from '../config/constants.js';
import logger from '../utils/logger.js';

/**
 * Caching Service
 * In-memory + MongoDB caching for research results
 */

// In-memory cache: configurable TTL
const memCache = new NodeCache({
  stdTTL: CACHE_CONFIG.memoryTTL,
  checkperiod: CACHE_CONFIG.memoryCheckPeriod,
});

function hashQuery(query, disease) {
  return crypto
    .createHash('md5')
    .update(
      `${(query || '').toLowerCase().trim()}::${(disease || '')
        .toLowerCase()
        .trim()}`,
    )
    .digest('hex');
}

export async function getCached(query, disease) {
  const key = hashQuery(query, disease);

  // 1. Check memory cache
  const mem = memCache.get(key);

  if (mem) {
    logger.debug('Cache hit (memory):', { key: key.slice(0, 8) });
    return mem;
  }

  // 2. Check MongoDB cache
  try {
    const db = await CachedResearch.findOne({
      queryHash: key,
      expiresAt: { $gt: new Date() },
    });

    if (db) {
      logger.debug('Cache hit (MongoDB):', { key: key.slice(0, 8) });

      const data = {
        publications: db.publications,
        trials: db.trials,
      };

      memCache.set(key, data);

      return data;
    }
  } catch (err) {
    logger.warn('Cache DB read error:', err.message);
  }

  return null;
}

export async function setCached(query, disease, data) {
  const key = hashQuery(query, disease);

  // 1. Memory cache
  memCache.set(key, data);

  // 2. MongoDB cache
  try {
    await CachedResearch.findOneAndUpdate(
      { queryHash: key },
      {
        queryHash: key,
        query,
        publications: data.publications,
        trials: data.trials,
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + CACHE_CONFIG.mongoDBTTL),
      },
      {
        upsert: true,
        new: true,
      },
    );
  } catch (err) {
    console.warn('Cache DB write error:', err.message);
  }
}
