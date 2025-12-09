const express = require('express');
const { authRequired } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');
const { enforceDataIsolation, validateProfileOwnership } = require('../middleware/dataIsolation');
const router = express.Router();

const db = getDatabase();

// Apply data isolation to all profile routes
router.use(authRequired, enforceDataIsolation);

// Get all profiles for current user
router.get('/', (req, res) => {
  db.all('SELECT * FROM user_profiles WHERE user_id = ? ORDER BY is_default DESC, last_used_at DESC', [req.user.id], (err, profiles) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(profiles);
  });
});

// Create new profile
router.post('/', (req, res) => {
  const { profile_name, avatar_color } = req.body;
  
  if (!profile_name || !profile_name.trim()) {
    return res.status(400).json({ error: 'Profile name is required' });
  }
  
  db.run(
    'INSERT INTO user_profiles (user_id, profile_name, avatar_color) VALUES (?, ?, ?)',
    [req.user.id, profile_name.trim(), avatar_color || '#6366f1'],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT * FROM user_profiles WHERE id = ?', [this.lastID], (err, profile) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json(profile);
      });
    }
  );
});

// Update profile
router.put('/:id', validateProfileOwnership, (req, res) => {
  const { profile_name, avatar_color } = req.body;
  
  db.run(
    'UPDATE user_profiles SET profile_name = ?, avatar_color = ? WHERE id = ? AND user_id = ?',
    [profile_name, avatar_color, req.params.id, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT * FROM user_profiles WHERE id = ?', [req.params.id], (err, profile) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(profile);
      });
    }
  );
});

// Delete profile
router.delete('/:id', validateProfileOwnership, (req, res) => {
  db.run('DELETE FROM user_profiles WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Select profile (update last_used_at)
router.post('/:id/select', validateProfileOwnership, (req, res) => {
  db.run(
    'UPDATE user_profiles SET last_used_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Get recent activity for profile
router.get('/:id/activity', validateProfileOwnership, (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  
  db.all(
    'SELECT * FROM activity_logs WHERE profile_id = ? ORDER BY created_at DESC LIMIT ?',
    [req.params.id, limit],
    (err, activities) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(activities);
    }
  );
});

// Get recent activity for user (all profiles)
router.get('/activity/all', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  
  db.all(
    `SELECT al.*, up.profile_name 
     FROM activity_logs al 
     LEFT JOIN user_profiles up ON al.profile_id = up.id 
     WHERE al.user_id = ? 
     ORDER BY al.created_at DESC 
     LIMIT ?`,
    [req.user.id, limit],
    (err, activities) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(activities);
    }
  );
});

module.exports = router;
