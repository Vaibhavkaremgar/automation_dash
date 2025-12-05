const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authRequired } = require('../middleware/auth');

// Get all policies for user
router.get('/', authRequired, async (req, res) => {
  try {
    const policies = await db.all(`
      SELECT p.*, c.name as customer_name, c.mobile_number, pt.name as policy_type_name
      FROM motor_policies p
      JOIN insurance_customers c ON p.customer_id = c.id
      JOIN policy_types pt ON p.policy_type_id = pt.id
      WHERE p.user_id = ?
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get policy types
router.get('/types', authRequired, async (req, res) => {
  try {
    const types = await db.all('SELECT * FROM policy_types WHERE is_active = 1');
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new policy
router.post('/', authRequired, async (req, res) => {
  try {
    const {
      customer_id, policy_number, policy_type_id, company_name,
      vehicle_registration, vehicle_make, vehicle_model, vehicle_year,
      policy_start_date, policy_end_date, premium_amount, coverage_amount,
      policy_document_url, notes
    } = req.body;

    const result = await db.run(`
      INSERT INTO motor_policies (
        user_id, customer_id, policy_number, policy_type_id, company_name,
        vehicle_registration, vehicle_make, vehicle_model, vehicle_year,
        policy_start_date, policy_end_date, premium_amount, coverage_amount,
        policy_document_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.user.id, customer_id, policy_number, policy_type_id, company_name,
      vehicle_registration, vehicle_make, vehicle_model, vehicle_year,
      policy_start_date, policy_end_date, premium_amount, coverage_amount,
      policy_document_url, notes
    ]);

    res.json({ id: result.lastID, message: 'Policy created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update policy
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => updates[field]);
    
    await db.run(`
      UPDATE motor_policies 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [...values, id, req.user.id]);

    res.json({ message: 'Policy updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update renewal history
router.post('/:id/renewal', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { renewal_date, new_end_date, premium_amount } = req.body;
    
    // Get current renewal history
    const policy = await db.get('SELECT renewal_history FROM motor_policies WHERE id = ? AND user_id = ?', [id, req.user.id]);
    
    let renewalHistory = [];
    if (policy.renewal_history) {
      renewalHistory = JSON.parse(policy.renewal_history);
    }
    
    // Add new renewal
    renewalHistory.push({
      date: renewal_date,
      premium: premium_amount,
      timestamp: new Date().toISOString()
    });
    
    await db.run(`
      UPDATE motor_policies 
      SET renewal_history = ?, policy_end_date = ?, premium_amount = ?, status = 'active', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [JSON.stringify(renewalHistory), new_end_date, premium_amount, id, req.user.id]);

    res.json({ message: 'Renewal recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get policy comparisons
router.get('/comparisons', authRequired, async (req, res) => {
  try {
    const { vehicle_type } = req.query;
    
    let query = 'SELECT * FROM policy_comparisons WHERE is_active = 1';
    let params = [];
    
    if (vehicle_type) {
      query += ' AND vehicle_type = ?';
      params.push(vehicle_type);
    }
    
    query += ' ORDER BY company_name, premium_range_min';
    
    const comparisons = await db.all(query, params);
    res.json(comparisons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Policy analytics
router.get('/analytics', authRequired, async (req, res) => {
  try {
    const { vertical } = req.query;
    let whereClause = 'WHERE user_id = ?';
    const params = [req.user.id];
    
    if (vertical && vertical !== 'all') {
      whereClause += ' AND vertical = ?';
      params.push(vertical);
    }
    
    const totalPolicies = await db.get(`SELECT COUNT(*) as count FROM insurance_customers ${whereClause}`, params);
    const activePolicies = await db.get(`SELECT COUNT(*) as count FROM insurance_customers ${whereClause} AND LOWER(TRIM(status)) = 'done'`, params);
    const lostPolicies = await db.get(`SELECT COUNT(*) as count FROM insurance_customers ${whereClause} AND LOWER(TRIM(status)) = 'lost'`, params);
    const expiredPolicies = await db.get(`
      SELECT COUNT(*) as count FROM insurance_customers 
      ${whereClause} AND 
      LOWER(TRIM(status)) = 'pending' AND
      (date(substr(renewal_date, 7, 4) || '-' || substr(renewal_date, 4, 2) || '-' || substr(renewal_date, 1, 2)) < date('now') 
      OR date(substr(renewal_date, 7, 4) || '-' || substr(renewal_date, 4, 2) || '-' || substr(renewal_date, 1, 2)) BETWEEN date('now') AND date('now', '+30 days'))
    `, params);
    const expiringPolicies = await db.get(`
      SELECT COUNT(*) as count FROM insurance_customers 
      ${whereClause} AND LOWER(TRIM(status)) = 'pending' 
      AND date(substr(renewal_date, 7, 4) || '-' || substr(renewal_date, 4, 2) || '-' || substr(renewal_date, 1, 2)) BETWEEN date('now') AND date('now', '+30 days')
    `, params);
    
    const totalPremium = await db.get(`SELECT SUM(premium) as total FROM insurance_customers ${whereClause} AND LOWER(TRIM(status)) = 'done'`, params);
    
    const companyStats = await db.all(`
      SELECT company, COUNT(*) as policy_count, SUM(premium) as total_premium
      FROM insurance_customers 
      ${whereClause} AND LOWER(TRIM(status)) = 'done'
      GROUP BY company
      ORDER BY policy_count DESC
    `, params);

    res.json({
      totalPolicies: totalPolicies.count,
      activePolicies: activePolicies.count,
      lostPolicies: lostPolicies.count,
      expiredPolicies: expiredPolicies.count,
      expiringPolicies: expiringPolicies.count,
      totalPremium: totalPremium.total || 0,
      companyStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;