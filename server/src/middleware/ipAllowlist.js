const { getDatabase } = require('../db/connection');
const config = require('../config/env');

const db = getDatabase();

/**
 * Extract client IP address from request
 */
function getClientIp(req) {
  const xff = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  if (xff) return xff;
  return req.ip || req.connection?.remoteAddress || '';
}

/**
 * Check if IP is localhost
 */
function isLocalhost(ip) {
  return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('127.');
}

/**
 * Check IP allowlist for a user
 * Returns { allowed: boolean, message?: string }
 */
async function checkIpAllowlist(userId, userRole, clientIp) {
  // Bypass for localhost in development
  if (config.security.bypassIpForLocalhost && isLocalhost(clientIp)) {
    return { allowed: true };
  }

  // Admin bypass
  if (userRole === 'admin') {
    return { allowed: true };
  }

  try {
    // Check if user has IP restrictions configured
    const allowedIps = await new Promise((resolve, reject) => {
      db.all(
        `SELECT ip_address FROM user_ip_allowlist WHERE user_id = ?`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // No IP restrictions configured = allow all IPs
    if (allowedIps.length === 0) {
      return { allowed: true };
    }

    // Check if client IP is in allowlist
    const isAllowed = allowedIps.some(row => row.ip_address === clientIp);

    if (!isAllowed) {
      return { 
        allowed: false, 
        message: 'Access allowed only from your company network.' 
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('IP allowlist check error:', error);
    // Fail open to avoid locking out users on DB errors
    return { allowed: true };
  }
}

/**
 * IP Allowlist Middleware
 * Runs after authentication to check if user's IP is allowed
 */
async function ipAllowlistMiddleware(req, res, next) {
  // Feature flag check
  if (!config.security.enableIpRestrictions) {
    return next();
  }

  // Must have authenticated user
  if (!req.user || !req.user.id) {
    return next();
  }

  const clientIp = getClientIp(req);
  const result = await checkIpAllowlist(req.user.id, req.user.role, clientIp);

  if (!result.allowed) {
    return res.status(403).json({
      message: result.message,
      code: 'IP_RESTRICTED'
    });
  }

  next();
}

module.exports = { ipAllowlistMiddleware, getClientIp, checkIpAllowlist };
