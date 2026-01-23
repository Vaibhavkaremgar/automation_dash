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

// Get reports data
router.get('/reports', async (req, res) => {
  try {
    const userId = req.user.id;
    const { vertical, reportMonth } = req.query;
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

    const allCustomers = await new Promise((resolve, reject) => {
      db.all(`SELECT * FROM insurance_customers ${whereClause} ORDER BY id DESC`, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json({ customers: allCustomers });
  } catch (error) {
    console.error('Reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get analytics
router.get('/analytics', (req, res) => {
  try {
    const { vertical } = req.query;
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

module.exports = router;
