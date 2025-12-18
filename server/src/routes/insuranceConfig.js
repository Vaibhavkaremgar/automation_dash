const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getClientConfig } = require('../config/insuranceClients');
const router = express.Router();

// Get client-specific configuration
router.get('/config', authRequired, async (req, res) => {
  try {
    const { get } = require('../db/connection');
    const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
    const config = getClientConfig(user.email);
    
    // Try to get sheet headers for general tab
    let sheetHeaders = [];
    try {
      const { getSheetHeaders } = require('../services/sheetFieldsService');
      const generalTab = config.tabs?.general?.tab || 'general_ins';
      sheetHeaders = await getSheetHeaders(config.spreadsheetId, generalTab);
    } catch (err) {
      console.error('Failed to fetch sheet headers:', err.message);
    }
    
    res.json({
      clientKey: config.key,
      name: config.name,
      spreadsheetId: config.spreadsheetId,
      tabName: config.tabs?.general?.tab || 'general_ins',
      tabs: config.tabs,
      sheetHeaders: sheetHeaders
    });
  } catch (error) {
    console.error('Insurance config error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
