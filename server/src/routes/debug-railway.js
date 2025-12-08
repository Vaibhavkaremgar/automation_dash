const express = require('express');
const { get, all } = require('../db/connection');
const router = express.Router();

router.get('/railway-check', async (req, res) => {
  const checks = {
    environment: process.env.NODE_ENV,
    hasGooglePrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
    googlePrivateKeyValid: process.env.GOOGLE_PRIVATE_KEY?.includes('BEGIN PRIVATE KEY'),
    hasKmgSheetId: !!process.env.KMG_INSURANCE_SHEETS_SPREADSHEET_ID,
    kmgSheetId: process.env.KMG_INSURANCE_SHEETS_SPREADSHEET_ID || 'NOT SET',
    hasJobanSheetId: !!process.env.JOBAN_INSURANCE_SHEETS_SPREADSHEET_ID,
    jobanSheetId: process.env.JOBAN_INSURANCE_SHEETS_SPREADSHEET_ID || 'NOT SET',
    dbPath: process.env.DB_PATH,
  };

  try {
    // Check users
    const users = await all('SELECT id, email, name, status, google_sheet_url FROM users');
    checks.users = users.map(u => ({
      email: u.email,
      name: u.name,
      status: u.status,
      hasSheetUrl: !!u.google_sheet_url
    }));

    // Check tables
    const tables = await all("SELECT name FROM sqlite_master WHERE type='table'");
    checks.tables = tables.map(t => t.name);

    // Check renewal_reminders columns
    const cols = await all('PRAGMA table_info(renewal_reminders)');
    checks.renewalRemindersCols = cols.map(c => c.name);

    // Check customer count
    const customerCount = await get('SELECT COUNT(*) as count FROM insurance_customers');
    checks.totalCustomers = customerCount.count;

  } catch (err) {
    checks.dbError = err.message;
  }

  res.json(checks);
});

module.exports = router;
