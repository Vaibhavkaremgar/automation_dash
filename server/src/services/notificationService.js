const { get, run, all } = require('../db/connection');

class NotificationService {
  async addNotification(userId, type, message, data = {}) {
    const result = await run(
      `INSERT INTO notifications (user_id, type, message, data, is_read, created_at) 
       VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)`,
      [userId, type, message, JSON.stringify(data)]
    );
    return { id: result.id };
  }

  async getUnreadNotifications(userId) {
    const notifications = await all(
      'SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC',
      [userId]
    );
    return notifications.map(row => ({
      ...row,
      data: JSON.parse(row.data || '{}')
    }));
  }

  async markAsRead(notificationId, userId) {
    await run(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return true;
  }

  async notifyBalanceAdded(userId, amount) {
    const message = `₹${amount} recharge successful! ₹${amount} added to your wallet.`;
    return this.addNotification(userId, 'BALANCE_ADDED', message, {
      amount,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new NotificationService();
