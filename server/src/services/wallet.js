const { get, run, all } = require('../db/connection');
const config = require('../config/env');
const notificationService = require('./notificationService');

class WalletService {
  constructor() {
    this.VOICE_COST_PER_MINUTE = 5;
  }

  async getOrCreateWallet(userId) {
    let wallet = await get('SELECT * FROM wallets WHERE user_id = ?', [userId]);
    
    if (wallet) {
      return wallet;
    }
    
    await run('INSERT INTO wallets (user_id, balance_cents) VALUES (?, ?)', [userId, 0]);
    wallet = await get('SELECT * FROM wallets WHERE user_id = ?', [userId]);
    return wallet;
  }

  async getBalance(userId) {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet.balance_cents;
  }

  async isLowBalance(userId) {
    const balanceCents = await this.getBalance(userId);
    const threshold = config.wallet.lowBalanceThreshold || 0.2;
    return balanceCents < 1000 || balanceCents < (config.wallet.minRechargeCents * threshold);
  }

  async hasSufficientBalance(userId, requiredCents) {
    const balanceCents = await this.getBalance(userId);
    return balanceCents >= requiredCents;
  }

  async addFunds(userId, amountCents, description = 'Wallet recharge', stripePaymentId = null) {
    try {
      await run(
        'UPDATE wallets SET balance_cents = balance_cents + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [amountCents, userId]
      );
      
      await run(
        'INSERT INTO transactions (user_id, type, amount_cents, description, stripe_payment_id) VALUES (?, ?, ?, ?, ?)',
        [userId, 'recharge', amountCents, description, stripePaymentId]
      );
      
      const wallet = await this.getOrCreateWallet(userId);
      return wallet;
    } catch (err) {
      throw err;
    }
  }

  async processRecharge(userId, amount, paymentId = null) {
    if (amount < 100) {
      throw new Error('Minimum recharge is ₹100');
    }

    const amountCents = amount * 100;
    const wallet = await this.addFunds(userId, amountCents, `Recharge ₹${amount}`, paymentId);
    await notificationService.notifyBalanceAdded(userId, amount);

    return { wallet, amount };
  }

  async deductFunds(userId, amountCents, description = 'Tool usage') {
    const hasFunds = await this.hasSufficientBalance(userId, amountCents);
    if (!hasFunds) {
      throw new Error('Insufficient balance');
    }

    try {
      await run(
        'UPDATE wallets SET balance_cents = balance_cents - ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [amountCents, userId]
      );
      
      await run(
        'INSERT INTO transactions (user_id, type, amount_cents, description) VALUES (?, ?, ?, ?)',
        [userId, 'debit', -amountCents, description]
      );
      
      const wallet = await this.getOrCreateWallet(userId);
      return wallet;
    } catch (err) {
      throw err;
    }
  }

  async getTransactions(userId, limit = 50, offset = 0) {
    const transactions = await all(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );
    return transactions;
  }

  async getAllTransactions(limit = 100, offset = 0, userId = null) {
    let query = 'SELECT t.*, u.email, u.name FROM transactions t JOIN users u ON t.user_id = u.id';
    const params = [];
    
    if (userId) {
      query += ' WHERE t.user_id = ?';
      params.push(userId);
      query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
    } else {
      query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }
    
    const transactions = await all(query, params);
    return transactions;
  }

  async addCreditsFromRecharge(userId, amountUSD) {
    const amountCents = Math.round(amountUSD * 100);
    return this.addFunds(userId, amountCents, `Recharge of $${amountUSD} (${amountCents / 100} USD)`);
  }

  async deductForVoiceUsage(userId, durationMinutes) {
    const cost = Math.ceil(durationMinutes * this.VOICE_COST_PER_MINUTE);
    const amountCents = cost * 100;
    return this.deductFunds(userId, amountCents, `Voice Assistant usage (${durationMinutes} min - ₹${cost})`);
  }
}

module.exports = new WalletService();
