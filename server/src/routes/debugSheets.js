const express = require('express');
const sheetsService = require('../services/sheets');
const { getDatabase } = require('../db/connection');

const router = express.Router();

// Debug endpoint - no auth required for testing
router.get('/client/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const db = getDatabase();
    
    const client = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ? AND role = "client"', [clientId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!client) {
      return res.json({ error: 'Client not found', clientId });
    }

    const result = {
      clientId,
      clientName: client.name || client.email,
      hasSheetUrl: !!client.google_sheet_url,
      sheetUrl: client.google_sheet_url
    };

    if (client.google_sheet_url) {
      const match = client.google_sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        result.spreadsheetId = match[1];
        try {
          const syncResult = await sheetsService.syncCandidates(clientId, match[1], 'output');
          result.syncSuccess = true;
          result.syncResult = syncResult;
        } catch (error) {
          result.syncSuccess = false;
          result.syncError = error.message;
        }
      } else {
        result.error = 'Invalid Google Sheets URL format';
      }
    } else {
      result.error = 'No Google Sheets URL configured';
    }

    res.json(result);
  } catch (error) {
    res.json({ error: error.message });
  }
});

module.exports = router;