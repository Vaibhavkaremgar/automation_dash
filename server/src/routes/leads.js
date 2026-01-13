const express = require('express');
const router = express.Router();
const { run, get, all } = require('../db/connection');
const { authRequired } = require('../middleware/auth');
const insuranceSync = require('../services/insuranceSync');
const { getClientConfig } = require('../config/insuranceClients');

// Get all leads
router.get('/', authRequired, async (req, res) => {
  try {
    const leads = await all('SELECT * FROM insurance_leads WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Add new lead
router.post('/', authRequired, async (req, res) => {
  try {
    const { name, mobile_number, email, interested_in, policy_expiry_date, follow_up_date, lead_status, priority, notes, referral_by } = req.body;
    
    const result = await run(`
      INSERT INTO insurance_leads (user_id, name, mobile_number, email, interested_in, policy_expiry_date, follow_up_date, lead_status, priority, notes, referral_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [req.user.id, name, mobile_number, email || '', interested_in || '', policy_expiry_date || '', follow_up_date || '', lead_status || 'new', priority || 'warm', notes || '', referral_by || '']);
    
    const newLead = await get('SELECT * FROM insurance_leads WHERE id = ?', [result.lastID]);
    res.json(newLead);
  } catch (error) {
    console.error('Error adding lead:', error);
    res.status(500).json({ error: 'Failed to add lead' });
  }
});

// Update lead
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { name, mobile_number, email, interested_in, policy_expiry_date, follow_up_date, lead_status, priority, notes, referral_by } = req.body;
    
    await run(`
      UPDATE insurance_leads 
      SET name = ?, mobile_number = ?, email = ?, interested_in = ?, policy_expiry_date = ?, follow_up_date = ?, lead_status = ?, priority = ?, notes = ?, referral_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [name, mobile_number, email || '', interested_in || '', policy_expiry_date || '', follow_up_date || '', lead_status || 'new', priority || 'warm', notes || '', referral_by || '', req.params.id, req.user.id]);
    
    const updatedLead = await get('SELECT * FROM insurance_leads WHERE id = ?', [req.params.id]);
    res.json(updatedLead);
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Delete lead
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const lead = await get('SELECT * FROM insurance_leads WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    await run('DELETE FROM insurance_leads WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Lead deleted', lead });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Sync leads from sheet
router.post('/sync-from-sheet', authRequired, async (req, res) => {
  try {
    const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
    const clientConfig = getClientConfig(user?.email);
    const spreadsheetId = clientConfig.spreadsheetId;
    const tabName = clientConfig.tabs.leads.tabName;
    
    const result = await insuranceSync.syncLeadsFromSheet(req.user.id, spreadsheetId, tabName);
    res.json(result);
  } catch (error) {
    console.error('Error syncing from sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync leads to sheet
router.post('/sync-to-sheet', authRequired, async (req, res) => {
  try {
    const { deletedLeads = [] } = req.body;
    const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
    const clientConfig = getClientConfig(user?.email);
    const spreadsheetId = clientConfig.spreadsheetId;
    const tabName = clientConfig.tabs.leads.tabName;
    
    const result = await insuranceSync.syncLeadsToSheet(req.user.id, spreadsheetId, tabName, deletedLeads);
    res.json(result);
  } catch (error) {
    console.error('Error syncing to sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
