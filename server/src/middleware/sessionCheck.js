const sessionManager = require('../services/sessionManager');
const config = require('../config/env');

/**
 * Session Validation Middleware
 * Runs after JWT auth to check if session is still valid
 */
async function sessionCheckMiddleware(req, res, next) {
  // Feature flag check
  if (!config.security.enableSessionLimits) {
    return next();
  }

  // Must have authenticated user and token
  if (!req.user || !req.user.id || !req.token) {
    return next();
  }

  try {
    const isValid = await sessionManager.validateSession(req.user.id, req.token);

    if (!isValid) {
      return res.status(401).json({
        message: 'You have been logged out because too many sessions were created or your session is no longer active.',
        code: 'SESSION_INVALIDATED'
      });
    }

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    // Fail open to avoid locking out users on DB errors
    next();
  }
}

module.exports = { sessionCheckMiddleware };
