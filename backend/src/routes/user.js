import express from 'express';
const router = express.Router();
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models';

// Create or update session
router.post('/session', async (req, res) => {
  try {
    const { sessionId, name, medicalContext } = req.body;
    const sid = sessionId || uuidv4();

    const user = await User.findOneAndUpdate(
      { sessionId: sid },
      { name: name || 'Guest', medicalContext, lastActive: new Date() },
      { upsert: true, new: true },
    );
    res.json({ sessionId: sid, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const user = await User.findOne({ sessionId: req.params.sessionId });
    if (!user) return res.status(404).json({ error: 'Session not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
