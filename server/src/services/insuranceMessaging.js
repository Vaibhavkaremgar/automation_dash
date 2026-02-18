const db = require('../db/connection');
const config = require('../config/env');

class InsuranceMessagingService {
  constructor() {
    this.transporter = null;
    this.initializeEmailTransporter();
  }

  initializeEmailTransporter() {
    // Placeholder email service - logs to console
    this.transporter = {
      sendMail: async (options) => {
        console.log('📧 Email sent:', options.to, '-', options.subject);
        return { messageId: 'msg-' + Date.now() };
      }
    };
  }

  async scheduleReminders(userId) {
    try {
      // Get all customers with upcoming renewals
      const customers = await db.all(`
        SELECT * FROM insurance_customers 
        WHERE user_id = ? AND status = 'active'
      `, [userId]);

      let scheduled = 0;

      for (const customer of customers) {
        const renewalDate = new Date(customer.renewal_date);
        const today = new Date();
        const daysDiff = Math.ceil((renewalDate - today) / (1000 * 60 * 60 * 24));

        // Schedule reminders based on days until renewal
        const reminderTypes = [];
        
        if (daysDiff === 30) reminderTypes.push('reminder_30');
        if (daysDiff === 7) reminderTypes.push('reminder_7');
        if (daysDiff === 1) reminderTypes.push('reminder_1');
        if (daysDiff === -7) reminderTypes.push('expired_7');
        if (daysDiff === -15) reminderTypes.push('expired_15');

        for (const type of reminderTypes) {
          // Check if message already scheduled
          const existing = await db.get(`
            SELECT id FROM insurance_messages 
            WHERE customer_id = ? AND message_type = ? AND scheduled_date = date('now')
          `, [customer.id, type]);

          if (!existing) {
            await db.run(`
              INSERT INTO insurance_messages (user_id, customer_id, message_type, scheduled_date, email_content)
              VALUES (?, ?, ?, date('now'), ?)
            `, [userId, customer.id, type, this.getMessageContent(type, customer)]);
            scheduled++;
          }
        }

        // Schedule thank you message if status changed to paid/done
        if (customer.status === 'paid' || customer.status === 'done') {
          const existing = await db.get(`
            SELECT id FROM insurance_messages 
            WHERE customer_id = ? AND message_type = 'thank_you' AND scheduled_date = date('now')
          `, [customer.id]);

          if (!existing) {
            await db.run(`
              INSERT INTO insurance_messages (user_id, customer_id, message_type, scheduled_date, email_content)
              VALUES (?, ?, 'thank_you', date('now'), ?)
            `, [userId, customer.id, this.getMessageContent('thank_you', customer)]);
            scheduled++;
          }
        }
      }

      return { scheduled };
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      throw error;
    }
  }

  async sendPendingMessages(userId) {
    try {
      const pendingMessages = await db.all(`
        SELECT im.*, ic.name, ic.mobile_number, ic.email 
        FROM insurance_messages im
        JOIN insurance_customers ic ON im.customer_id = ic.id
        WHERE im.user_id = ? AND im.status = 'pending' AND im.scheduled_date <= date('now')
      `, [userId]);

      let sent = 0;
      let totalCost = 0;

      for (const message of pendingMessages) {
        try {
          // Send email (placeholder - replace with actual email service)
          await this.sendEmail({
            to: message.mobile_number + '@example.com', // Replace with actual email
            subject: this.getSubject(message.message_type),
            html: message.email_content
          });

          // Update message status
          await db.run(`
            UPDATE insurance_messages 
            SET status = 'sent', sent_date = CURRENT_TIMESTAMP 
            WHERE id = ?
          `, [message.id]);

          // Deduct from wallet
          await this.deductFromWallet(userId, 100); // ₹1 per message
          
          sent++;
          totalCost += 100;
        } catch (error) {
          console.error(`Failed to send message ${message.id}:`, error);
          await db.run(`
            UPDATE insurance_messages 
            SET status = 'failed' 
            WHERE id = ?
          `, [message.id]);
        }
      }

      return { sent, totalCost: totalCost / 100 };
    } catch (error) {
      console.error('Error sending messages:', error);
      throw error;
    }
  }

  getMessageContent(type, customer) {
    const templates = {
      reminder_30: `Dear ${customer.name},\n\nYour vehicle insurance policy (${customer.registration_no}) will expire in 30 days on ${customer.renewal_date}.\n\nPlease renew your policy to avoid any inconvenience.\n\nBest regards,\nViral Bug Automations`,
      
      reminder_7: `Dear ${customer.name},\n\nURGENT: Your vehicle insurance policy (${customer.registration_no}) will expire in 7 days on ${customer.renewal_date}.\n\nPlease renew immediately to maintain coverage.\n\nBest regards,\nViral Bug Automations`,
      
      reminder_1: `Dear ${customer.name},\n\nFINAL REMINDER: Your vehicle insurance policy (${customer.registration_no}) expires TOMORROW (${customer.renewal_date}).\n\nRenew now to avoid policy lapse.\n\nBest regards,\nViral Bug Automations`,
      
      expired_7: `Dear ${customer.name},\n\nYour vehicle insurance policy (${customer.registration_no}) expired 7 days ago on ${customer.renewal_date}.\n\nRenew immediately to restore coverage.\n\nBest regards,\nViral Bug Automations`,
      
      expired_15: `Dear ${customer.name},\n\nYour vehicle insurance policy (${customer.registration_no}) expired 15 days ago on ${customer.renewal_date}.\n\nPlease contact us immediately to renew your policy.\n\nBest regards,\nViral Bug Automations`,
      
      thank_you: `Dear ${customer.name},\n\nThank you for renewing your vehicle insurance policy (${customer.registration_no})!\n\nYour policy documents are attached. Please keep them safe.\n\nBest regards,\nViral Bug Automations`
    };

    return templates[type] || 'Insurance notification';
  }

  getSubject(type) {
    const subjects = {
      reminder_30: 'Insurance Renewal Reminder - 30 Days',
      reminder_7: 'URGENT: Insurance Renewal - 7 Days',
      reminder_1: 'FINAL REMINDER: Insurance Expires Tomorrow',
      expired_7: 'Insurance Policy Expired - Renew Now',
      expired_15: 'Insurance Policy Expired - Contact Us',
      thank_you: 'Thank You for Renewing Your Insurance'
    };

    return subjects[type] || 'Insurance Notification';
  }

  async sendEmail(options) {
    return await this.transporter.sendMail(options);
  }

  async deductFromWallet(userId, amountCents) {
    await db.run(`
      UPDATE wallets SET balance_cents = balance_cents - ? WHERE user_id = ?
    `, [amountCents, userId]);

    await db.run(`
      INSERT INTO transactions (user_id, type, amount_cents, description)
      VALUES (?, 'debit', ?, 'Insurance message sent')
    `, [userId, amountCents]);
  }
}

module.exports = new InsuranceMessagingService();