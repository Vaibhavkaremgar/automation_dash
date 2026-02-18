const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');
const sheetsService = require('../services/sheets');

const router = express.Router();

router.use(authRequired);

router.get('/', requireRole('admin'), (req, res, next) => {
  try {
    const db = getDatabase();
    const { status, search } = req.query;
    
    let query = `
      SELECT 
        c.*,
        u.name as client_name
      FROM candidates c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE u.role = 'client'
    `;
    const params = [];
    
    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }
    
    if (search) {
      query += ' AND (c.name LIKE ? OR c.email LIKE ? OR u.name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    db.all(query, params, (err, candidates) => {
      if (err) return next(err);
      res.json({ candidates: candidates || [] });
    });
  } catch (error) {
    next(error);
  }
});

router.post('/sync-all', requireRole('admin'), async (req, res, next) => {
  try {
    const db = getDatabase();
    
    // Get all clients with Google Sheets URLs
    const clients = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, name, google_sheet_url 
        FROM users 
        WHERE role = 'client' 
        AND google_sheet_url IS NOT NULL 
        AND google_sheet_url != ''
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    let totalSynced = 0;
    let totalSkipped = 0;
    const results = [];

    for (const client of clients) {
      try {
        const match = client.google_sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
          results.push({ client: client.name, error: 'Invalid sheet URL' });
          continue;
        }

        const spreadsheetId = match[1];
        const result = await sheetsService.syncCandidates(client.id, spreadsheetId, 'output');
        
        totalSynced += result.synced;
        totalSkipped += result.skipped;
        results.push({ 
          client: client.name, 
          synced: result.synced, 
          skipped: result.skipped 
        });
      } catch (error) {
        results.push({ client: client.name, error: error.message });
      }
    }

    res.json({
      message: 'Sync completed for all clients',
      totalSynced,
      totalSkipped,
      results
    });
  } catch (error) {
    console.error('Sync all error:', error);
    res.status(500).json({ error: error.message || 'Sync failed' });
  }
});

module.exports = router;