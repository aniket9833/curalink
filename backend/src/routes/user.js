import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errorHandler.js';
import { validateSessionId, validateMedicalContext } from '../utils/validation.js';

const router = express.Router();

// Create or update session
router.post('/session', async (req, res, next) => {
  try {
    const { sessionId, name, medicalContext } = req.body;

    validateSessionId(sessionId);
    const context = validateMedicalContext(medicalContext);

    const sid = sessionId || uuidv4();

    const user = await User.findOneAndUpdate(
      { sessionId: sid },
      { 
        name: name || 'Guest', 
        medicalContext: context, 
        lastActive: new Date() 
      },
      { upsert: true, new: true },
    );

    logger.info('User session updated:', sid);
    res.json({ success: true, sessionId: sid, user });
  } catch (err) {
    logger.error('Create/update session error:', err.message);
    next(err);
  }
});

// Get session
router.get('/session/:sessionId', async (req, res, next) => {
  try {
    validateSessionId(req.params.sessionId);

    const user = await User.findOne({ sessionId: req.params.sessionId });
    if (!user) {
      throw new AppError('Session not found', 404);
    }

    res.json({ success: true, user });
  } catch (err) {
    logger.error('Get session error:', err.message);
    next(err);
  }
});

export default router;
