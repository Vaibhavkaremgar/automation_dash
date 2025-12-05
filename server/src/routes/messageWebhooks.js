const express = require('express');
const { getDatabase } = require('../db/connection');
const router = express.Router();

const db = getDatabase();

// KMG Message Webhook
router.post('/kmg/log-message', async (req, res) => {
  try {
    const { customer_id, customer_name, customer_mobile, message_type, channel, message_content, status } = req.body;
    
    db.run(`
      INSERT INTO kmg_message_logs (customer_id, customer_name, customer_mobile, message_type, channel, message_content, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [customer_id, customer_name, customer_mobile, message_type || 'notification', channel || 'whatsapp', message_content, status || 'sent'], function(err) {
      if (err) {
        console.error('KMG message log error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, id: this.lastID, client: 'KMG' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Joban Message Webhook
router.post('/joban/log-message', async (req, res) => {
  try {
    const { customer_id, customer_name, customer_mobile, message_type, channel, message_content, status } = req.body;
    
    db.run(`
      INSERT INTO joban_message_logs (customer_id, customer_name, customer_mobile, message_type, channel, message_content, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [customer_id, customer_name, customer_mobile, message_type || 'notification', channel || 'whatsapp', message_content, status || 'sent'], function(err) {
      if (err) {
        console.error('Joban message log error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, id: this.lastID, client: 'Joban' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get KMG message logs
router.get('/kmg/messages', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    db.all(`
      SELECT * FROM kmg_message_logs 
      ORDER BY sent_at DESC 
      LIMIT ?
    `, [parseInt(limit)], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ messages: rows, client: 'KMG' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Joban message logs
router.get('/joban/messages', async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    
    db.all(`
      SELECT * FROM joban_message_logs 
      ORDER BY sent_at DESC 
      LIMIT ?
    `, [parseInt(limit)], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ messages: rows, client: 'Joban' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
