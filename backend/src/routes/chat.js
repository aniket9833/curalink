import express from 'express';
const router = express.Router();
import {
  sendMessage,
  getChatHistory,
  getChat,
  deleteChat,
  getHealth,
} from '../controllers/chatController.js';

router.post('/message', sendMessage);
router.get('/history/:sessionId', getChatHistory);
router.get('/health', getHealth);
router.get('/:chatId', getChat);
router.delete('/:chatId', deleteChat);

export default router;
