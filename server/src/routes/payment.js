const express = require('express');
const router = express.Router();

// try to load the payment service if present; if not, fall back to a stub
let paymentService = null;
try {
  paymentService = require('../services/payment');
} catch (err) {
  console.warn('Payment service not available:', err.message);
}

/**
 * POST /api/payment/create-order
 * body: { amount, currency, receipt }
 */
router.post('/create-order', async (req, res, next) => {
  if (!paymentService || typeof paymentService.createOrder !== 'function') {
    return res.status(501).json({ error: 'Payment service not configured' });
  }
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    const order = await paymentService.createOrder({ amount, currency, receipt });
    res.json(order);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payment/verify
 * body: webhook / signature payload expected by your service
 */
router.post('/verify', async (req, res, next) => {
  if (!paymentService || typeof paymentService.verifySignature !== 'function') {
    return res.status(501).json({ error: 'Payment service not configured' });
  }
  try {
    const result = await paymentService.verifySignature(req.body);
    res.json({ verified: !!result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;