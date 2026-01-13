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
      query += ' AND status = ?';
      params.push(status);
    }

    if (vertical && vertical !== 'all') {
      if (vertical === 'general') {
        query += ' AND vertical IN (?, ?, ?)';
        params.push('motor', 'health', 'non-motor');
      } else if (vertical === 'health') {
        query += ' AND LOWER(product) = ?';
        params.push('health');
      } else if (vertical === 'health-base') {
        query += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
        params.push('health', 'base');
      } else if (vertical === 'health-topup') {
        query += ' AND LOWER(vertical) = ? AND LOWER(product_type) = ?';
        params.push('health', 'topup');
      } else if (vertical === 'non-motor') {
        query += ' AND (LOWER(REPLACE(product, " ", "")) = ? OR LOWER(REPLACE(product, "-", "")) = ?)';
        params.push('nonmotor', 'nonmotor');
      } else if (vertical === '2-wheeler') {
        query += ' AND LOWER(vertical) = ? AND (LOWER(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(product_type, "")), " ", ""), "-", ""), "_", "")) LIKE ?)';
        params.push('motor', '%2wh%');
      } else if (vertical === '4-wheeler') {
        query += ' AND LOWER(vertical) = ? AND (LOWER(REPLACE(REPLACE(REPLACE(TRIM(COALESCE(product_type, "")), " ", ""), "-", ""), "_", "")) LIKE ?)';
        params.push('motor', '%4wh%');
      } else if (vertical === 'motor') {
        query += ' AND LOWER(vertical) = ?';
        params.push('motor');
      } else {
        query += ' AND vertical = ?';
        params.push(vertical);
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
    const { name, mobile_number, current_policy_no, registration_no, g_code } = req.body;
    
    // Only check by exact policy number OR registration number OR G code
    // Don't check by name+mobile alone (same person can have multiple policies)
    let query = 'SELECT * FROM insurance_customers WHERE user_id = ? AND (';
    const params = [req.user.id];
    const conditions = [];
    
    // Check by policy number (exact match)
    if (current_policy_no && current_policy_no.trim()) {
      conditions.push('current_policy_no = ?');
      params.push(current_policy_no.trim());
    }
    
    // Check by registration number (exact match for vehicles)
    if (registration_no && registration_no.trim()) {
      conditions.push('registration_no = ?');
      params.push(registration_no.trim());
    }
    
    // Check by G code (exact match)
    if (g_code && g_code.trim()) {
      conditions.push('g_code = ?');
      params.push(g_code.trim());
    }
    
    if (conditions.length === 0) {
      // No unique identifiers provided - allow adding
      return res.json({ isDuplicate: false });
    }
    
    query += conditions.join(' OR ') + ') LIMIT 1';
    
    db.get(query, params, (err, existing) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ 
        isDuplicate: !!existing,
        existing: existing || null
      });
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
    
    db.run(`
      INSERT INTO insurance_customers (user_id, name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical, product, registration_no, current_policy_no, company, status, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent, product_type, product_model, notes, modified_expiry_date, bank_name, customer_id, agent_code, pancard, aadhar_card, others_doc, g_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [req.user.id, name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical || 'motor', product, registration_no, current_policy_no, company, status || 'due', new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent, product_type, product_model, notes, modified_expiry_date, bank_name, customer_id, agent_code, pancard, aadhar_card, others_doc, g_code], function(err) {
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
router.put('/customers/:id', validateCustomerOwnership, activityLogger, (req, res) => {
  try {
    const { name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical, product, registration_no, current_policy_no, company, status, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent, product_type, product_model, notes, modified_expiry_date, bank_name, customer_id, agent_code, pancard, aadhar_card, others_doc, g_code } = req.body;
    
    db.run(`
      UPDATE insurance_customers 
      SET name = ?, mobile_number = ?, insurance_activated_date = ?, renewal_date = ?, od_expiry_date = ?, tp_expiry_date = ?, premium_mode = ?, premium = ?, last_year_premium = ?, vertical = ?, product = ?, registration_no = ?, current_policy_no = ?, company = ?, status = ?, new_policy_no = ?, new_company = ?, policy_doc_link = ?, thank_you_sent = ?, reason = ?, email = ?, cheque_hold = ?, payment_date = ?, cheque_no = ?, cheque_bounce = ?, owner_alert_sent = ?, product_type = ?, product_model = ?, notes = ?, modified_expiry_date = ?, bank_name = ?, customer_id = ?, agent_code = ?, pancard = ?, aadhar_card = ?, others_doc = ?, g_code = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [name, mobile_number, insurance_activated_date, renewal_date, od_expiry_date, tp_expiry_date, premium_mode, premium, last_year_premium, vertical || 'motor', product, registration_no, current_policy_no, company, status, new_policy_no, new_company, policy_doc_link, thank_you_sent, reason, email, cheque_hold, payment_date, cheque_no, cheque_bounce, owner_alert_sent, product_type, product_model, notes, modified_expiry_date, bank_name, customer_id, agent_code, pancard, aadhar_card, others_doc, g_code, req.params.id, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT * FROM insurance_customers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, customer) => {
        if (err) return res.status(500).json({ error: err.message });
        req.logActivity('customer_update', `Updated customer: ${name}`);
        res.json(customer);
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete insurance customer
router.delete('/customers/:id', validateCustomerOwnership, activityLogger, async (req, res) => {
  try {
    // Get customer data before deletion for sync purposes
    const customer = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM insurance_customers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Delete from database
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM insurance_customers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err) => {
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
  try {
    console.log('\n========== SYNC FROM SHEET STARTED ==========');
    console.log('User ID:', req.user.id);
    
    const { get } = require('../db/connection');
    const { getClientConfig } = require('../config/insuranceClients');
    
    const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
    console.log('User email:', user?.email);
    
    if (!user) {
      console.error('❌ User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    const clientConfig = getClientConfig(user.email);
    console.log('Client config:', JSON.stringify(clientConfig, null, 2));
    
    const spreadsheetId = clientConfig.spreadsheetId;
    console.log('Spreadsheet ID:', spreadsheetId);
    
    // Both KMG and Joban now use multi-tab structure
    if (clientConfig.tabs) {
      console.log(`🔄 Syncing from multiple tabs for ${clientConfig.name}`);
      let totalImported = 0;
      
      // Sync general insurance
      const generalTab = clientConfig.tabs.general.tab;
      console.log(`\n📊 SYNCING GENERAL INSURANCE`);
      console.log(`Tab name: ${generalTab}`);
      console.log(`Spreadsheet: ${spreadsheetId}`);
      
      const generalResult = await insuranceSync.syncFromSheet(req.user.id, spreadsheetId, generalTab, 'general');
      console.log('General sync result:', generalResult);
      totalImported += generalResult.imported || 0;
      
      // Sync life insurance
      const lifeTab = clientConfig.tabs.life.tab;
      console.log(`\n📊 SYNCING LIFE INSURANCE`);
      console.log(`Tab name: ${lifeTab}`);
      console.log(`Spreadsheet: ${spreadsheetId}`);
      
      const lifeResult = await insuranceSync.syncFromSheet(req.user.id, spreadsheetId, lifeTab, 'life');
      console.log('Life sync result:', lifeResult);
      totalImported += lifeResult.imported || 0;
      
      console.log(`\n✅ TOTAL IMPORTED: ${totalImported}`);
      console.log('========== SYNC FROM SHEET COMPLETED ==========\n');
      
      req.logActivity('sync_from_sheet', `Synced ${totalImported} customers from Google Sheets`);
      res.json({ imported: totalImported, updated: 0 });
    } else {
      // Fallback for old single-tab structure
      const tabName = clientConfig.tabName;
      console.log(`🔄 Syncing from sheet for ${clientConfig.name}`);
      console.log(`📊 Sheet ID: ${spreadsheetId}, Tab: ${tabName}`);
      
      const result = await insuranceSync.syncFromSheet(req.user.id, spreadsheetId, tabName);
      req.logActivity('sync_from_sheet', `Synced ${result.imported || 0} customers from Google Sheets`);
      res.json(result);
    }
  } catch (error) {
    console.error('❌ Sync from sheet error:', error);
    console.error('Error stack:', error.stack);
    console.log('========== SYNC FROM SHEET FAILED ==========\n');
    res.status(500).json({ error: error.message });
  }
});

// Sync to Google Sheets
router.post('/sync/to-sheet', activityLogger, async (req, res) => {
  try {
    const { deletedCustomers = [] } = req.body; // Accept deleted customers array
    const { get } = require('../db/connection');
    const { getClientConfig } = require('../config/insuranceClients');
    
    const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const clientConfig = getClientConfig(user.email);
    const spreadsheetId = clientConfig.spreadsheetId;
    
    // Both KMG and Joban now use multi-tab structure
    if (clientConfig.tabs) {
      console.log(`🔄 Syncing to multiple tabs for ${clientConfig.name}`);
      let totalExported = 0;
      let totalDeleted = 0;
      let totalUpdated = 0;
      let totalAdded = 0;
      
      // Sync general insurance (motor, health, non-motor)
      const generalTab = clientConfig.tabs.general.tab;
      console.log(`📊 Syncing general insurance to tab: ${generalTab}`);
      const generalResult = await insuranceSync.syncToSheet(req.user.id, spreadsheetId, generalTab, ['motor', 'health', 'non-motor', '2-wheeler', 'general'], deletedCustomers);
      totalExported += generalResult.exported || 0;
      totalDeleted += generalResult.deleted || 0;
      totalUpdated += generalResult.updated || 0;
      totalAdded += generalResult.added || 0;
      
      // Sync life insurance
      const lifeTab = clientConfig.tabs.life.tab;
      console.log(`📊 Syncing life insurance to tab: ${lifeTab}`);
      const lifeResult = await insuranceSync.syncToSheet(req.user.id, spreadsheetId, lifeTab, ['life'], deletedCustomers);
      totalExported += lifeResult.exported || 0;
      totalDeleted += lifeResult.deleted || 0;
      totalUpdated += lifeResult.updated || 0;
      totalAdded += lifeResult.added || 0;
      
      req.logActivity('sync_to_sheet', `Synced ${totalExported} customers to Google Sheets`);
      res.json({ 
        success: true, 
        exported: totalExported,
        deleted: totalDeleted,
        updated: totalUpdated,
        added: totalAdded
      });
    } else {
      // Fallback for old single-tab structure
      const tabName = clientConfig.tabName;
      console.log('Syncing to sheet - User:', req.user.id, 'Email:', user.email, 'Sheet:', spreadsheetId, 'Tab:', tabName);
      const result = await insuranceSync.syncToSheet(req.user.id, spreadsheetId, tabName, null, deletedCustomers);
      console.log('Sync result:', result);
      req.logActivity('sync_to_sheet', `Synced ${result.exported || 0} customers to Google Sheets`);
      res.json(result);
    }
  } catch (error) {
    console.error('Sync to sheet error:', error.message);
    res.status(500).json({ error: error.message });
  }
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
    const { vertical } = req.query;
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];
    
    if (vertical && vertical !== 'all') {
      if (vertical === 'general') {
        whereClause += ' AND vertical IN (?, ?, ?)';
        params.push('motor', 'health', 'non-motor');
      } else {
        whereClause += ' AND vertical = ?';
        params.push(vertical);
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
    const inprocessCount = allCustomers.filter(c => c.status?.toLowerCase().trim() === 'inprocess').length;
    const notRenewedCount = allCustomers.filter(c => c.status?.toLowerCase().trim() === 'not renewed').length;
    
    // Expiring this month = due customers with renewal date in current month
    const expiringThisMonth = allCustomers.filter(c => {
      const isDue = c.status?.toLowerCase().trim() === 'due';
      const renewalDate = c.renewal_date || c.od_expiry_date;
      return isDue && isInCurrentMonth(renewalDate);
    }).length;
    
    const expiredCount = allCustomers.filter(c => {
      const isDue = c.status?.toLowerCase().trim() === 'due';
      const renewalDate = c.renewal_date || c.od_expiry_date;
      return isDue && isExpired(renewalDate);
    }).length;
    
    // Calculate premium - use AMOUNT for renewed, LAST YEAR PREMIUM for due/pending
    const totalPremium = allCustomers.reduce((sum, c) => {
      const status = c.status?.toLowerCase().trim();
      // For renewed customers, use current premium (AMOUNT)
      // For due/pending customers, use last year premium
      const amount = status === 'renewed' 
        ? (parseFloat(c.premium) || 0)
        : (parseFloat(c.last_year_premium) || parseFloat(c.premium) || 0);
      return sum + amount;
    }, 0);
    
    // Get all renewed customers
    const renewedCustomers = allCustomers.filter(c => c.status?.toLowerCase().trim() === 'renewed');
    
    // Collected this month: customers with status='renewed' - use AMOUNT column
    const collectedThisMonth = renewedCustomers.reduce((sum, c) => sum + (parseFloat(c.premium) || 0), 0);
    
    // Collected this year: same as month for now (can be refined later)
    const collectedThisYear = collectedThisMonth;
    
    // Total renewed premium
    const renewedPremium = collectedThisMonth;
    
    // New customers this month (based on created_at or insurance_activated_date)
    const newThisMonth = allCustomers.filter(c => {
      const dateStr = c.created_at || c.insurance_activated_date;
      if (!dateStr) return false;
      try {
        const date = new Date(dateStr);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      } catch (e) {
        return false;
      }
    }).length;
    
    // Get top customer and company
    const sortedByPremium = [...allCustomers].sort((a, b) => (b.premium || 0) - (a.premium || 0));
    const topCustomer = sortedByPremium[0] || { name: 'N/A', premium: 0 };
    
    const companyTotals = {};
    allCustomers.forEach(c => {
      const company = c.company || 'Unknown';
      companyTotals[company] = (companyTotals[company] || 0) + (parseFloat(c.premium) || 0);
    });
    const topCompany = Object.entries(companyTotals).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
    
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
        pendingRenewals: dueCount - expiredCount,
        expiredWithoutRenewal: expiredCount,
        conversionRate: (expiringThisMonth + renewedCount) > 0 ? Math.round((renewedCount / (expiringThisMonth + renewedCount)) * 100) : 0,
        monthlyTrend: [{ month: 'Current', count: renewedCount }],
        customers: allCustomers
      },
      premiumCollection: {
        collectedThisMonth: collectedThisMonth,
        collectedThisYear: collectedThisYear,
        highestCustomer: { name: topCustomer.name, premium: topCustomer.premium || 0 },
        highestCompany: { name: topCompany[0], premium: topCompany[1] },
        monthlyPremium: [{ month: 'Current', amount: collectedThisMonth }],
        byCompany: byCompany,
        customers: sortedByPremium
      },
      customerGrowth: {
        newThisMonth: newThisMonth || allCustomers.length,
        totalActive: renewedCount,
        totalInactive: dueCount + inprocessCount + notRenewedCount,
        retentionRate: allCustomers.length > 0 ? Math.round((renewedCount / allCustomers.length) * 100) : 0,
        growthTrend: [{ month: 'Current', count: newThisMonth || allCustomers.length }],
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
      if (vertical === 'general') {
        whereClause += ' AND vertical IN (?, ?, ?)';
        params.push('motor', 'health', 'non-motor');
      } else if (vertical === '2-wheeler') {
        whereClause += ' AND LOWER(vertical) = ? AND (LOWER(REPLACE(REPLACE(REPLACE(TRIM(product_type), " ", ""), "-", ""), "_", "")) LIKE ?)';
        params.push('motor', '%2wh%');
      } else if (vertical === '4-wheeler') {
        whereClause += ' AND LOWER(vertical) = ? AND (LOWER(REPLACE(REPLACE(REPLACE(TRIM(product_type), " ", ""), "-", ""), "_", "")) LIKE ?)';
        params.push('motor', '%4wh%');
      } else if (vertical === 'motor') {
        whereClause += ' AND LOWER(vertical) = ?';
        params.push('motor');
      } else {
        whereClause += ' AND vertical = ?';
        params.push(vertical);
      }
    }
    
    db.get(`SELECT COUNT(*) as count FROM insurance_customers ${whereClause}`, params, (err, totalCustomers) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get(`
        SELECT COUNT(*) as count FROM insurance_customers 
        ${whereClause} 
        AND LOWER(TRIM(status)) = 'due'
        AND renewal_date IS NOT NULL 
        AND renewal_date != '' 
        AND length(renewal_date) = 10
        AND date(substr(renewal_date, 7, 4) || '-' || substr(renewal_date, 4, 2) || '-' || substr(renewal_date, 1, 2)) >= date('now', '+1 day')
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