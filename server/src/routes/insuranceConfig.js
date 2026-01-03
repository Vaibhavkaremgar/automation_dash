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
    
    // Get vertical from query param, default to 'general'
    const vertical = req.query.vertical || 'general';
    const tabConfig = config.tabs?.[vertical] || config.tabs?.general;
    
    // Try to get sheet headers for the requested vertical
    let sheetHeaders = [];
    try {
      const { getSheetHeaders } = require('../services/sheetFieldsService');
      const tabName = tabConfig?.tab || 'general_ins';
      sheetHeaders = await getSheetHeaders(config.spreadsheetId, tabName);
      console.log(`📋 Loaded ${sheetHeaders.length} headers for ${vertical} from tab: ${tabName}`);
    } catch (err) {
      console.error('Failed to fetch sheet headers:', err.message);
    }
    
    res.json({
      clientKey: config.key,
      name: config.name,
      spreadsheetId: config.spreadsheetId,
      tabName: tabConfig?.tab || 'general_ins',
      tabs: config.tabs,
      sheetHeaders: sheetHeaders,
      vertical: vertical
    });
  } catch (error) {
    console.error('Insurance config error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
