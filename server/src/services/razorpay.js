const Razorpay = require('razorpay');
const crypto = require('crypto');
const { getDatabase } = require('../db/connection');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

class RazorpayService {
  async createOrder(userId, amount) {
    try {
      console.log(`💳 Creating Razorpay order for user ${userId}, amount: ₹${amount}`);
      
      const order = await razorpay.orders.create({
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        receipt: `rcpt_${userId}_${Date.now()}`,
        notes: {
          user_id: userId,
          purpose: 'wallet_recharge'
        }
      });
      
      console.log('✅ Order created:', order.id);
      
      return {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID
      };
    } catch (error) {
      console.error('❌ Razorpay order creation failed:', error);
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  async handlePaymentSuccess(paymentData) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, user_id } = paymentData;
      
      console.log('🔍 Verifying payment:', razorpay_payment_id);
      
      // Verify signature
      const sign = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSign = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest('hex');
      
      if (razorpay_signature !== expectedSign) {
        throw new Error('Invalid payment signature');
      }
      
      // Fetch payment details from Razorpay
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      const amountInRupees = payment.amount / 100;
      
      console.log(`💰 Payment verified: ₹${amountInRupees}`);
      
      // Add credits to wallet
      await this.addCreditsToWallet(user_id, payment.amount, razorpay_payment_id);
      
      return {
        success: true,
        message: `₹${amountInRupees} added to your wallet successfully!`,
        payment_id: razorpay_payment_id
      };
    } catch (error) {
      console.error('❌ Payment verification failed:', error);
      throw error;
    }
  }

  async handleWebhook(body, signature) {
    try {
      // Verify webhook signature
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');
      
      if (signature !== expectedSignature) {
        throw new Error('Invalid webhook signature');
      }
      
      // Parse the event
      const event = JSON.parse(body);
      
      console.log('📦 Webhook event:', event.event);
      
      // Handle different events
      switch (event.event) {
        case 'payment.captured':
          const payment = event.payload.payment.entity;
          console.log(`💰 Payment captured: ${payment.id}, Amount: ₹${payment.amount/100}`);
          
          // Extract user_id from notes
          if (payment.notes && payment.notes.user_id) {
            await this.addCreditsToWallet(
              payment.notes.user_id,
              payment.amount,
              payment.id
            );
          }
          break;
          
        case 'payment.failed':
          console.log('❌ Payment failed:', event.payload.payment.entity.id);
          break;
          
        case 'order.paid':
          console.log('✅ Order paid:', event.payload.order.entity.id);
          break;
          
        default:
          console.log('ℹ️ Unhandled event:', event.event);
      }
      
      return { status: 'ok' };
    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      throw error;
    }
  }

  async addCreditsToWallet(userId, amountCents, transactionId) {
    return new Promise((resolve, reject) => {
      try {
        const db = getDatabase();
        const amountInRupees = amountCents / 100;
        console.log(`💳 Adding ₹${amountInRupees} to user ${userId}'s wallet`);
        
        // Update wallet balance
        db.run(
          `UPDATE users 
           SET wallet_balance_cents = wallet_balance_cents + ?
           WHERE id = ?`,
          [amountCents, userId],
          (err) => {
            if (err) {
              console.error('❌ Failed to update wallet balance:', err);
              return reject(err);
            }
            
            // Record transaction
            db.run(
              `INSERT INTO wallet_transactions (user_id, type, amount_cents, description, reference_id)
               VALUES (?, 'recharge', ?, ?, ?)`,
              [
                userId,
                amountCents,
                `Wallet recharge via Razorpay - ₹${amountInRupees}`,
                transactionId
              ],
              (err) => {
                if (err) {
                  console.error('❌ Failed to record transaction:', err);
                  return reject(err);
                }
                console.log('✅ Wallet updated successfully');
                resolve();
              }
            );
          }
        );
      } catch (error) {
        console.error('❌ Failed to update wallet:', error);
        reject(error);
      }
    });
  }
}

module.exports = new RazorpayService();