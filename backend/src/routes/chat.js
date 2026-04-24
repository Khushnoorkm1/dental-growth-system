import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { processChat, initiateConversation } from '../services/chatbotService.js';
import Conversation from '../models/Conversation.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// POST /api/chat/start — Initiate a new session
router.post('/start', async (req, res) => {
  try {
    const sessionId = req.body.sessionId || uuidv4();
    const { language = 'en' } = req.body;

    const result = await initiateConversation({ sessionId, language });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Chat start error:', err);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// POST /api/chat/message — Send a message
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message, language } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'sessionId and message are required' });
    }

    if (message.length > 1000) {
      return res.status(400).json({ error: 'Message too long' });
    }

    const result = await processChat({
      sessionId,
      message: message.trim(),
      language,
      pageUrl: req.headers.referer,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Chat message error:', err);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// GET /api/chat/history/:sessionId — Get conversation history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const conv = await Conversation.findOne({ sessionId: req.params.sessionId })
      .populate('leadId', 'name email leadTemperature status');

    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    res.json({
      success: true,
      messages: conv.messages.filter(m => m.role !== 'system'),
      stage: conv.stage,
      leadCaptured: !!conv.leadId,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// GET /api/chat/conversations — Admin: list all conversations
router.get('/conversations', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, converted } = req.query;
    const filter = {};
    if (converted !== undefined) filter.converted = converted === 'true';

    const convs = await Conversation.find(filter)
      .populate('leadId', 'name email leadTemperature status')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Conversation.countDocuments(filter);

    res.json({ success: true, conversations: convs, total, page: +page });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

export default router;
