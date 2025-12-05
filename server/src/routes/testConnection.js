const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const sheetsService = require('../services/sheets');
const { getDatabase } = require('../db/connection');

const adminRequired = requireRole('admin');

const router = express.Router();

// Test Google Sheets connection for a specific client
router.get('/sheets/:clientId', authRequired, adminRequired, async (req, res) => {
  try {
    const { clientId } = req.params;
    const db = getDatabase();
    
    // Get client with sheet URL
    const client = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ? AND role = "client"', [clientId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!client) {
      return res.json({ 
        success: false, 
        error: 'Client not found' 
      });
    }

    if (!client.google_sheets_url) {
      return res.json({ 
        success: false, 
        error: 'No Google Sheets URL configured for this client',
        client: { name: client.name, email: client.email }
      });
    }

    // Extract spreadsheet ID
    const match = client.google_sheets_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return res.json({ 
        success: false, 
        error: 'Invalid Google Sheets URL format',
        url: client.google_sheets_url
      });
    }

    const spreadsheetId = match[1];
    
    try {
      // Test sync
      const result = await sheetsService.syncCandidates(clientId, spreadsheetId, 'output');
      
      res.json({
        success: true,
        client: { name: client.name, email: client.email },
        spreadsheetId,
        syncResult: result,
        message: `Successfully synced ${result.synced} candidates, skipped ${result.skipped}`
      });
    } catch (syncError) {
      res.json({
        success: false,
        client: { name: client.name, email: client.email },
        spreadsheetId,
        error: syncError.message,
        details: 'Make sure the Google Sheet is publicly accessible or shared with the service account'
      });
    }
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// List all clients and their sheet status
router.get('/clients-status', authRequired, adminRequired, async (req, res) => {
  try {
    const db = getDatabase();
    
    const clients = await new Promise((resolve, reject) => {
      db.all('SELECT id, name, email, google_sheets_url FROM users WHERE role = "client"', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const clientStatus = clients.map(client => ({
      id: client.id,
      name: client.name || client.email,
      email: client.email,
      hasSheetUrl: !!client.google_sheets_url,
      sheetUrl: client.google_sheets_url,
      spreadsheetId: client.google_sheets_url ? 
        (client.google_sheets_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/) || [])[1] : null
    }));

    res.json({ clients: clientStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;