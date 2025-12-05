const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { get, run } = require('../db/connection');
const config = require('../config/env');
const { authRequired } = require('../middleware/auth');
const walletService = require('../services/wallet');
const sessionManager = require('../services/sessionManager');
const { getClientIp } = require('../middleware/ipAllowlist');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password, forceLogin } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Account suspended. Contact administrator.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    // Session limit enforcement
    if (config.security.enableSessionLimits) {
      const maxSessions = user.max_sessions || 5;
      const currentSessions = await sessionManager.countUserSessions(user.id);
      
      if (currentSessions >= maxSessions && !forceLogin) {
        // Warn user before logging out oldest session
        return res.status(409).json({
          error: 'SESSION_LIMIT_REACHED',
          message: `You have reached the maximum of ${maxSessions} active sessions. Logging in will automatically log out your oldest session.`,
          requiresConfirmation: true
        });
      }
      
      if (currentSessions >= maxSessions && forceLogin) {
        // User confirmed, log out the oldest session
        await sessionManager.deleteOldestSession(user.id);
      }
    }

    // Generate JWT with jti for session tracking
    const jti = uuidv4();
    const token = jwt.sign(
      { id: user.id, role: user.role, jti },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Create session record
    const clientIp = getClientIp(req);
    if (config.security.enableSessionLimits) {
      await sessionManager.createSession(user.id, token, clientIp);
    }

    const wallet = await walletService.getOrCreateWallet(user.id);

    res.json({
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        client_type: user.client_type || 'hr',
        company_name: user.company_name,
        google_sheet_url: user.google_sheet_url,
        balance: wallet.balance_cents,
        mustChangePassword: user.must_change_password === 1
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const user = await get('SELECT id, email, name, role, status, must_change_password, can_change_password, client_type, google_sheet_url FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const wallet = await walletService.getOrCreateWallet(user.id);
    const isLow = await walletService.isLowBalance(user.id);

    res.json({ 
      ...user, 
      client_type: user.client_type || 'hr', 
      balance: wallet.balance_cents, 
      isLowBalance: isLow, 
      mustChangePassword: user.must_change_password === 1,
      canChangePassword: user.role === 'admin' || user.can_change_password === 1
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', authRequired, async (req, res, next) => {
  try {
    if (config.security.enableSessionLimits && req.token) {
      await sessionManager.deleteSession(req.user.id, req.token);
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', authRequired, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await get('SELECT password_hash, temp_password, can_change_password, role FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if user has permission to change password (admins always can)
    if (user.role !== 'admin' && user.can_change_password === 0) {
      return res.status(403).json({ error: 'Password change is disabled for your account. Contact administrator.' });
    }

    if (!user.temp_password) {
      const isValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValid) return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await run(
      'UPDATE users SET password_hash = ?, temp_password = 0, must_change_password = 0 WHERE id = ?',
      [newPasswordHash, req.user.id]
    );
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/sessions', authRequired, async (req, res, next) => {
  try {
    const sessions = await sessionManager.getUserSessions(req.user.id);
    res.json({ sessions, count: sessions.length });
  } catch (error) {
    next(error);
  }
});

router.delete('/sessions/all', authRequired, async (req, res, next) => {
  try {
    await sessionManager.deleteAllUserSessions(req.user.id);
    res.json({ message: 'All sessions deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
