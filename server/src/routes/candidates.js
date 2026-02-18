const express = require('express');
const { authRequired } = require('../middleware/auth');
const { get, all, run } = require('../db/connection');
const sheetsService = require('../services/sheets');

const router = express.Router();

router.use(authRequired);

router.post('/sync', async (req, res, next) => {
  try {
    const spreadsheetId = '1amZkYzhw2lMmIbw0ftFAw8KJ1SX86zJ2rubWDQgs8CE';
    const result = await sheetsService.syncCandidates(req.user.id, spreadsheetId, 'output');
    
    const messages = [];
    if (result.imported > 0) messages.push(`${result.imported} added`);
    if (result.updated > 0) messages.push(`${result.updated} updated`);
    if (result.deleted > 0) messages.push(`${result.deleted} deleted`);
    
    const message = messages.length > 0 
      ? `Sync complete: ${messages.join(', ')}` 
      : 'No changes needed - already in sync';
    
    res.json({ message, ...result });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message || 'Sync failed' });
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { status, jobId, search } = req.query;
    
    let query = 'SELECT * FROM candidates WHERE user_id = ?';
    const params = [req.user.id];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    if (jobId) {
      query += ' AND job_id = ?';
      params.push(parseInt(jobId, 10));
    }
    
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const candidates = await all(query, params);
    res.json({ candidates });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const candidateId = parseInt(req.params.id, 10);
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Status required' });
    }
    
    const result = await run(
      'UPDATE candidates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [status, candidateId, req.user.id]
    );
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    
    const updated = await get('SELECT * FROM candidates WHERE id = ?', [candidateId]);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
