const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');

const router = express.Router();

router.use(authRequired);

// Debug endpoint to check data consistency
router.get('/data-check', async (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.user.id;
    
    console.log('=== DEBUG DATA CHECK ===');
    console.log('User ID:', userId);
    
    // Check user configuration
    const user = await new Promise((resolve) => {
      db.get(
        'SELECT id, email, google_sheet_url FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) {
            console.error('User query error:', err);
            resolve(null);
          } else {
            resolve(row);
          }
        }
      );
    });
    
    // Check candidates table
    const candidates = await new Promise((resolve) => {
      db.all(
        'SELECT id, name, email, status, match_score, created_at FROM candidates WHERE user_id = ?',
        [userId],
        (err, rows) => {
          if (err) {
            console.error('Candidates query error:', err);
            resolve([]);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
    
    // Check jobs table
    const jobs = await new Promise((resolve) => {
      db.all(
        'SELECT id, title, status, created_at FROM jobs WHERE user_id = ?',
        [userId],
        (err, rows) => {
          if (err) {
            console.error('Jobs query error:', err);
            resolve([]);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
    
    console.log('User config:', user);
    console.log('Candidates found:', candidates.length);
    console.log('Jobs found:', jobs.length);
    
    if (candidates.length > 0) {
      console.log('First candidate:', candidates[0]);
    }
    
    res.json({
      userId,
      user,
      candidates: {
        count: candidates.length,
        data: candidates
      },
      jobs: {
        count: jobs.length,
        data: jobs
      }
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;