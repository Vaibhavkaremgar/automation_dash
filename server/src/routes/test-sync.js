const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');
const sheetsService = require('../services/sheets');

const router = express.Router();

router.use(authRequired);

// Test sync endpoint
router.post('/sync-test', async (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.user.id;
    
    console.log('Testing sync for user:', userId);
    
    // Get user's Google Sheets URL
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT google_sheet_url FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    console.log('User config:', user);

    let spreadsheetId = '1amZkYzhw2lMmIbw0ftFAw8KJ1SX86zJ2rubWDQgs8CE'; // Default
    
    if (user && user.google_sheet_url) {
      const match = user.google_sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        spreadsheetId = match[1];
      }
    }

    console.log('Using spreadsheet ID:', spreadsheetId);
    
    // Force sync
    const result = await sheetsService.syncCandidates(userId, spreadsheetId, 'output');
    console.log('Sync result:', result);
    
    // Get candidates after sync
    const candidates = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM candidates WHERE user_id = ?', [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    console.log('Candidates after sync:', candidates.length);
    
    res.json({
      success: true,
      syncResult: result,
      candidatesCount: candidates.length,
      candidates: candidates.slice(0, 3) // First 3 for preview
    });
    
  } catch (error) {
    console.error('Test sync error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router;