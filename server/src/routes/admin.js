const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { get, run, all } = require('../db/connection');
const { authRequired, requireRole } = require('../middleware/auth');
const walletService = require('../services/wallet');
const toolsService = require('../services/tools');
const analyticsService = require('../services/analytics');
const sheetsService = require('../services/sheets');

const router = express.Router();

router.use(authRequired, requireRole('admin'));

router.get('/users', async (req, res, next) => {
  try {
    const users = await all(
      `SELECT u.id, u.email, u.name, u.role, u.status, u.client_type, u.google_sheet_url, 
              u.can_change_password, u.created_at, u.updated_at, w.balance_cents 
       FROM users u 
       LEFT JOIN wallets w ON u.id = w.user_id 
       WHERE u.role = 'client'
       ORDER BY u.client_type, u.created_at DESC`
    );
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.post('/users', async (req, res, next) => {
  try {
    console.log('📝 Admin create user request:', req.body);
    console.log('👤 Request user:', req.user);
    
    const { email, name, google_sheet_url, client_type } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      console.log('❌ Invalid email:', email);
      return res.status(400).json({ error: 'Valid email required' });
    }
    
    if (!name || !name.trim()) {
      console.log('❌ Name is required');
      return res.status(400).json({ error: 'Client name is required' });
    }
    
    console.log('✅ Email validation passed:', email);

    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    
    if (existing) {
      console.log('❌ Email already exists:', email);
      return res.status(409).json({ error: 'Email already exists' });
    }
    
    console.log('✅ Email is unique, proceeding with user creation');

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    
    const result = await run(
      'INSERT INTO users (email, password_hash, name, role, temp_password, must_change_password, google_sheet_url, status, client_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [email, passwordHash, name || null, 'client', 1, 1, google_sheet_url || null, 'open', client_type || 'hr']
    );
    
    const userId = result.id;
    await walletService.getOrCreateWallet(userId);
    
    let syncResult = null;
    if (google_sheet_url) {
      try {
        const sheetIdMatch = google_sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (sheetIdMatch) {
          const sheetId = sheetIdMatch[1];
          syncResult = await sheetsService.syncCandidates(userId, sheetId, 'output');
        }
      } catch (syncError) {
        console.warn('Auto-sync failed for new client:', syncError.message);
      }
    }
    
    res.status(201).json({
      id: userId,
      email,
      name,
      role: 'client',
      tempPassword,
      syncResult,
      hasGoogleSheets: !!google_sheet_url,
      message: `Client created successfully. ${google_sheet_url ? 'Google Sheets connected.' : ''} Share the temporary password - they must change it on first login.`
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    
    await run('DELETE FROM wallets WHERE user_id = ?', [userId]);
    await run('DELETE FROM transactions WHERE user_id = ?', [userId]);
    await run('DELETE FROM notifications WHERE user_id = ?', [userId]);
    await run('DELETE FROM jobs WHERE user_id = ?', [userId]);
    await run('DELETE FROM candidates WHERE user_id = ?', [userId]);
    
    const result = await run('DELETE FROM users WHERE id = ? AND role = ?', [userId, 'client']);
    
    if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Client permanently deleted' });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { name, status, password, can_change_password } = req.body;
    const userId = parseInt(req.params.id, 10);
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await run('UPDATE users SET password_hash = ?, temp_password = 1, must_change_password = 1 WHERE id = ?', [passwordHash, userId]);
    }
    
    if (name !== undefined) {
      await run('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
    }
    
    if (status) {
      await run('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
    }
    
    if (can_change_password !== undefined) {
      await run('UPDATE users SET can_change_password = ? WHERE id = ?', [can_change_password ? 1 : 0, userId]);
    }
    
    const user = await get('SELECT id, email, name, role, status, can_change_password FROM users WHERE id = ?', [userId]);
    res.json(user);
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id/wallet', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const wallet = await walletService.getOrCreateWallet(userId);
    const transactions = await walletService.getTransactions(userId, 20);
    
    res.json({ wallet, transactions });
  } catch (error) {
    next(error);
  }
});

router.get('/transactions', async (req, res, next) => {
  try {
    const transactions = await walletService.getAllTransactions(100, 0);
    res.json({ transactions });
  } catch (error) {
    next(error);
  }
});

router.put('/tools/pricing', async (req, res, next) => {
  try {
    const { tool_name, price_per_unit_cents, unit_type, description } = req.body;
    
    if (!tool_name || !price_per_unit_cents || !unit_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const pricing = await toolsService.updatePricing(tool_name, price_per_unit_cents, unit_type, description);
    res.json(pricing);
  } catch (error) {
    next(error);
  }
});

router.post('/users/:id/recharge', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { amount_cents } = req.body;
    if (!amount_cents || amount_cents < 100) {
      return res.status(400).json({ error: 'Minimum ₹1.00 (100 paise)' });
    }
    await walletService.addFunds(userId, amount_cents, 'Admin recharge');
    const wallet = await walletService.getOrCreateWallet(userId);
    res.json({ message: 'Recharged', wallet });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id/analytics', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const analytics = await analyticsService.getClientAnalytics(userId);
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

router.get('/clients-analytics', async (req, res, next) => {
  try {
    const clients = await analyticsService.getAllClientsAnalytics();
    
    const refreshPromises = clients
      .filter(client => client.google_sheet_url)
      .map(client => 
        analyticsService.getClientAnalytics(client.id)
          .catch(err => console.error(`Failed to refresh analytics for client ${client.id}:`, err.message))
      );
    
    Promise.all(refreshPromises).then(() => {
      console.log('Background analytics refresh completed');
    });
    
    res.json({ clients });
  } catch (error) {
    next(error);
  }
});

router.post('/users/:id/refresh-analytics', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const analytics = await analyticsService.getClientAnalytics(userId);
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

// Admin sync client data from Google Sheets
router.post('/users/:id/sync-from-sheet', async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const user = await get('SELECT google_sheet_url, client_type FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.google_sheet_url) {
      return res.status(400).json({ error: 'No Google Sheet URL configured for this client' });
    }
    
    const sheetIdMatch = user.google_sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      return res.status(400).json({ error: 'Invalid Google Sheet URL' });
    }
    
    const sheetId = sheetIdMatch[1];
    
    // Sync based on client type
    if (user.client_type === 'insurance') {
      const insuranceSync = require('../services/insuranceSync');
      const { getClientConfig } = require('../config/insuranceClients');
      const userEmail = await get('SELECT email FROM users WHERE id = ?', [userId]);
      const clientConfig = getClientConfig(userEmail.email);
      const result = await insuranceSync.syncFromSheet(userId, clientConfig.spreadsheetId, clientConfig.tabName);
      return res.json({ success: true, ...result, clientType: 'insurance' });
    } else {
      // HR client sync
      const result = await sheetsService.syncCandidates(userId, sheetId, 'output');
      return res.json({ success: true, ...result, clientType: 'hr' });
    }
  } catch (error) {
    console.error('Admin sync error:', error);
    next(error);
  }
});

module.exports = router;
