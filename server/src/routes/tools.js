const express = require('express');
const { authRequired } = require('../middleware/auth');
const toolsService = require('../services/tools');

const router = express.Router();

router.use(authRequired);

router.get('/pricing', async (req, res, next) => {
  try {
    const pricing = await toolsService.getPricing();
    res.json({ pricing });
  } catch (error) {
    next(error);
  }
});

router.get('/usage', async (req, res, next) => {
  try {
    const from = req.query.from || null;
    const to = req.query.to || null;
    
    const usage = await toolsService.getUsage(req.user.id, from, to);
    res.json({ usage });
  } catch (error) {
    next(error);
  }
});

router.post('/vapi/start', (req, res, next) => {
  try {
    res.json({ message: 'VAPI session started', sessionId: Date.now() });
  } catch (error) {
    next(error);
  }
});

router.post('/vapi/stop', async (req, res, next) => {
  try {
    const { minutes } = req.body;
    
    if (!minutes || minutes < 0) {
      return res.status(400).json({ error: 'Invalid minutes' });
    }
    
    const result = await toolsService.logUsage(req.user.id, 'vapi', minutes, { sessionId: req.body.sessionId });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/elevenlabs/tts', async (req, res, next) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text required' });
    }
    
    const charCount = text.length;
    const result = await toolsService.logUsage(req.user.id, 'elevenlabs', charCount, { text: text.substring(0, 100) });
    
    res.json({ ...result, charCount, audioUrl: 'https://placeholder-audio-url.com/tts.mp3' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
