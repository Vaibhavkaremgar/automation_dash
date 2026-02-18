const Stripe = require('stripe');
const config = require('../config/env');
const walletService = require('./wallet');

class StripeService {
  constructor() {
    if (config.stripe.secretKey) {
      this.stripe = new Stripe(config.stripe.secretKey);
    }
  }
  
  async createCheckoutSession(userId, amountCents) {
    if (!this.stripe) {
      // Placeholder checkout when Stripe is not configured
      return { url: `${config.frontendUrl}/wallet?checkout=mock&amount=${amountCents}` };
    }
    
    if (amountCents < config.wallet.minRechargeCents) {
      throw new Error(`Minimum recharge amount is $${config.wallet.minRechargeCents / 100}`);
    }
    
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: config.stripe.currency,
          product_data: {
            name: 'HireHero Wallet Recharge',
            description: `Add $${(amountCents / 100).toFixed(2)} to your wallet`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${config.frontendUrl}/wallet?success=true`,
      cancel_url: `${config.frontendUrl}/wallet?canceled=true`,
      metadata: {
        userId: userId.toString(),
        amountCents: amountCents.toString(),
      },
    });
    
    return session;
  }
  
  async handleWebhook(rawBody, signature) {
    if (!this.stripe) {
      throw new Error('Stripe not configured');
    }
    
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.stripe.webhookSecret
    );
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = parseInt(session.metadata.userId, 10);
      const amountCents = parseInt(session.metadata.amountCents, 10);
      const amountINR = amountCents / 100; // Direct conversion from cents to rupees
      
      // Use simple recharge with 1:1 credit calculation
      const result = await walletService.processRecharge(
        userId,
        amountINR,
        session.payment_intent
      );
      
      return { success: true, userId, amountCents, amount: result.amount };
    }
    
    return { success: false };
  }
}

module.exports = new StripeService();
