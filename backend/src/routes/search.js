import express from 'express';
import { Search } from '../models/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errorHandler.js';

const router = express.Router();

// GET recent searches for a session
router.get('/recent/:sessionId', async (req, res, next) => {
  try {
    const searches = await Search.find({ sessionId: req.params.sessionId })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('originalQuery disease timestamp resultsCount');
    res.json({ success: true, searches });
  } catch (err) {
    logger.error('Get recent searches error:', err.message);
    next(err);
  }
});

// GET search stats
router.get('/stats', async (req, res, next) => {
  try {
    const total = await Search.countDocuments();
    const diseases = await Search.aggregate([
      { $group: { _id: '$disease', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    res.json({ success: true, total, topDiseases: diseases });
  } catch (err) {
    logger.error('Get search stats error:', err.message);
    next(err);
  }
});

export default router;
