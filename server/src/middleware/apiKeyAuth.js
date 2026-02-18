const config = require('../config/env');

/**
 * Middleware to verify API key for n8n webhooks
 */
function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No API key provided'
    });
  }
  
  if (apiKey !== process.env.N8N_API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }
  
  next();
}

module.exports = { apiKeyAuth };
