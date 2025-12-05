const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');
const sheetsService = require('../services/sheets');

const router = express.Router();

router.use(authRequired);

router.post('/sync-client/:clientId', requireRole('admin'), async (req, res, next) => {
  try {
    const db = getDatabase();
    const clientId = parseInt(req.params.clientId, 10);
    
    // Get client's Google Sheets URL
    const client = await new Promise((resolve, reject) => {
      db.get('SELECT id, name, google_sheet_url FROM users WHERE id = ? AND role = "client"', [clientId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!client || !client.google_sheet_url) {
      return res.status(400).json({ error: 'Client not found or no Google Sheets URL configured' });
    }

    // Extract spreadsheet ID from URL
    const match = client.google_sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid Google Sheets URL format' });
    }

    const spreadsheetId = match[1];
    console.log(`Syncing client ${client.name} with sheet ID: ${spreadsheetId}`);
    
    const result = await sheetsService.syncCandidates(clientId, spreadsheetId, 'output');
    res.json({ 
      message: `Sync completed for ${client.name}`, 
      client: client.name,
      spreadsheetId,
      ...result 
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message || 'Sync failed' });
  }
});

module.exports = router;