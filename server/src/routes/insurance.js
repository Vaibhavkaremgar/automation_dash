const express = require('express');
const { authRequired } = require('../middleware/auth');
const { apiKeyAuth } = require('../middleware/apiKeyAuth');
const { getDatabase } = require('../db/connection');
const insuranceSync = require('../services/insuranceSync');
const insuranceMessaging = require('../services/insuranceMessaging');
const claimsSync = require('../services/claimsSync');
const { activityLogger } = require('../middleware/activityLogger');
const { enforceDataIsolation, validateCustomerOwnership, validateClaimOwnership } = require('../middleware/dataIsolation');
const router = express.Router();

const db = getDatabase();

// Apply data isolation to all insurance routes
router.use(authRequired, enforceDataIsolation);

// Search customers across all verticals
router.get('/customers/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json([]);
    }
    
    const searchTerm = `%${q}%`;
    db.all(`
      SELECT * FROM insurance_customers 
      WHERE user_id = ? 
      AND (name LIKE ? OR mobile_number LIKE ? OR registration_no LIKE ? OR g_code LIKE ? OR company LIKE ? OR current_policy_no LIKE ? OR email LIKE ?)
      ORDER BY name ASC
      LIMIT 50
    `, [req.user.id, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm], (err, customers) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(customers || []);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all insurance customers
router.get('/customers', (req, res) => {
  try {
    const { search, status, vertical, veh_type } = req.query;
    
    let query = 'SELECT * FROM insurance_customers WHERE user_id = ?';
    const params = [req.user.id];

    if (search) {
      query += ' AND (name LIKE ? OR mobile_number LIKE ? OR registration_no LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status) {
      query += ' AND LOWER(TRIM(status)) = ?';
      params.push(status.toLowerCase().trim());
    }

    if (vertical && vertical !== 'all') {
      if (vertical === 'general' || vertical === 'general-all') {
        query += ' AND LOWER(vertical) IN (?, ?, ?)';
        params.push('motor', 'health', 'non-motor');
      } else if (vertical === 'motor-all') {
        query += ' AND LOWER(vertical) = ?';
        params.push('motor');
      } else if (vertical === 'motor') {
        query += ' AND LOWER(vertical) = ?';
        params.push('motor');
      } else if (vertical === '2-wheeler') {
        query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('motor', '%2%');
      } else if (vertical === '4-wheeler') {
        query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('motor', '%4%');
      } else if (vertical === 'health-all') {
        query += ' AND LOWER(vertical) = ?';
        params.push('health');
      } else if (vertical === 'health') {
        query += ' AND LOWER(vertical) = ?';
        params.push('health');
      } else if (vertical === 'health-base') {
        query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%base%');
      } else if (vertical === 'health-topup') {
        query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%topup%');
      } else if (vertical === 'health-ghi') {
        query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%ghi%');
      } else if (vertical === 'health-gpa') {
        query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%gpa%');
      } else if (vertical === 'health-pa') {
        query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%pa%');
      } else if (vertical === 'health-others') {
        query += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ?';
        params.push('health', '%base%', '%topup%', '%ghi%', '%gpa%', '%pa%');
      } else if (vertical === 'non-motor-all') {
        query += ' AND LOWER(vertical) = ?';
        params.push('non-motor');
      } else if (vertical === 'non-motor') {
        query += ' AND LOWER(vertical) = ?';
        params.push('non-motor');
      } else if (vertical === 'marine') {
        query += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
        params.push('non-motor', 'marine');
      } else if (vertical === 'fire') {
        query += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
        params.push('non-motor', 'fire');
      } else if (vertical === 'burglary') {
        query += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
        params.push('non-motor', 'burglary');
      } else if (vertical === 'non-motor-others') {
        query += ' AND LOWER(vertical) = ? AND LOWER(product_type) NOT IN (?, ?, ?)';
        params.push('non-motor', 'marine', 'fire', 'burglary');
      } else if (vertical === 'life') {
        query += ' AND LOWER(vertical) = ?';
        params.push('life');
      } else {
        query += ' AND LOWER(vertical) = ?';
        params.push(vertical.toLowerCase());
      }
    }

    query += ' ORDER BY name ASC';

    db.all(query, params, (err, customers) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(customers);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check for duplicate customer
router.post('/customers/check-duplicate', (req, res) => {
  try {
    const { name, mobile_number, current_policy_no, customer_id, vertical, product_type } = req.body;
    
    // Get all customers for this user to calculate similarity
    db.all('SELECT * FROM insurance_customers WHERE user_id = ?', [req.user.id], (err, customers) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (!customers || customers.length === 0) {
        return res.json({ isDuplicate: false });
      }
      
      // Calculate similarity for each customer
      const similarities = customers.map(existing => {
        let matchCount = 0;
        let totalFields = 0;
        const matches = [];
        
        // Check name (case-insensitive)
        if (name && existing.name) {
          totalFields++;
          if (name.toLowerCase().trim() === existing.name.toLowerCase().trim()) {
            matchCount++;
            matches.push('name');
          }
        }
        
        // Check mobile number
        if (mobile_number && existing.mobile_number) {
          totalFields++;
          if (mobile_number.trim() === existing.mobile_number.trim()) {
            matchCount++;
            matches.push('mobile_number');
          }
        }
        
        // Check policy number
        if (current_policy_no && existing.current_policy_no) {
          totalFields++;
          if (current_policy_no.trim() === existing.current_policy_no.trim()) {
            matchCount++;
            matches.push('current_policy_no');
          }
        }
        
        // Check customer ID
        if (customer_id && existing.customer_id) {
          totalFields++;
          if (customer_id.trim() === existing.customer_id.trim()) {
            matchCount++;
            matches.push('customer_id');
          }
        }
        
        // Check TYPE (vertical)
        if (vertical && existing.vertical) {
          totalFields++;
          if (vertical.toLowerCase().trim() === existing.vertical.toLowerCase().trim()) {
            matchCount++;
            matches.push('vertical');
          }
        }
        
        // Check Product Type
        if (product_type && existing.product_type) {
          totalFields++;
          if (product_type.toLowerCase().trim() === existing.product_type.toLowerCase().trim()) {
            matchCount++;
            matches.push('product_type');
          }
        }
        
        const similarityPercent = totalFields > 0 ? (matchCount / totalFields) * 100 : 0;
        
        return {
          customer: existing,
          similarityPercent,
          matchCount,
          totalFields,
          matches
        };
      });
      
      // Find customers with 60-70% or higher similarity
      const potentialDuplicates = similarities.filter(s => s.similarityPercent >= 60);
      
      if (potentialDuplicates.length > 0) {
        // Return the highest match
        const bestMatch = potentialDuplicates.sort((a, b) => b.similarityPercent - a.similarityPercent)[0];
        
        res.json({
          isDuplicate: true,
          similarityPercent: Math.round(bestMatch.similarityPercent),
          existing: bestMatch.customer,
          matchedFields: bestMatch.matches,
          matchCount: bestMatch.matchCount,
          totalFields: bestMatch.totalFields
        });
      } else {
        res.json({ isDuplicate: false });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new insurance customer
router.post('/customers', activityLogger, (req, res) => {
  try {
    const { name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical, product, registration_no, current_policy_no, company, status, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent, product_type, product_model, notes, modified_expiry_date, bank_name, customer_id, agent_code, pancard, aadhar_card, others_doc, g_code } = req.body;
    
    if (!name || !mobile_number) {
      return res.status(400).json({ error: 'Name and mobile number are required' });
    }
    
    // Convert STATUS and TYPE to uppercase to match sheet format
    const upperStatus = status ? status.toUpperCase() : 'DUE';
    const upperProduct = product ? product.toUpperCase() : product;
    
    db.run(`
      INSERT INTO insurance_customers (user_id, name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical, product, registration_no, current_policy_no, company, status, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent, product_type, product_model, notes, modified_expiry_date, bank_name, customer_id, agent_code, pancard, aadhar_card, others_doc, g_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [req.user.id, name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical || 'motor', upperProduct, registration_no, current_policy_no, company, upperStatus, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent, product_type, product_model, notes, modified_expiry_date, bank_name, customer_id, agent_code, pancard, aadhar_card, others_doc, g_code], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT * FROM insurance_customers WHERE id = ?', [this.lastID], (err, customer) => {
        if (err) return res.status(500).json({ error: err.message });
        req.logActivity('customer_add', `Added customer: ${name}`);
        res.status(201).json(customer);
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update insurance customer
router.put('/customers/:id', activityLogger, async (req, res) => {
  try {
    const incidentMetrics = require('../utils/incidentMetrics');
    const { name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical, product, registration_no, current_policy_no, company, status, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent, product_type, product_model, notes, modified_expiry_date, bank_name, customer_id, agent_code, pancard, aadhar_card, others_doc, g_code, sheet_row_number, s_no } = req.body;
    
    // AUTO-HEAL: If ID doesn't exist, try to find by unique identifiers
    let targetId = req.params.id;
    const customerCheck = await new Promise((resolve) => {
      db.get('SELECT id FROM insurance_customers WHERE id = ? AND user_id = ?', [targetId, req.user.id], (err, row) => {
        resolve(row);
      });
    });
    
    if (!customerCheck) {
      console.log(`⚠️ Customer ID ${targetId} not found, attempting auto-heal...`);
      
      // Try to find by sheet_row_number (most reliable after sync)
      if (sheet_row_number) {
        const found = await new Promise((resolve) => {
          db.get('SELECT id FROM insurance_customers WHERE sheet_row_number = ? AND user_id = ?', [sheet_row_number, req.user.id], (err, row) => {
            resolve(row);
          });
        });
        if (found) {
          incidentMetrics.recordAutoHeal(targetId, found.id, 'PUT /customers/:id');
          targetId = found.id;
        }
      }
      
      // Fallback: Try by policy number or registration number
      if (!customerCheck && (current_policy_no || registration_no)) {
        let query = 'SELECT id FROM insurance_customers WHERE user_id = ? AND (';
        const params = [req.user.id];
        const conditions = [];
        
        if (current_policy_no) {
          conditions.push('current_policy_no = ?');
          params.push(current_policy_no);
        }
        if (registration_no) {
          conditions.push('registration_no = ?');
          params.push(registration_no);
        }
        
        query += conditions.join(' OR ') + ') LIMIT 1';
        
        const found = await new Promise((resolve) => {
          db.get(query, params, (err, row) => {
            resolve(row);
          });
        });
        
        if (found) {
          incidentMetrics.recordAutoHeal(targetId, found.id, 'PUT /customers/:id');
          targetId = found.id;
        }
      }
      
      // If still not found, return 404 with helpful message
      if (targetId === req.params.id) {
        incidentMetrics.recordTrue404(targetId, req.user.id, 'PUT /customers/:id');
        return res.status(404).json({ 
          error: 'Customer not found',
          hint: 'Customer ID may have changed after sync. Please refresh the page.',
          shouldRefresh: true
        });
      }
    }
    
    // Convert STATUS and TYPE to uppercase to match sheet format
    const upperStatus = status ? status.toUpperCase() : status;
    const upperProduct = product ? product.toUpperCase() : product;
    
    db.run(`
      UPDATE insurance_customers 
      SET name = ?, mobile_number = ?, insurance_activated_date = ?, renewal_date = ?, od_expiry_date = ?, tp_expiry_date = ?, premium_mode = ?, premium = ?, last_year_premium = ?, vertical = ?, product = ?, registration_no = ?, current_policy_no = ?, company = ?, status = ?, new_policy_no = ?, new_company = ?, policy_doc_link = ?, thank_you_sent = ?, reason = ?, email = ?, cheque_hold = ?, payment_date = ?, cheque_no = ?, cheque_bounce = ?, owner_alert_sent = ?, product_type = ?, product_model = ?, notes = ?, modified_expiry_date = ?, bank_name = ?, customer_id = ?, agent_code = ?, pancard = ?, aadhar_card = ?, others_doc = ?, g_code = ?, paid_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical || 'motor', upperProduct, registration_no, current_policy_no, company, upperStatus, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent, product_type, product_model, notes, modified_expiry_date, bank_name, customer_id, agent_code, pancard, aadhar_card, others_doc, g_code, req.body.paid_by, targetId, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT * FROM insurance_customers WHERE id = ? AND user_id = ?', [targetId, req.user.id], (err, customer) => {
        if (err) return res.status(500).json({ error: err.message });
        req.logActivity('customer_update', `Updated customer: ${name}`);
        
        // If ID changed, inform frontend
        if (targetId !== parseInt(req.params.id)) {
          customer._idChanged = true;
          customer._oldId = req.params.id;
          customer._newId = targetId;
        }
        
        res.json(customer);
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete insurance customer
router.delete('/customers/:id', activityLogger, async (req, res) => {
  try {
    const incidentMetrics = require('../utils/incidentMetrics');
    // Get customer data before deletion for sync purposes
    let customer = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM insurance_customers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    // AUTO-HEAL: Try to find by sheet_row_number if not found
    if (!customer && req.body.sheet_row_number) {
      customer = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM insurance_customers WHERE sheet_row_number = ? AND user_id = ?', [req.body.sheet_row_number, req.user.id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (customer) {
        incidentMetrics.recordAutoHeal(req.params.id, customer.id, 'DELETE /customers/:id');
      }
    }
    
    if (!customer) {
      incidentMetrics.recordTrue404(req.params.id, req.user.id, 'DELETE /customers/:id');
      return res.status(404).json({ 
        error: 'Customer not found',
        hint: 'Customer may have been deleted or ID changed after sync',
        shouldRefresh: true
      });
    }
    
    // Delete from database (use actual customer.id, not req.params.id)
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM insurance_customers WHERE id = ? AND user_id = ?', [customer.id, req.user.id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    req.logActivity('customer_delete', `Deleted customer: ${customer.name}`);
    
    // Return deleted customer data for sync
    res.json({ 
      message: 'Customer deleted successfully',
      deletedCustomer: customer
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



// Get all message logs - STRICT CLIENT ISOLATION
router.get('/message-logs', async (req, res) => {
  try {
    const { channel, status, limit } = req.query;
    const { get } = require('../db/connection');
    const { getClientConfig } = require('../config/insuranceClients');
    
    console.log(`📊 Fetching message logs for user ${req.user.id}`);
    
    // Get user's email to determine client_key
    const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const clientConfig = getClientConfig(user.email);
    const clientKey = clientConfig.key; // 'joban' or 'kmg'
    
    console.log(`🔑 Client key for user ${req.user.id}: ${clientKey}`);
    
    // CRITICAL: Use LEFT JOIN to preserve messages even if customer was deleted/recreated during sync
    let query = `
      SELECT ml.*, 
        COALESCE(ic.name, ml.customer_name_fallback, 'Unknown') as customer_name, 
        ic.mobile_number
      FROM message_logs ml
      LEFT JOIN insurance_customers ic ON ml.customer_id = ic.id
      WHERE (ic.user_id = ? OR ic.user_id IS NULL) AND (ml.client_key = ? OR ml.client_key IS NULL)
    `;
    const params = [req.user.id, clientKey];
    
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
      console.log(`✅ Returning ${messages?.length || 0} message logs for user ${req.user.id} (client: ${clientKey})`);
      res.json(messages || []);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get message history
router.get('/messages', (req, res) => {
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
router.post('/sync/from-sheet', activityLogger, async (req, res) => {
  const syncQueue = require('../services/syncQueue');
  const userId = req.user.id;
  
  // Enqueue sync and return immediately
  syncQueue.enqueue(userId, async () => {
    try {
      console.log('\n========== SYNC FROM SHEET STARTED ==========');
      console.log('User ID:', userId);
      
      const { get } = require('../db/connection');
      const { getClientConfig } = require('../config/insuranceClients');
      
      const user = await get('SELECT email FROM users WHERE id = ?', [userId]);
      console.log('User email:', user?.email);
      
      if (!user) {
        console.error('❌ User not found');
        return;
      }
      
      const clientConfig = getClientConfig(user.email);
      const spreadsheetId = clientConfig.spreadsheetId;
      
      if (clientConfig.tabs) {
        console.log(`🔄 Syncing from multiple tabs for ${clientConfig.name}`);
        const generalTab = clientConfig.tabs.general.tab;
        const lifeTab = clientConfig.tabs.life.tab;
        
        await insuranceSync.syncFromSheet(userId, spreadsheetId, generalTab, 'general');
        await insuranceSync.syncFromSheet(userId, spreadsheetId, lifeTab, 'life');
      } else {
        const tabName = clientConfig.tabName;
        await insuranceSync.syncFromSheet(userId, spreadsheetId, tabName);
      }
      
      console.log('========== SYNC FROM SHEET COMPLETED ==========\n');
    } catch (error) {
      console.error('❌ Sync from sheet error:', error);
    }
  });
  
  // Return immediately with queued status
  res.json({ queued: true, message: 'Sync queued for processing' });
});

// Sync to Google Sheets
router.post('/sync/to-sheet', activityLogger, async (req, res) => {
  const syncQueue = require('../services/syncQueue');
  const userId = req.user.id;
  const { deletedCustomers = [] } = req.body;
  
  // Enqueue sync and return immediately
  syncQueue.enqueue(userId, async () => {
    try {
      const { get } = require('../db/connection');
      const { getClientConfig } = require('../config/insuranceClients');
      
      const user = await get('SELECT email FROM users WHERE id = ?', [userId]);
      if (!user) return;
      
      const clientConfig = getClientConfig(user.email);
      const spreadsheetId = clientConfig.spreadsheetId;
      
      if (clientConfig.tabs) {
        console.log(`🔄 Syncing to multiple tabs for ${clientConfig.name}`);
        const generalTab = clientConfig.tabs.general.tab;
        const lifeTab = clientConfig.tabs.life.tab;
        
        await insuranceSync.syncToSheet(userId, spreadsheetId, generalTab, ['motor', 'health', 'non-motor', '2-wheeler', 'general'], deletedCustomers);
        await insuranceSync.syncToSheet(userId, spreadsheetId, lifeTab, ['life'], deletedCustomers);
      } else {
        const tabName = clientConfig.tabName;
        await insuranceSync.syncToSheet(userId, spreadsheetId, tabName, null, deletedCustomers);
      }
    } catch (error) {
      console.error('Sync to sheet error:', error);
    }
  });
  
  // Return immediately with queued status
  res.json({ queued: true, message: 'Sync queued for processing' });
});

// Schedule reminders
router.post('/messages/schedule', async (req, res) => {
  try {
    const result = await insuranceMessaging.scheduleReminders(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send pending messages
router.post('/messages/send', async (req, res) => {
  try {
    const result = await insuranceMessaging.sendPendingMessages(req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clean up duplicate customers
router.post('/customers/cleanup-duplicates', (req, res) => {
  try {
    console.log('Cleaning duplicates for user:', req.user.id);
    db.run(`
      DELETE FROM insurance_customers 
      WHERE user_id = ? AND id NOT IN (
        SELECT MIN(id) 
        FROM insurance_customers 
        WHERE user_id = ? 
        GROUP BY name, mobile_number
      )
    `, [req.user.id, req.user.id], function(err) {
      if (err) {
        console.error('Cleanup error:', err);
        return res.status(500).json({ error: err.message });
      }
      console.log('Deleted', this.changes, 'duplicate rows');
      res.json({ message: 'Duplicates cleaned up', deletedCount: this.changes });
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Log message from n8n (requires API key)
router.post('/log-message', apiKeyAuth, async (req, res) => {
  try {
    const { customer_id, customer_name, customer_mobile, message_type, channel, message_content, status, sent_at, client_key } = req.body;
    
    if (!client_key) {
      return res.status(400).json({ error: 'client_key is required (joban or kmg)' });
    }
    
    // Validate client_key
    if (!['joban', 'kmg'].includes(client_key.toLowerCase())) {
      return res.status(400).json({ error: 'client_key must be either "joban" or "kmg"' });
    }
    
    let finalCustomerId = customer_id;
    
    // If no customer_id provided, try to find it by name and mobile
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
      } else {
        console.log(`⚠️ Customer not found: ${customer_name} (${customer_mobile})`);
      }
    }
    
    console.log(`✅ Logging message for customer ${finalCustomerId || 'unknown'} (client: ${client_key})`);
    
    db.run(`
      INSERT INTO message_logs (customer_id, message_type, channel, message_content, status, sent_at, customer_name_fallback, client_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [finalCustomerId, message_type || 'renewal_reminder', channel || 'whatsapp', message_content || '', status || 'sent', sent_at || new Date().toISOString(), customer_name, client_key.toLowerCase()], function(err) {
      if (err) {
        console.error('Log message error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, id: this.lastID, customer_id: finalCustomerId });
    });
  } catch (error) {
    console.error('Log message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Log message from frontend (requires auth)
router.post('/log-message-frontend', authRequired, async (req, res) => {
  try {
    const { customer_id, customer_name, message_type, channel, message_content, status, sent_at } = req.body;
    
    if (!customer_id) {
      return res.status(400).json({ error: 'customer_id is required' });
    }
    
    // CRITICAL: Verify customer belongs to this user - STRICT VALIDATION
    const customer = await new Promise((resolve, reject) => {
      db.get('SELECT user_id FROM insurance_customers WHERE id = ? AND user_id = ?', [customer_id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!customer) {
      console.error(`❌ SECURITY: User ${req.user.id} attempted to log message for customer ${customer_id} that doesn't belong to them`);
      return res.status(403).json({ error: 'Access denied - customer not found or does not belong to you' });
    }
    
    // Get user's client_key
    const { get } = require('../db/connection');
    const { getClientConfig } = require('../config/insuranceClients');
    
    const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
    const clientConfig = getClientConfig(user.email);
    const clientKey = clientConfig.key; // 'joban' or 'kmg'
    
    console.log(`✅ Logging message for customer ${customer_id} (user ${req.user.id}, client: ${clientKey})`);
    
    db.run(`
      INSERT INTO message_logs (customer_id, message_type, channel, message_content, status, sent_at, customer_name_fallback, client_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [customer_id, message_type || 'renewal_reminder', channel || 'whatsapp', message_content || '', status || 'sent', sent_at || new Date().toISOString(), customer_name, clientKey], function(err) {
      if (err) {
        console.error('Log message error:', err);
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, id: this.lastID });
    });
  } catch (error) {
    console.error('Log message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer message history - STRICT CLIENT ISOLATION
router.get('/customers/:id/messages', validateCustomerOwnership, (req, res) => {
  try {
    console.log(`📨 Fetching messages for customer ${req.params.id}, user ${req.user.id}`);
    
    db.all(`
      SELECT ml.* FROM message_logs ml
      LEFT JOIN insurance_customers ic ON ml.customer_id = ic.id
      WHERE ml.customer_id = ? AND (ic.user_id = ? OR ic.user_id IS NULL)
      ORDER BY ml.sent_at DESC
    `, [req.params.id, req.user.id], (err, messages) => {
      if (err) {
        console.error('Message history error:', err);
        return res.json([]);
      }
      console.log(`✅ Found ${messages?.length || 0} messages for customer ${req.params.id}`);
      res.json(messages || []);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Log reminder from n8n (with client validation)
router.post('/log-reminder', async (req, res) => {
  try {
    const { customer_id, reminder_type, sent_via, sent_at } = req.body;
    
    if (!customer_id || !reminder_type || !sent_via) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    db.run(`
      INSERT INTO renewal_reminders (customer_id, reminder_type, sent_via, sent_at)
      VALUES (?, ?, ?, ?)
    `, [customer_id, reminder_type, sent_via, sent_at || new Date().toISOString()], function(err) {
      if (err) {
        console.error('Log reminder error:', err);
        return res.json({ success: true, id: 0 });
      }
      res.json({ success: true, id: this.lastID });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add customer note
router.post('/customers/:id/notes', validateCustomerOwnership, async (req, res) => {
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
      const newNote = `${note} [${timestamp}]`;
      const updatedNotes = customer.notes ? `${customer.notes}\n${newNote}` : newNote;
      
      db.run(`
        UPDATE insurance_customers 
        SET notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `, [updatedNotes, req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get customer notes and reminders
router.get('/customers/:id/history', validateCustomerOwnership, (req, res) => {
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
      if (err) {
        console.error('History error:', err);
        return res.json([]);
      }
      res.json(history || []);
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get renewal statistics
router.get('/renewal-stats', (req, res) => {
  try {
    db.get(`
      SELECT 
        COUNT(CASE WHEN sent_at >= date('now') THEN 1 END) as reminders_today,
        COUNT(DISTINCT customer_id) as customers_reminded
      FROM renewal_reminders
      WHERE customer_id IN (SELECT id FROM insurance_customers WHERE user_id = ?)
    `, [req.user.id], (err, stats) => {
      if (err) {
        console.error('Renewal stats error:', err);
        return res.json({ reminders_today: 0, customers_reminded: 0 });
      }
      res.json(stats || { reminders_today: 0, customers_reminded: 0 });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk mark as renewed
router.post('/customers/bulk-renew', (req, res) => {
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
router.get('/claims', (req, res) => {
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
router.post('/claims', activityLogger, (req, res) => {
  try {
    const { customer_id, policy_number, insurance_company, vehicle_number, claim_type, incident_date, description, claim_amount, claimant } = req.body;
    
    if (!customer_id) {
      return res.status(400).json({ error: 'Customer is required' });
    }
    
    db.run(`
      INSERT INTO insurance_claims (user_id, customer_id, policy_number, insurance_company, vehicle_number, claim_type, incident_date, description, claim_amount, claimant, claim_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'filed')
    `, [req.user.id, customer_id, policy_number, insurance_company, vehicle_number, claim_type, incident_date, description, claim_amount, claimant], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT * FROM insurance_claims WHERE id = ?', [this.lastID], (err, claim) => {
        if (err) return res.status(500).json({ error: err.message });
        req.logActivity('claim_add', `Filed new claim for vehicle: ${vehicle_number}`);
        res.status(201).json(claim);
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update claim status
router.patch('/claims/:id/status', validateClaimOwnership, (req, res) => {
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
router.put('/claims/:id', validateClaimOwnership, (req, res) => {
  try {
    const { policy_number, insurance_company, vehicle_number, claim_type, incident_date, description, claim_amount, claimant } = req.body;
    
    db.run(`
      UPDATE insurance_claims 
      SET policy_number = ?, insurance_company = ?, vehicle_number = ?, claim_type = ?, incident_date = ?, description = ?, claim_amount = ?, claimant = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [policy_number, insurance_company, vehicle_number, claim_type, incident_date, description, claim_amount, claimant, req.params.id, req.user.id], (err) => {
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
router.delete('/claims/:id', validateClaimOwnership, (req, res) => {
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
router.get('/claims/:id/history', validateClaimOwnership, (req, res) => {
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

// Sync claims from Google Sheets
router.post('/claims/sync/from-sheet', async (req, res) => {
  try {
    const { get } = require('../db/connection');
    const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const email = user.email.toLowerCase();
    let spreadsheetId, tabName;

    if (email.includes('joban')) {
      spreadsheetId = process.env.JOBAN_CLAIMS_SHEETS_SPREADSHEET_ID;
      tabName = process.env.JOBAN_CLAIMS_SHEETS_TAB || 'claims';
    } else {
      spreadsheetId = process.env.KMG_CLAIMS_SHEETS_SPREADSHEET_ID;
      tabName = process.env.KMG_CLAIMS_SHEETS_TAB || 'claims';
    }

    const result = await claimsSync.syncClaimsFromSheet(req.user.id, spreadsheetId, tabName);
    res.json(result);
  } catch (error) {
    console.error('Claims sync from sheet error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync claims to Google Sheets
router.post('/claims/sync/to-sheet', async (req, res) => {
  try {
    const { get } = require('../db/connection');
    const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const email = user.email.toLowerCase();
    let spreadsheetId, tabName;

    if (email.includes('joban')) {
      spreadsheetId = process.env.JOBAN_CLAIMS_SHEETS_SPREADSHEET_ID;
      tabName = process.env.JOBAN_CLAIMS_SHEETS_TAB || 'claims';
    } else {
      spreadsheetId = process.env.KMG_CLAIMS_SHEETS_SPREADSHEET_ID;
      tabName = process.env.KMG_CLAIMS_SHEETS_TAB || 'claims';
    }

    const result = await claimsSync.syncClaimsToSheet(req.user.id, spreadsheetId, tabName);
    res.json(result);
  } catch (error) {
    console.error('Claims sync to sheet error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send claim update notification
router.post('/claims/:id/notify', validateClaimOwnership, async (req, res) => {
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
router.get('/reports', async (req, res) => {
  try {
    const userId = req.user.id;
    const { vertical, reportMonth } = req.query;
    console.log(`📊 Reports API called with vertical: ${vertical}, reportMonth: ${reportMonth}`);
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];
    
    if (vertical && vertical !== 'all') {
      if (vertical === 'general' || vertical === 'general-all') {
        whereClause += ' AND LOWER(vertical) IN (?, ?, ?)';
        params.push('motor', 'health', 'non-motor');
      } else if (vertical === 'motor-all') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('motor');
      } else if (vertical === 'motor') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('motor');
      } else if (vertical === '2-wheeler') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('motor', '%2%');
      } else if (vertical === '4-wheeler') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('motor', '%4%');
      } else if (vertical === 'health-all') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('health');
      } else if (vertical === 'health') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('health');
      } else if (vertical === 'health-base') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%base%');
      } else if (vertical === 'health-topup') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%topup%');
      } else if (vertical === 'health-ghi') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%ghi%');
      } else if (vertical === 'health-gpa') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%gpa%');
      } else if (vertical === 'health-pa') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%pa%');
      } else if (vertical === 'health-others') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ?';
        params.push('health', '%base%', '%topup%', '%ghi%', '%gpa%', '%pa%');
      } else if (vertical === 'non-motor-all') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('non-motor');
      } else if (vertical === 'non-motor') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('non-motor');
      } else if (vertical === 'marine') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
        params.push('non-motor', 'marine');
      } else if (vertical === 'fire') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
        params.push('non-motor', 'fire');
      } else if (vertical === 'burglary') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
        params.push('non-motor', 'burglary');
      } else if (vertical === 'non-motor-others') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(product_type) NOT IN (?, ?, ?)';
        params.push('non-motor', 'marine', 'fire', 'burglary');
      } else if (vertical === 'life') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('life');
      } else {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push(vertical.toLowerCase());
      }
    }

    // Get all customers
    const allCustomers = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM insurance_customers ${whereClause} ORDER BY id DESC`, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    // Helper function to check if date is expired
    const isExpired = (dateStr) => {
      if (!dateStr || dateStr.trim() === '') return false;
      try {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]);
          const renewalDate = new Date(year, month, day);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return renewalDate < today;
        }
      } catch (e) {
        return false;
      }
      return false;
    };

    // Helper to check if date is in current month
    const isInCurrentMonth = (dateStr) => {
      if (!dateStr || dateStr.trim() === '') return false;
      try {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]);
          const date = new Date(year, month, day);
          const now = new Date();
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }
      } catch (e) {
        return false;
      }
      return false;
    };

    // Count by status (using actual status values: renewed, due, inprocess, not renewed)
    const renewedCount = allCustomers.filter(c => c.status?.toLowerCase().trim() === 'renewed').length;
    const dueCount = allCustomers.filter(c => c.status?.toLowerCase().trim() === 'due').length;
    const inprocessCount = allCustomers.filter(c => {
      const status = c.status?.toLowerCase().trim().replace(/[\s-]/g, '');
      return status === 'inprocess' || status === 'inprogress';
    }).length;
    const notRenewedCount = allCustomers.filter(c => c.status?.toLowerCase().trim() === 'not renewed').length;
    
    // Expiring this month = due customers with MODIFIED EXPIRY DATE or Policy Expiry Date in current month
    const expiringThisMonth = allCustomers.filter(c => {
      const isDue = c.status?.toLowerCase().trim() === 'due';
      // Prioritize MODIFIED EXPIRY DATE (renewal_date) over Policy Expiry Date (od_expiry_date)
      const renewalDate = c.renewal_date?.trim() || c.od_expiry_date?.trim();
      return isDue && isInCurrentMonth(renewalDate);
    }).length;
    
    const expiredCount = allCustomers.filter(c => {
      const isDue = c.status?.toLowerCase().trim() === 'due';
      // Prioritize MODIFIED EXPIRY DATE (renewal_date) over Policy Expiry Date (od_expiry_date)
      const renewalDate = c.renewal_date?.trim() || c.od_expiry_date?.trim();
      return isDue && isExpired(renewalDate);
    }).length;
    
    // Calculate premium - use PREMIUM column for all calculations
    const totalPremium = allCustomers.reduce((sum, c) => {
      // Use PREMIUM column for all premium calculations
      const amount = parseFloat(c.premium) || 0;
      return sum + amount;
    }, 0);
    
    // THIS MONTH PREMIUM: Renewed/InProcess customers with MODIFIED EXPIRY DATE or Policy Expiry Date in current month
    const now = new Date();
    const thisMonthCustomers = allCustomers.filter(c => {
      const status = c.status?.toLowerCase().trim().replace(/[\s-]/g, '');
      if (status !== 'renewed' && status !== 'inprocess' && status !== 'inprogress') return false;
      // Prioritize MODIFIED EXPIRY DATE (renewal_date) over Policy Expiry Date (od_expiry_date)
      const dateStr = (c.renewal_date?.trim() || c.od_expiry_date?.trim());
      if (!dateStr) return false;
      try {
        const [d, m, y] = dateStr.split('/');
        const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      } catch (e) {
        return false;
      }
    });
    const collectedThisMonth = thisMonthCustomers.reduce((sum, c) => sum + (parseFloat(c.premium) || 0), 0);
    console.log(`📊 This Month: ${thisMonthCustomers.length} customers, Total: ₹${collectedThisMonth}`);
    
    // THIS YEAR PREMIUM: Renewed/InProcess customers with MODIFIED EXPIRY DATE or Policy Expiry Date in current year
    const thisYearCustomers = allCustomers.filter(c => {
      const status = c.status?.toLowerCase().trim().replace(/[\s-]/g, '');
      if (status !== 'renewed' && status !== 'inprocess' && status !== 'inprogress') return false;
      // Prioritize MODIFIED EXPIRY DATE (renewal_date) over Policy Expiry Date (od_expiry_date)
      const dateStr = (c.renewal_date?.trim() || c.od_expiry_date?.trim());
      if (!dateStr) return false;
      try {
        const [d, m, y] = dateStr.split('/');
        const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        return date.getFullYear() === now.getFullYear();
      } catch (e) {
        return false;
      }
    });
    const collectedThisYear = thisYearCustomers.reduce((sum, c) => sum + (parseFloat(c.premium) || 0), 0);
    console.log(`📊 This Year: ${thisYearCustomers.length} customers, Total: ₹${collectedThisYear}`);
    
    // New customers this month (based on policy_start_date)
    const newThisMonth = allCustomers.filter(c => {
      const dateStr = c.policy_start_date;
      if (!dateStr) return false;
      try {
        let date;
        if (dateStr.includes('/')) {
          const [d, m, y] = dateStr.split('/');
          date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        } else {
          date = new Date(dateStr);
        }
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      } catch (e) {
        return false;
      }
    }).length;
    
    // HIGHEST PREMIUM CUSTOMER: Only RENEWED customers, highest PREMIUM
    const renewedCustomers = allCustomers.filter(c => c.status?.toLowerCase().trim() === 'renewed');
    const sortedByPremium = [...renewedCustomers].sort((a, b) => (parseFloat(b.premium) || 0) - (parseFloat(a.premium) || 0));
    const topCustomer = sortedByPremium[0] || { name: 'N/A', premium: 0 };
    console.log(`📊 Highest Premium Customer: ${topCustomer.name} - ₹${topCustomer.premium}`);
    
    // TOP INSURANCE COMPANY: Group by company, sum PREMIUM for ALL customers
    const companyTotals = {};
    allCustomers.forEach(c => {
      const company = c.company || 'Unknown';
      companyTotals[company] = (companyTotals[company] || 0) + (parseFloat(c.premium) || 0);
    });
    const topCompany = Object.entries(companyTotals).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
    console.log(`📊 Top Company: ${topCompany[0]} - ₹${topCompany[1]}`);
    
    const byCompany = Object.entries(companyTotals).map(([company, amount]) => ({ company, amount })).sort((a, b) => b.amount - a.amount);

    // Get claims data
    const allClaims = await new Promise((resolve, reject) => {
      db.all(`
        SELECT c.*, ic.name as customer_name, ic.mobile_number
        FROM insurance_claims c
        JOIN insurance_customers ic ON c.customer_id = ic.id
        WHERE c.user_id = ?
        ORDER BY c.created_at DESC
      `, [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    const totalFiled = allClaims.length;
    const approved = allClaims.filter(c => c.claim_status === 'approved').length;
    const settled = allClaims.filter(c => c.claim_status === 'settled').length;
    const rejected = allClaims.filter(c => c.claim_status === 'rejected').length;
    const inProgress = allClaims.filter(c => c.claim_status === 'in_progress' || c.claim_status === 'filed' || c.claim_status === 'survey_done').length;

    // Group by insurer (match frontend structure: company, count)
    const byInsurer = {};
    allClaims.forEach(c => {
      const company = c.insurance_company || 'Unknown';
      if (!byInsurer[company]) byInsurer[company] = { company, count: 0, amount: 0 };
      byInsurer[company].count++;
      byInsurer[company].amount += parseFloat(c.claim_amount) || 0;
    });

    // Group by type
    const byType = {};
    allClaims.forEach(c => {
      const type = c.claim_type || 'unknown';
      if (!byType[type]) byType[type] = { type, count: 0 };
      byType[type].count++;
    });

    res.json({
      renewalPerformance: {
        expiringThisMonth: expiringThisMonth,
        renewedSoFar: renewedCount,
        inProcess: inprocessCount,
        lost: notRenewedCount,
        pendingRenewals: dueCount - expiredCount,
        expiredWithoutRenewal: expiredCount,
        conversionRate: (() => {
          const denominator = renewedCount + expiredCount + notRenewedCount;
          return denominator > 0 ? Math.round((renewedCount / denominator) * 100) : 0;
        })(),
        monthlyTrend: (() => {
          const trend = [];
          const now = new Date();
          let monthsToShow = 3;
          let startOffset = 2;
          
          if (reportMonth) {
            const [filterYear, filterMonth] = reportMonth.split('-').map(Number);
            monthsToShow = 1;
            startOffset = 0;
            now.setFullYear(filterYear, filterMonth - 1, 1);
          }
          
          for (let i = startOffset; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = monthDate.toLocaleString('default', { month: 'short', year: '2-digit' });
            const renewed = allCustomers.filter(c => {
              const status = c.status?.toLowerCase().trim() === 'renewed';
              const dateStr = c.renewal_date?.trim() || c.od_expiry_date?.trim();
              if (!status || !dateStr) return false;
              try {
                const [d, m, y] = dateStr.split('/');
                const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                return date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear();
              } catch (e) {
                return false;
              }
            }).length;
            const expired = allCustomers.filter(c => {
              const isDue = c.status?.toLowerCase().trim() === 'due';
              const dateStr = c.renewal_date?.trim() || c.od_expiry_date?.trim();
              if (!isDue || !dateStr) return false;
              try {
                const [d, m, y] = dateStr.split('/');
                const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today && date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear();
              } catch (e) {
                return false;
              }
            }).length;
            const lost = allCustomers.filter(c => {
              const status = c.status?.toLowerCase().trim() === 'not renewed';
              const dateStr = c.renewal_date?.trim() || c.od_expiry_date?.trim();
              if (!status || !dateStr) return false;
              try {
                const [d, m, y] = dateStr.split('/');
                const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                return date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear();
              } catch (e) {
                return false;
              }
            }).length;
            trend.push({ month: monthStr, renewed, expired, lost });
          }
          return trend;
        })(),
        customers: allCustomers
      },
      premiumCollection: {
        collectedThisMonth: collectedThisMonth,
        collectedThisYear: collectedThisYear,
        highestCustomer: { name: topCustomer.name, premium: topCustomer.premium || 0 },
        highestCompany: { name: topCompany[0], premium: topCompany[1] },
        monthlyPremium: (() => {
          const trend = [];
          const now = new Date();
          for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = monthDate.toLocaleString('default', { month: 'short', year: '2-digit' });
            const monthAmount = allCustomers.filter(c => {
              const status = c.status?.toLowerCase().trim().replace(/[\s-]/g, '');
              if (status !== 'renewed' && status !== 'inprocess' && status !== 'inprogress') return false;
              const dateStr = (c.renewal_date?.trim() || c.od_expiry_date?.trim());
              if (!dateStr) return false;
              try {
                const [d, m, y] = dateStr.split('/');
                const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                return date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear();
              } catch (e) {
                return false;
              }
            }).reduce((sum, c) => sum + (parseFloat(c.premium) || 0), 0);
            trend.push({ month: monthStr, amount: monthAmount });
          }
          return trend;
        })(),
        byCompany: byCompany,
        customers: sortedByPremium
      },
      customerGrowth: {
        newThisMonth: newThisMonth,
        totalActive: renewedCount,
        totalInactive: dueCount + inprocessCount + notRenewedCount,
        retentionRate: allCustomers.length > 0 ? Math.round((renewedCount / allCustomers.length) * 100) : 0,
        churnRate: allCustomers.length > 0 ? Math.round((notRenewedCount / allCustomers.length) * 100) : 0,
        growthTrend: (() => {
          const trend = [];
          const now = new Date();
          for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = monthDate.toLocaleString('default', { month: 'short', year: '2-digit' });
            const monthCount = allCustomers.filter(c => {
              const dateStr = c.created_at || c.policy_start_date;
              if (!dateStr) return false;
              try {
                let date;
                if (dateStr.includes('/')) {
                  const [d, m, y] = dateStr.split('/');
                  date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                } else {
                  date = new Date(dateStr);
                }
                return date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear();
              } catch (e) {
                return false;
              }
            }).length;
            trend.push({ month: monthStr, count: monthCount });
          }
          return trend;
        })(),
        customers: allCustomers
      },
      claimsSummary: {
        totalFiled,
        approved: approved + settled,
        rejected,
        inProgress,
        avgSettlementDays: 0,
        byInsurer: Object.values(byInsurer),
        byType: Object.values(byType),
        claims: allClaims
      }
    });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get analytics
router.get('/analytics', (req, res) => {
  try {
    const { vertical, generalSubFilter } = req.query;
    let whereClause = 'WHERE user_id = ?';
    const params = [req.user.id];
    
    if (vertical && vertical !== 'all') {
      if (vertical === 'general' || vertical === 'general-all') {
        whereClause += ' AND LOWER(vertical) IN (?, ?, ?)';
        params.push('motor', 'health', 'non-motor');
      } else if (vertical === 'motor-all') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('motor');
      } else if (vertical === 'motor') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('motor');
      } else if (vertical === '2-wheeler') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('motor', '%2%');
      } else if (vertical === '4-wheeler') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('motor', '%4%');
      } else if (vertical === 'health-all') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('health');
      } else if (vertical === 'health') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('health');
      } else if (vertical === 'health-base') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%base%');
      } else if (vertical === 'health-topup') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%topup%');
      } else if (vertical === 'health-ghi') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%ghi%');
      } else if (vertical === 'health-gpa') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%gpa%');
      } else if (vertical === 'health-pa') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) LIKE ?';
        params.push('health', '%pa%');
      } else if (vertical === 'health-others') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ? AND LOWER(COALESCE(product_type, "")) NOT LIKE ?';
        params.push('health', '%base%', '%topup%', '%ghi%', '%gpa%', '%pa%');
      } else if (vertical === 'non-motor-all') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('non-motor');
      } else if (vertical === 'non-motor') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('non-motor');
      } else if (vertical === 'marine') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
        params.push('non-motor', 'marine');
      } else if (vertical === 'fire') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
        params.push('non-motor', 'fire');
      } else if (vertical === 'burglary') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
        params.push('non-motor', 'burglary');
      } else if (vertical === 'non-motor-others') {
        whereClause += ' AND LOWER(vertical) = ? AND LOWER(product_type) NOT IN (?, ?, ?)';
        params.push('non-motor', 'marine', 'fire', 'burglary');
      } else if (vertical === 'life') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('life');
      } else {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push(vertical.toLowerCase());
      }
    }
    
    // Single optimized query to get all counts
    db.get(`
      SELECT 
        COUNT(*) as totalCustomers,
        SUM(CASE 
          WHEN LOWER(TRIM(status)) = 'due'
          AND renewal_date IS NOT NULL 
          AND renewal_date != '' 
          AND length(renewal_date) = 10
          AND date(substr(renewal_date, 7, 4) || '-' || substr(renewal_date, 4, 2) || '-' || substr(renewal_date, 1, 2)) >= date('now', '+1 day')
          THEN 1 ELSE 0 
        END) as upcomingRenewals
      FROM insurance_customers ${whereClause}
    `, params, (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      res.json({
        totalCustomers: result.totalCustomers || 0,
        upcomingRenewals: result.upcomingRenewals || 0,
        messagesSent: 0,
        totalSpent: 0
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get incident metrics (admin only)
router.get('/incident-metrics', (req, res) => {
  try {
    const incidentMetrics = require('../utils/incidentMetrics');
    res.json(incidentMetrics.getStats());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sync status
router.get('/sync/status', (req, res) => {
  try {
    const syncQueue = require('../services/syncQueue');
    const status = syncQueue.getStatus(req.user.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
