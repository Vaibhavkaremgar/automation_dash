const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../db/connection');
const config = require('../config/env');

const db = getDatabase();

class SessionManager {
  /**
   * Create a new session for a user
   */
  async createSession(userId, token, ipAddress) {
    if (!config.security.enableSessionLimits) {
      return null; // Sessions disabled
    }

    const sessionId = uuidv4();
    
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO sessions (id, user_id, token, ip_address) VALUES (?, ?, ?, ?)`,
        [sessionId, userId, token, ipAddress],
        (err) => {
          if (err) reject(err);
          else resolve(sessionId);
        }
      );
    });
  }

  /**
   * Check if session exists and is valid
   */
  async validateSession(userId, token) {
    if (!config.security.enableSessionLimits) {
      return true; // Sessions disabled, allow all
    }

    return new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM sessions WHERE user_id = ? AND token = ?`,
        [userId, token],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  }

  /**
   * Count active sessions for a user
   */
  async countUserSessions(userId) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM sessions WHERE user_id = ?`,
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row?.count || 0);
        }
      );
    });
  }

  /**
   * Delete oldest session for a user (Netflix-style eviction)
   */
  async deleteOldestSession(userId) {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM sessions WHERE id = (
          SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at ASC LIMIT 1
        )`,
        [userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Delete a specific session
   */
  async deleteSession(userId, token) {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM sessions WHERE user_id = ? AND token = ?`,
        [userId, token],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllUserSessions(userId) {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM sessions WHERE user_id = ?`,
        [userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Clean up old sessions (older than 30 days)
   */
  async cleanupOldSessions() {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM sessions WHERE created_at < datetime('now', '-30 days')`,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, ip_address, created_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

}

const sessionManager = new SessionManager();

// Run cleanup every hour
setInterval(() => {
  sessionManager.cleanupOldSessions().catch(err => 
    console.error('Session cleanup error:', err)
  );
}, 60 * 60 * 1000);

module.exports = sessionManager;
