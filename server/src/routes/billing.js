const express = require('express');
const { authRequired } = require('../middleware/auth');
const stripeService = require('../services/stripe');
const razorpayService = require('../services/razorpay');

const router = express.Router();

// Stripe routes
router.post('/create-checkout-session', authRequired, async (req, res, next) => {
  try {
    const { amount_cents } = req.body;
    
    if (!amount_cents || amount_cents < 10000) {
      return res.status(400).json({ error: 'Minimum amount is ₹100' });
    }
    
    const session = await stripeService.createCheckoutSession(req.user.id, amount_cents);
    
    res.json({ checkoutUrl: session.url });
  } catch (error) {
    next(error);
  }
});

router.post('/stripe/webhook', async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    const result = await stripeService.handleWebhook(req.body, sig);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Razorpay routes
router.post('/razorpay/create-order', authRequired, async (req, res, next) => {
  try {
    const { amount } = req.body; // Amount in INR
    
    if (!amount || amount < 100) {
      return res.status(400).json({ error: 'Minimum amount is ₹100' });
    }
    
    const order = await razorpayService.createOrder(req.user.id, amount);
    res.json(order);
  } catch (error) {
    console.error('❌ Create order error:', error);
    next(error);
  }
});

// Razorpay payment verification (called from frontend after payment)
router.post('/razorpay/verify', authRequired, async (req, res, next) => {
  try {
    const result = await razorpayService.handlePaymentSuccess(req.body);
    res.json(result);
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    next(error);
  }
});

// ✅ NEW: Razorpay webhook endpoint (called by Razorpay server)
router.post('/razorpay/webhook', async (req, res, next) => {
  try {
    console.log('📥 Razorpay webhook received');
    
    // Get signature from headers
    const signature = req.headers['x-razorpay-signature'];
    
    // Get raw body (already parsed by express.raw middleware in index.js)
    const body = req.body.toString();
    
    const result = await razorpayService.handleWebhook(body, signature);
    
    console.log('✅ Webhook processed successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;