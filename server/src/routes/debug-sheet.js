const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const sheetsService = require('../services/sheets');

const router = express.Router();

router.use(authRequired);

router.get('/raw/:clientId', requireRole('admin'), async (req, res, next) => {
  try {
    const { getDatabase } = require('../db/connection');
    const db = getDatabase();
    const clientId = parseInt(req.params.clientId, 10);
    
    // Get client's sheet URL
    const client = await new Promise((resolve, reject) => {
      db.get('SELECT google_sheet_url FROM users WHERE id = ? AND role = "client"', [clientId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!client?.google_sheet_url) {
      return res.status(400).json({ error: 'No sheet URL found' });
    }

    const match = client.google_sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid sheet URL' });
    }

    const spreadsheetId = match[1];
    
    // Get raw sheet data
    const { google } = require('googleapis');
    const config = require('../config/env');
    
    if (!config.google.clientEmail || !config.google.privateKey) {
      return res.status(500).json({ error: 'Google credentials not configured' });
    }

    const auth = new google.auth.JWT(
      config.google.clientEmail,
      null,
      config.google.privateKey,
      ['https://www.googleapis.com/auth/spreadsheets.readonly']
    );
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'output!A:Z',
    });

    const rows = response.data.values || [];
    
    res.json({
      spreadsheetId,
      totalRows: rows.length,
      headers: rows[0] || [],
      sampleData: rows.slice(1, 4).map((row, index) => ({
        rowNumber: index + 2,
        columns: row.map((cell, colIndex) => ({
          column: String.fromCharCode(65 + colIndex),
          index: colIndex,
          value: cell || ''
        }))
      }))
    });
    
  } catch (error) {
    console.error('Debug sheet error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;