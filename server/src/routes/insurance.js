const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');
const insuranceSync = require('../services/insuranceSync');
const insuranceMessaging = require('../services/insuranceMessaging');
const router = express.Router();

const db = getDatabase();

// Get all insurance customers
router.get('/customers', authRequired, (req, res) => {
  try {
    const { search, status, vertical } = req.query;
    let query = 'SELECT * FROM insurance_customers WHERE user_id = ?';
    const params = [req.user.id];

    if (search) {
      query += ' AND (name LIKE ? OR mobile_number LIKE ? OR registration_no LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (vertical && vertical !== 'all') {
      query += ' AND vertical = ?';
      params.push(vertical);
    }

    query += ' ORDER BY renewal_date ASC';

    db.all(query, params, (err, customers) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(customers);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new insurance customer
router.post('/customers', authRequired, (req, res) => {
  try {
    const { name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical, product, registration_no, current_policy_no, company, status, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent } = req.body;
    
    if (!name || !mobile_number) {
      return res.status(400).json({ error: 'Name and mobile number are required' });
    }
    
    db.run(`
      INSERT INTO insurance_customers (user_id, name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical, product, registration_no, current_policy_no, company, status, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [req.user.id, name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical || 'motor', product, registration_no, current_policy_no, company, status || 'pending', new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT * FROM insurance_customers WHERE id = ?', [this.lastID], (err, customer) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(customer);
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update insurance customer
router.put('/customers/:id', authRequired, (req, res) => {
  try {
    const { name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical, product, registration_no, current_policy_no, company, status, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent } = req.body;
    
    db.run(`
      UPDATE insurance_customers 
      SET name = ?, mobile_number = ?, insurance_activated_date = ?, renewal_date = ?, od_expiry_date = ?, tp_expiry_date = ?, premium_mode = ?, premium = ?, last_year_premium = ?, vertical = ?, product = ?, registration_no = ?, current_policy_no = ?, company = ?, status = ?, new_policy_no = ?, new_company = ?, policy_doc_link = ?, thank_you_sent = ?, reason = ?, email = ?, cheque_hold = ?, payment_date = ?, cheque_no = ?, cheque_bounce = ?, owner_alert_sent = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical || 'motor', product, registration_no, current_policy_no, company, status, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent, req.params.id, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT * FROM insurance_customers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, customer) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(customer);
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete insurance customer
router.delete('/customers/:id', authRequired, (req, res) => {
  try {
    db.run('DELETE FROM insurance_customers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Customer deleted successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook endpoint for n8n to log sent messages (no auth required for webhook)
router.post('/messages/webhook', async (req, res) => {
  try {
    const { user_id, customer_id, message_type, channel, status, message_content } = req.body;
    
    if (!user_id || !customer_id) {
      return res.status(400).json({ error: 'user_id and customer_id are required' });
    }

    db.run(`
      INSERT INTO insurance_messages (user_id, customer_id, message_type, sent_date, status, email_content)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
    `, [user_id, customer_id, message_type || 'notification', status || 'sent', message_content], function(err) {
      if (err) {
        console.error('Failed to log message:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message_id: this.lastID });
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auto-cleanup old messages (30+ days)
// const cleanupOldMessages = () => {
//   db.run(`DELETE FROM message_logs WHERE sent_at < datetime('now', '-30 days')`, (err) => {
//     if (err) console.error('Failed to cleanup old messages:', err);
//     else console.log('Old messages cleaned up');
//   });
//   db.run(`DELETE FROM renewal_reminders WHERE sent_at < datetime('now', '-30 days')`, (err) => {
//     if (err) console.error('Failed to cleanup old reminders:', err);
//     else console.log('Old reminders cleaned up');
//   });
// };

// // Run cleanup daily
// setInterval(cleanupOldMessages, 24 * 60 * 60 * 1000);
// cleanupOldMessages(); // Run on startup

// Get all message logs
router.get('/message-logs', authRequired, (req, res) => {
  try {
    const { channel, status, limit } = req.query;
    let query = `
      SELECT 
        ml.id,
        ml.customer_id,
        COALESCE(ic.name, ml.customer_name_fallback, 'Unknown Customer') as customer_name,
        ml.message_type,
        ml.channel,
        ml.message_content,
        ml.status,
        ml.sent_at
      FROM message_logs ml
      LEFT JOIN insurance_customers ic ON ml.customer_id = ic.id
      WHERE (ic.user_id = ? OR ml.customer_id IS NULL)
    `;
    const params = [req.user.id];
    
    if (channel) {
      query += ' AND ml.channel = ?';
      params.push(channel);
    }
    
    if (status) {
      query += ' AND ml.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY ml.sent_at DESC';
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }
    
    db.all(query, params, (err, messages) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(messages);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get message history
router.get('/messages', authRequired, (req, res) => {
  try {
    db.all(`
      SELECT im.*, ic.name as customer_name, ic.mobile_number 
      FROM insurance_messages im
      JOIN insurance_customers ic ON im.customer_id = ic.id
      WHERE im.user_id = ?
      ORDER BY im.created_at DESC
    `, [req.user.id], (err, messages) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(messages);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync from Google Sheets
router.post('/sync/from-sheet', authRequired, async (req, res) => {
  try {
    const { get } = require('../db/connection');
    
    // Get user's email
    const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Determine spreadsheet ID and tab based on email
    let spreadsheetId, tabName;
    const email = user.email.toLowerCase();
    
    if (email.includes('joban')) {
      // Joban Putra Insurance
      spreadsheetId = '1oX5MGRMo6oz87ivTXeMOy6vtIDPJXXawz_lGqmOvUEo';
      tabName = 'Sheet1';
    } else {
      // KMG Insurance (default)
      spreadsheetId = '1EpMAg1gSXPKr83cTugvGexrqv3Yt5Tb85Re2Shah8mw';
      tabName = 'updating_input';
    }

    console.log('Syncing from sheet - User:', req.user.id, 'Email:', email, 'Sheet:', spreadsheetId, 'Tab:', tabName);
    const result = await insuranceSync.syncFromSheet(req.user.id, spreadsheetId, tabName);
    res.json(result);
  } catch (error) {
    console.error('Sync from sheet error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync to Google Sheets
router.post('/sync/to-sheet', authRequired, async (req, res) => {
  try {
    const { get } = require('../db/connection');
    
    // Get user's email
    const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Determine spreadsheet ID and tab based on email
    let spreadsheetId, tabName;
    const email = user.email.toLowerCase();
    
    if (email.includes('joban')) {
      // Joban Putra Insurance
      spreadsheetId = '1oX5MGRMo6oz87ivTXeMOy6vtIDPJXXawz_lGqmOvUEo';
      tabName = 'Sheet1';
    } else {
      // KMG Insurance (default)
      spreadsheetId = '1EpMAg1gSXPKr83cTugvGexrqv3Yt5Tb85Re2Shah8mw';
      tabName = 'updating_input';
    }

    console.log('Syncing to sheet - User:', req.user.id, 'Email:', email, 'Sheet:', spreadsheetId, 'Tab:', tabName);
    const result = await insuranceSync.syncToSheet(req.user.id, spreadsheetId, tabName);
    console.log('Sync result:', result);
    res.json(result);
  } catch (error) {
    console.error('Sync to sheet error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Schedule reminders
router.post('/messages/schedule', authRequired, async (req, res) => {
  try {
    const result = await insuranceMessaging.scheduleReminders(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send pending messages
router.post('/messages/send', authRequired, async (req, res) => {
  try {
    const result = await insuranceMessaging.sendPendingMessages(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clean up duplicate customers
router.post('/customers/cleanup-duplicates', authRequired, (req, res) => {
  try {
    db.run(`
      DELETE FROM insurance_customers 
      WHERE user_id = ? AND id NOT IN (
        SELECT MIN(id) 
        FROM insurance_customers 
        WHERE user_id = ? 
        GROUP BY name, mobile_number
      )
    `, [req.user.id, req.user.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Duplicates cleaned up', deletedCount: this.changes });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log message from n8n (with client validation)
router.post('/log-message', async (req, res) => {
  try {
    let { customer_id, customer_name, mobile, message_type, channel, message_content, status, sent_at, client_key } = req.body;
    
    if (!channel) {
      return res.status(400).json({ error: 'Channel is required' });
    }
    
    // If customer_id not provided, try to find by name and mobile
    if (!customer_id && (customer_name || mobile)) {
      const customer = await new Promise((resolve, reject) => {
        let query = 'SELECT id FROM insurance_customers WHERE 1=1';
        const params = [];
        
        if (customer_name) {
          query += ' AND LOWER(TRIM(name)) = LOWER(TRIM(?))';
          params.push(customer_name);
        }
        if (mobile) {
          query += ' AND REPLACE(REPLACE(REPLACE(mobile_number, " ", ""), "-", ""), "+", "") = REPLACE(REPLACE(REPLACE(?, " ", ""), "-", ""), "+", "")';
          params.push(mobile);
        }
        query += ' LIMIT 1';
        
        db.get(query, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (customer) {
        customer_id = customer.id;
        console.log(`Found customer_id ${customer_id} for name: ${customer_name}, mobile: ${mobile}`);
      } else {
        console.log(`Customer not found for name: ${customer_name}, mobile: ${mobile}`);
      }
    }
    
    // Validate customer belongs to correct client if customer_id provided
    if (customer_id && client_key) {
      const customer = await new Promise((resolve, reject) => {
        db.get('SELECT ic.id, u.email FROM insurance_customers ic JOIN users u ON ic.user_id = u.id WHERE ic.id = ?', [customer_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (customer) {
        const { getClientConfig } = require('../config/insuranceClients');
        const config = getClientConfig(customer.email);
        if (config.key !== client_key) {
          console.log(`Webhook rejected: Customer ${customer_id} belongs to ${config.key}, but webhook is for ${client_key}`);
          return res.status(400).json({ error: 'Customer does not belong to this client' });
        }
      }
    }
    
    db.run(`
      INSERT INTO message_logs (customer_id, message_type, channel, message_content, status, sent_at, customer_name_fallback)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [customer_id || null, message_type || 'general', channel, message_content || '', status || 'sent', sent_at || new Date().toISOString(), customer_name || null], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log reminder from n8n (with client validation)
router.post('/log-reminder', async (req, res) => {
  try {
    const { customer_id, reminder_type, sent_via, sent_at, client_key } = req.body;
    
    if (!customer_id || !reminder_type || !sent_via) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate customer belongs to correct client
    if (client_key) {
      const customer = await new Promise((resolve, reject) => {
        db.get('SELECT ic.id, u.email FROM insurance_customers ic JOIN users u ON ic.user_id = u.id WHERE ic.id = ?', [customer_id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (customer) {
        const { getClientConfig } = require('../config/insuranceClients');
        const config = getClientConfig(customer.email);
        if (config.key !== client_key) {
          console.log(`Reminder webhook rejected: Customer ${customer_id} belongs to ${config.key}, but webhook is for ${client_key}`);
          return res.status(400).json({ error: 'Customer does not belong to this client' });
        }
      }
    }
    
    db.run(`
      INSERT INTO renewal_reminders (customer_id, reminder_type, sent_via, sent_at)
      VALUES (?, ?, ?, ?)
    `, [customer_id, reminder_type, sent_via, sent_at || new Date().toISOString()], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add customer note
router.post('/customers/:id/notes', authRequired, async (req, res) => {
  try {
    const { note } = req.body;
    
    if (!note) {
      return res.status(400).json({ error: 'Note is required' });
    }
    
    // Get existing notes
    db.get('SELECT notes FROM insurance_customers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], async (err, customer) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!customer) return res.status(404).json({ error: 'Customer not found' });
      
      const timestamp = new Date().toLocaleString();
      const newNote = `[${timestamp}] ${note}`;
      const updatedNotes = customer.notes ? `${customer.notes}\n${newNote}` : newNote;
      
      db.run(`
        UPDATE insurance_customers 
        SET notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `, [updatedNotes, req.params.id, req.user.id], async function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        // Auto-sync to sheet after adding note
        try {
          const { getClientConfig } = require('../config/insuranceClients');
          const user = await new Promise((resolve, reject) => {
            db.get('SELECT email FROM users WHERE id = ?', [req.user.id], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });
          const clientConfig = getClientConfig(user?.email);
          await insuranceSync.syncToSheet(req.user.id, clientConfig.spreadsheetId, clientConfig.tabName);
          console.log('Note added and synced to sheet');
        } catch (syncErr) {
          console.error('Failed to sync note to sheet:', syncErr);
        }
        
        res.json({ success: true });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer notes and reminders
router.get('/customers/:id/history', authRequired, (req, res) => {
  try {
    db.all(`
      SELECT 'note' as type, note as content, created_at, created_by
      FROM customer_notes
      WHERE customer_id = ?
      UNION ALL
      SELECT 'reminder' as type, reminder_type || ' via ' || sent_via as content, sent_at as created_at, NULL as created_by
      FROM renewal_reminders
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `, [req.params.id, req.params.id], (err, history) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(history);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get renewal statistics
router.get('/renewal-stats', authRequired, (req, res) => {
  try {
    db.get(`
      SELECT 
        COUNT(CASE WHEN sent_at >= date('now') THEN 1 END) as reminders_today,
        COUNT(DISTINCT customer_id) as customers_reminded
      FROM renewal_reminders
      WHERE customer_id IN (SELECT id FROM insurance_customers WHERE user_id = ?)
    `, [req.user.id], (err, stats) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(stats || { reminders_today: 0, customers_reminded: 0 });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk mark as renewed
router.post('/customers/bulk-renew', authRequired, (req, res) => {
  try {
    const { customer_ids } = req.body;
    
    if (!customer_ids || !Array.isArray(customer_ids)) {
      return res.status(400).json({ error: 'customer_ids array is required' });
    }
    
    const placeholders = customer_ids.map(() => '?').join(',');
    db.run(`
      UPDATE insurance_customers
      SET status = 'done', updated_at = CURRENT_TIMESTAMP
      WHERE id IN (${placeholders}) AND user_id = ?
    `, [...customer_ids, req.user.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, updated: this.changes });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all claims
router.get('/claims', authRequired, (req, res) => {
  try {
    db.all(`
      SELECT c.*, ic.name as customer_name, ic.mobile_number
      FROM insurance_claims c
      JOIN insurance_customers ic ON c.customer_id = ic.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `, [req.user.id], (err, claims) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(claims);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new claim
router.post('/claims', authRequired, (req, res) => {
  try {
    const { customer_id, policy_number, insurance_company, vehicle_number, claim_type, incident_date, description, claim_amount } = req.body;
    
    if (!customer_id) {
      return res.status(400).json({ error: 'Customer is required' });
    }
    
    db.run(`
      INSERT INTO insurance_claims (user_id, customer_id, policy_number, insurance_company, vehicle_number, claim_type, incident_date, description, claim_amount, claim_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'filed')
    `, [req.user.id, customer_id, policy_number, insurance_company, vehicle_number, claim_type, incident_date, description, claim_amount], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT * FROM insurance_claims WHERE id = ?', [this.lastID], (err, claim) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(claim);
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update claim status
router.patch('/claims/:id/status', authRequired, (req, res) => {
  try {
    const { claim_status, notes } = req.body;
    
    // Get old status first
    db.get('SELECT claim_status FROM insurance_claims WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, oldClaim) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!oldClaim) return res.status(404).json({ error: 'Claim not found' });
      
      // Update claim status
      db.run(`
        UPDATE insurance_claims 
        SET claim_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `, [claim_status, req.params.id, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Log status change
        db.run(`
          INSERT INTO claim_status_history (claim_id, old_status, new_status, notes)
          VALUES (?, ?, ?, ?)
        `, [req.params.id, oldClaim.claim_status, claim_status, notes], (err) => {
          if (err) console.error('Failed to log status change:', err);
          
          db.get('SELECT * FROM insurance_claims WHERE id = ?', [req.params.id], (err, claim) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(claim);
          });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update claim
router.put('/claims/:id', authRequired, (req, res) => {
  try {
    const { policy_number, insurance_company, vehicle_number, claim_type, incident_date, description, claim_amount } = req.body;
    
    db.run(`
      UPDATE insurance_claims 
      SET policy_number = ?, insurance_company = ?, vehicle_number = ?, claim_type = ?, incident_date = ?, description = ?, claim_amount = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [policy_number, insurance_company, vehicle_number, claim_type, incident_date, description, claim_amount, req.params.id, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT * FROM insurance_claims WHERE id = ?', [req.params.id], (err, claim) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(claim);
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete claim
router.delete('/claims/:id', authRequired, (req, res) => {
  try {
    db.run('DELETE FROM insurance_claims WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Claim deleted successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get claim status history
router.get('/claims/:id/history', authRequired, (req, res) => {
  try {
    db.all(`
      SELECT * FROM claim_status_history
      WHERE claim_id = ?
      ORDER BY changed_at DESC
    `, [req.params.id], (err, history) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(history);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send claim update notification
router.post('/claims/:id/notify', authRequired, async (req, res) => {
  try {
    const { channel } = req.body; // 'whatsapp', 'sms', 'email'
    
    db.get(`
      SELECT c.*, ic.name, ic.mobile_number, ic.email
      FROM insurance_claims c
      JOIN insurance_customers ic ON c.customer_id = ic.id
      WHERE c.id = ? AND c.user_id = ?
    `, [req.params.id, req.user.id], (err, claim) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!claim) return res.status(404).json({ error: 'Claim not found' });
      
      const message = `Your claim for ${claim.vehicle_number} is moved to '${claim.claim_status.replace('_', ' ')}'. We will update you soon.`;
      
      // TODO: Integrate with n8n webhook for actual sending
      console.log(`Sending ${channel} to ${claim.name}: ${message}`);
      
      res.json({ success: true, message: 'Notification sent' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reports data
router.get('/reports', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const { vertical } = req.query;
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];
    
    if (vertical && vertical !== 'all') {
      whereClause += ' AND vertical = ?';
      params.push(vertical);
    }

    // Renewal Performance
    const expiringThisMonth = await new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count FROM insurance_customers ${whereClause} 
        AND renewal_date IS NOT NULL 
        AND renewal_date != '' 
        AND length(renewal_date) = 10
        AND substr(renewal_date, 4, 2) = strftime('%m', 'now') 
        AND substr(renewal_date, 7, 4) = strftime('%Y', 'now')
      `, params, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    const renewedSoFar = await new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count FROM insurance_customers ${whereClause} 
        AND LOWER(TRIM(status)) = 'done' 
        AND renewal_date IS NOT NULL 
        AND renewal_date != '' 
        AND length(renewal_date) = 10
        AND substr(renewal_date, 4, 2) = strftime('%m', 'now') 
        AND substr(renewal_date, 7, 4) = strftime('%Y', 'now')
      `, params, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    const pendingRenewals = await new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count FROM insurance_customers ${whereClause} 
        AND LOWER(TRIM(status)) = 'pending' 
        AND renewal_date IS NOT NULL 
        AND renewal_date != '' 
        AND length(renewal_date) = 10
        AND date(substr(renewal_date, 7, 4) || '-' || substr(renewal_date, 4, 2) || '-' || substr(renewal_date, 1, 2)) >= date('now')
      `, params, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    const expiredWithoutRenewal = await new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count FROM insurance_customers ${whereClause} 
        AND LOWER(TRIM(status)) IN ('pending', 'lost') 
        AND renewal_date IS NOT NULL 
        AND renewal_date != '' 
        AND length(renewal_date) = 10
        AND date(substr(renewal_date, 7, 4) || '-' || substr(renewal_date, 4, 2) || '-' || substr(renewal_date, 1, 2)) < date('now')
      `, params, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    const conversionRate = expiringThisMonth > 0 ? Math.round((renewedSoFar / expiringThisMonth) * 100) : 0;

    const monthlyTrend = await new Promise((resolve, reject) => {
      db.all(`
        SELECT substr(renewal_date, 4, 2) as month, substr(renewal_date, 7, 4) as year, COUNT(*) as count
        FROM insurance_customers ${whereClause} 
        AND LOWER(TRIM(status)) = 'done'
        AND renewal_date IS NOT NULL 
        AND renewal_date != '' 
        AND length(renewal_date) = 10
        GROUP BY year, month
        ORDER BY year DESC, month DESC
        LIMIT 6
      `, params, (err, rows) => {
        if (err) reject(err);
        else {
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const trend = (rows || []).reverse().map(r => ({
            month: months[parseInt(r.month) - 1],
            count: r.count
          }));
          resolve(trend.length ? trend : [{ month: 'Current', count: 0 }]);
        }
      });
    });

    const renewalCustomers = await new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM insurance_customers ${whereClause} 
        AND renewal_date IS NOT NULL 
        AND renewal_date != '' 
        AND length(renewal_date) = 10
        AND substr(renewal_date, 4, 2) = strftime('%m', 'now') 
        AND substr(renewal_date, 7, 4) = strftime('%Y', 'now') 
        ORDER BY renewal_date
      `, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Premium Collection
    const collectedThisMonth = await new Promise((resolve, reject) => {
      db.get(`
        SELECT SUM(premium) as total FROM insurance_customers ${whereClause} 
        AND LOWER(TRIM(status)) = 'done' 
        AND renewal_date IS NOT NULL 
        AND renewal_date != '' 
        AND length(renewal_date) = 10
        AND substr(renewal_date, 4, 2) = strftime('%m', 'now') 
        AND substr(renewal_date, 7, 4) = strftime('%Y', 'now')
      `, params, (err, row) => {
        if (err) reject(err);
        else resolve(row?.total || 0);
      });
    });

    const collectedThisYear = await new Promise((resolve, reject) => {
      db.get(`
        SELECT SUM(premium) as total FROM insurance_customers ${whereClause} 
        AND LOWER(TRIM(status)) = 'done' 
        AND renewal_date IS NOT NULL 
        AND renewal_date != '' 
        AND length(renewal_date) = 10
        AND substr(renewal_date, 7, 4) = strftime('%Y', 'now')
      `, params, (err, row) => {
        if (err) reject(err);
        else resolve(row?.total || 0);
      });
    });

    const highestCustomer = await new Promise((resolve, reject) => {
      db.get(`SELECT name, premium FROM insurance_customers ${whereClause} ORDER BY premium DESC LIMIT 1`, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || { name: 'N/A', premium: 0 });
      });
    });

    const highestCompany = await new Promise((resolve, reject) => {
      db.get(`SELECT company as name, SUM(premium) as premium FROM insurance_customers ${whereClause} GROUP BY company ORDER BY premium DESC LIMIT 1`, params, (err, row) => {
        if (err) reject(err);
        else resolve(row || { name: 'N/A', premium: 0 });
      });
    });

    const monthlyPremium = await new Promise((resolve, reject) => {
      db.all(`
        SELECT substr(renewal_date, 4, 2) as month, substr(renewal_date, 7, 4) as year, SUM(premium) as amount
        FROM insurance_customers ${whereClause} 
        AND LOWER(TRIM(status)) = 'done'
        AND renewal_date IS NOT NULL 
        AND renewal_date != '' 
        AND length(renewal_date) = 10
        GROUP BY year, month
        ORDER BY year DESC, month DESC
        LIMIT 6
      `, params, (err, rows) => {
        if (err) reject(err);
        else {
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const trend = (rows || []).reverse().map(r => ({
            month: months[parseInt(r.month) - 1],
            amount: r.amount
          }));
          resolve(trend.length ? trend : [{ month: 'Current', amount: 0 }]);
        }
      });
    });

    const byCompany = await new Promise((resolve, reject) => {
      db.all(`
        SELECT company, SUM(premium) as amount 
        FROM insurance_customers ${whereClause} 
        AND LOWER(TRIM(status)) = 'done'
        GROUP BY company 
        ORDER BY amount DESC
      `, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    const premiumCustomers = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM insurance_customers ${whereClause} ORDER BY premium DESC LIMIT 20`, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Customer Growth
    const newThisMonth = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM insurance_customers ${whereClause} AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`, params, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    const totalActive = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM insurance_customers ${whereClause} AND LOWER(TRIM(status)) = 'done'`, params, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    const totalInactive = await new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count FROM insurance_customers ${whereClause} 
        AND LOWER(TRIM(status)) IN ('pending', 'lost') 
        AND renewal_date IS NOT NULL 
        AND renewal_date != '' 
        AND length(renewal_date) = 10
        AND date(substr(renewal_date, 7, 4) || '-' || substr(renewal_date, 4, 2) || '-' || substr(renewal_date, 1, 2)) < date('now')
      `, params, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    const totalCustomers = totalActive + totalInactive;
    const retentionRate = totalCustomers > 0 ? Math.round((totalActive / totalCustomers) * 100) : 0;

    const growthTrend = await new Promise((resolve, reject) => {
      db.all(`
        SELECT strftime('%m', created_at) as month, strftime('%Y', created_at) as year, COUNT(*) as count
        FROM insurance_customers ${whereClause}
        GROUP BY year, month
        ORDER BY year DESC, month DESC
        LIMIT 6
      `, params, (err, rows) => {
        if (err) reject(err);
        else {
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const trend = (rows || []).reverse().map(r => ({
            month: months[parseInt(r.month) - 1],
            count: r.count
          }));
          resolve(trend.length ? trend : [{ month: 'Current', count: 0 }]);
        }
      });
    });

    const growthCustomers = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM insurance_customers ${whereClause} ORDER BY created_at DESC LIMIT 20`, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Claims Summary
    const claimsWhereClause = (vertical && vertical !== 'all') ? `WHERE c.user_id = ? AND ic.vertical = ?` : `WHERE c.user_id = ?`;
    const claimsParams = (vertical && vertical !== 'all') ? [userId, vertical] : [userId];
    
    const totalFiled = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM insurance_claims c JOIN insurance_customers ic ON c.customer_id = ic.id ${claimsWhereClause}`, claimsParams, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    const approved = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM insurance_claims c JOIN insurance_customers ic ON c.customer_id = ic.id ${claimsWhereClause} AND c.claim_status = 'approved'`, claimsParams, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    const rejected = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM insurance_claims c JOIN insurance_customers ic ON c.customer_id = ic.id ${claimsWhereClause} AND c.claim_status = 'rejected'`, claimsParams, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    const inProgress = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM insurance_claims c JOIN insurance_customers ic ON c.customer_id = ic.id ${claimsWhereClause} AND c.claim_status IN ('filed','survey_done','in_progress')`, claimsParams, (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    const byInsurer = await new Promise((resolve, reject) => {
      db.all(`SELECT c.insurance_company as company, COUNT(*) as count FROM insurance_claims c JOIN insurance_customers ic ON c.customer_id = ic.id ${claimsWhereClause} GROUP BY c.insurance_company ORDER BY count DESC`, claimsParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    const byType = await new Promise((resolve, reject) => {
      db.all(`SELECT c.claim_type as type, COUNT(*) as count FROM insurance_claims c JOIN insurance_customers ic ON c.customer_id = ic.id ${claimsWhereClause} GROUP BY c.claim_type ORDER BY count DESC`, claimsParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    const claims = await new Promise((resolve, reject) => {
      db.all(`
        SELECT c.*, ic.name as customer_name
        FROM insurance_claims c
        JOIN insurance_customers ic ON c.customer_id = ic.id
        ${claimsWhereClause}
        ORDER BY c.created_at DESC
      `, claimsParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json({
      renewalPerformance: {
        expiringThisMonth,
        renewedSoFar,
        pendingRenewals,
        expiredWithoutRenewal,
        conversionRate,
        monthlyTrend,
        customers: renewalCustomers
      },
      premiumCollection: {
        collectedThisMonth,
        collectedThisYear,
        highestCustomer,
        highestCompany,
        monthlyPremium,
        byCompany,
        customers: premiumCustomers
      },
      customerGrowth: {
        newThisMonth,
        totalActive,
        totalInactive,
        retentionRate,
        growthTrend,
        customers: growthCustomers
      },
      claimsSummary: {
        totalFiled,
        approved,
        rejected,
        inProgress,
        avgSettlementDays: 15,
        byInsurer,
        byType,
        claims
      }
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get analytics
router.get('/analytics', authRequired, (req, res) => {
  try {
    const { vertical } = req.query;
    let whereClause = 'WHERE user_id = ?';
    const params = [req.user.id];
    
    if (vertical && vertical !== 'all') {
      whereClause += ' AND vertical = ?';
      params.push(vertical);
    }
    
    db.get(`SELECT COUNT(*) as count FROM insurance_customers ${whereClause}`, params, (err, totalCustomers) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get(`
        SELECT COUNT(*) as count FROM insurance_customers 
        ${whereClause} AND renewal_date BETWEEN date('now') AND date('now', '+30 days')
      `, params, (err, upcomingRenewals) => {
        if (err) return res.status(500).json({ error: err.message });
        
        res.json({
          totalCustomers: totalCustomers.count || 0,
          upcomingRenewals: upcomingRenewals.count || 0,
          messagesSent: 0,
          totalSpent: 0
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;