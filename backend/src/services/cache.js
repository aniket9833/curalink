import NodeCache from 'node-cache';
import crypto from 'crypto';
import { CachedResearch } from '../models/index.js';

/**
 * Caching Service
 * In-memory + MongoDB caching for research results
 */

// In-memory cache: 30 minutes TTL
const memCache = new NodeCache({
  stdTTL: 1800,
  checkperiod: 120,
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
    console.log('🎯 Cache hit (memory):', key.slice(0, 8));
    return mem;
  }

  // 2. Check MongoDB cache
  try {
    const db = await CachedResearch.findOne({
      queryHash: key,
      expiresAt: { $gt: new Date() },
    });

    if (db) {
      console.log('🎯 Cache hit (MongoDB):', key.slice(0, 8));

      const data = {
        publications: db.publications,
        trials: db.trials,
      };

      memCache.set(key, data);

      return data;
    }
  } catch (err) {
    console.warn('Cache DB read error:', err.message);
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
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
