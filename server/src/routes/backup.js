const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const { manualBackup } = require('../services/backupScheduler');

const router = express.Router();

// Manual backup trigger (admin only)
router.post('/trigger', authRequired, requireRole('admin'), async (req, res, next) => {
  try {
    await manualBackup();
    res.json({ success: true, message: 'Backup triggered successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
