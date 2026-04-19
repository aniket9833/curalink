import express from 'express';
const router = express.Router();
import { Search } from '../models/index.js';

// GET recent searches for a session
router.get('/recent/:sessionId', async (req, res) => {
  try {
    const searches = await Search.find({ sessionId: req.params.sessionId })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('originalQuery disease timestamp resultsCount');
    res.json({ searches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET search stats
router.get('/stats', async (req, res) => {
  try {
    const total = await Search.countDocuments();
    const diseases = await Search.aggregate([
      { $group: { _id: '$disease', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    res.json({ total, topDiseases: diseases });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
