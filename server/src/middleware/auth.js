const jwt = require('jsonwebtoken');
const config = require('../config/env');
const sessionManager = require('../services/sessionManager');
const { checkIpAllowlist, getClientIp } = require('../middleware/ipAllowlist');

/**
 * Middleware to verify JWT token and attach user to request
 */
async function authRequired(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = jwt.verify(token, config.jwtSecret);

    // ✅ Normalize to always have req.user.id even if the key name differs
    req.user = {
      id: decoded.id || decoded.userId || decoded._id || decoded.uid,
      role: decoded.role || 'user',
      email: decoded.email || null,
    };
    
    // Store token and jti for session validation
    req.token = token;
    req.jti = decoded.jti || null;

    // Session validation (after JWT is verified)
    if (config.security.enableSessionLimits) {
      const isValid = await sessionManager.validateSession(req.user.id, req.token);
      if (!isValid) {
        return res.status(401).json({
          message: 'Your session has been logged out. Please login again.',
          code: 'SESSION_INVALIDATED'
        });
      }
    }

    // IP allowlist check (after JWT is verified)
    if (config.security.enableIpRestrictions) {
      const ipCheckResult = await checkIpAllowlist(req.user.id, req.user.role, getClientIp(req));
      if (!ipCheckResult.allowed) {
        return res.status(403).json({
          message: ipCheckResult.message,
          code: 'IP_RESTRICTED'
        });
      }
    }

    // Optional debug log
    if (!req.user.id) {
      console.warn('⚠️ Warning: No user ID found in token payload:', decoded);
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token expired',
      });
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
    });
  }
}

/**
 * Middleware to require specific role(s)
 * @param {string|string[]} roles - Required role(s)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const allowedRoles = roles.flat();

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
    }

    next();
  };
}

module.exports = {
  authRequired,
  requireRole,
};
