const express = require('express');
const { authRequired } = require('../middleware/auth');
const walletService = require('../services/wallet');
const notificationService = require('../services/notificationService');

const router = express.Router();

// 🔒 Require authentication for all wallet routes
router.use(authRequired);

// 🪙 Get wallet balance
router.get('/', async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: user not found' });
    }

    const wallet = await walletService.getOrCreateWallet(req.user.id);
    const isLow = await walletService.isLowBalance(req.user.id);

    res.status(200).json({
      ...wallet,
      balance_dollars: (wallet.balance_cents / 100).toFixed(2),
      is_low_balance: isLow,
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    next(error);
  }
});

// 💳 Get transaction history
router.get('/transactions', async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: user not found' });
    }

    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '50', 10), 100));
    const offset = Math.max(0, parseInt(req.query.offset || '0', 10));

    const transactions = await walletService.getTransactions(req.user.id, limit, offset);

    res.status(200).json({ transactions, limit, offset });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    next(error);
  }
});

// 🔔 Get notifications
router.get('/notifications', async (req, res, next) => {
  try {
    const notifications = await notificationService.getUnreadNotifications(req.user.id);
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

// 🔔 Mark notification as read
router.patch('/notifications/:id/read', async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 💰 Manual recharge (for testing)
router.post('/recharge', async (req, res, next) => {
  try {
    const { amount } = req.body;
    const result = await walletService.processRecharge(req.user.id, amount);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
