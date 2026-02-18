const express = require('express');
const { getDatabase } = require('../db/connection');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { triggerBackup } = require('../services/backupScheduler');
const router = express.Router();

const db = getDatabase();

// n8n Webhook with client key differentiation
router.post('/n8n/log-message', apiKeyAuth, async (req, res) => {
  try {
    const { client_key, customer_id, customer_name, customer_mobile, message_type, channel, message_content, status } = req.body;
    
    // Validate client_key
    if (!client_key || !['kmg', 'joban'].includes(client_key)) {
      return res.status(400).json({ error: 'Invalid or missing client_key. Use "kmg" or "joban"' });
    }
    
    // Find customer_id if not provided
    let finalCustomerId = customer_id;
    if (!finalCustomerId && (customer_name || customer_mobile)) {
      const { get } = require('../db/connection');
      
      let query = 'SELECT id FROM insurance_customers WHERE 1=1';
      const params = [];
      
      if (customer_name) {
        query += ' AND LOWER(name) = LOWER(?)';
        params.push(customer_name.trim());
      }
      
      if (customer_mobile) {
        query += ' AND mobile_number = ?';
        params.push(customer_mobile.trim());
      }
      
      query += ' LIMIT 1';
      
      const customer = await new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (customer) {
        finalCustomerId = customer.id;
        console.log(`✅ Found customer ID ${finalCustomerId} for ${customer_name} (${customer_mobile})`);
      }
    }
    
    // Insert into message_logs table (same as dashboard)
    db.run(`
      INSERT INTO message_logs (customer_id, message_type, channel, message_content, status, sent_at, customer_name_fallback, client_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [finalCustomerId, message_type || 'notification', channel || 'whatsapp', message_content, status || 'sent', new Date().toISOString(), customer_name, client_key], function(err) {
      if (err) {
        console.error(`${client_key.toUpperCase()} n8n message log error:`, err);
        return res.status(500).json({ error: err.message });
      }
      
      // Trigger backup after successful message log (non-blocking)
      triggerBackup().catch(() => {});
      
      res.json({ success: true, id: this.lastID, client: client_key.toUpperCase(), source: 'n8n', customer_id: finalCustomerId });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// KMG Message Webhook (Dashboard)
router.post('/kmg/log-message', async (req, res) => {
  try {
    const { customer_id, customer_name, customer_mobile, message_type, channel, message_content, status } = req.body;
    
    db.run(`
      INSERT INTO kmg_message_logs (customer_id, customer_name, customer_mobile, message_type, channel, message_content, status, source, client_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [customer_id, customer_name, customer_mobile, message_type || 'notification', channel || 'whatsapp', message_content, status || 'sent', 'dashboard', 'kmg'], function(err) {
      if (err) {
        console.error('KMG message log error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, id: this.lastID, client: 'KMG', source: 'dashboard' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Joban Message Webhook (Dashboard)
router.post('/joban/log-message', async (req, res) => {
  try {
    const { customer_id, customer_name, customer_mobile, message_type, channel, message_content, status } = req.body;
    
    db.run(`
      INSERT INTO joban_message_logs (customer_id, customer_name, customer_mobile, message_type, channel, message_content, status, source, client_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [customer_id, customer_name, customer_mobile, message_type || 'notification', channel || 'whatsapp', message_content, status || 'sent', 'dashboard', 'joban'], function(err) {
      if (err) {
        console.error('Joban message log error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, id: this.lastID, client: 'Joban', source: 'dashboard' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get KMG message logs
router.get('/kmg/messages', async (req, res) => {
  try {
    const { limit = 100, source } = req.query;
    
    let query = 'SELECT * FROM kmg_message_logs';
    let params = [];
    
    if (source) {
      query += ' WHERE source = ?';
      params.push(source);
    }
    
    query += ' ORDER BY sent_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ messages: rows, client: 'KMG', source: source || 'all' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Joban message logs
router.get('/joban/messages', async (req, res) => {
  try {
    const { limit = 100, source } = req.query;
    
    let query = 'SELECT * FROM joban_message_logs';
    let params = [];
    
    if (source) {
      query += ' WHERE source = ?';
      params.push(source);
    }
    
    query += ' ORDER BY sent_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ messages: rows, client: 'Joban', source: source || 'all' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
