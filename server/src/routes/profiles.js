const express = require('express');
const bcrypt = require('bcryptjs');
const { authRequired } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');
const router = express.Router();

const db = getDatabase();

// Get all profiles for current user
router.get('/', authRequired, (req, res) => {
  db.all(`
    SELECT id, profile_name, role, created_at 
    FROM client_profiles 
    WHERE user_id = ?
    ORDER BY role DESC, profile_name ASC
  `, [req.user.id], (err, profiles) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(profiles || []);
  });
});

// Create new profile
router.post('/', authRequired, async (req, res) => {
  try {
    const { profile_name, profile_password, role } = req.body;
    
    console.log('Create profile request:', { profile_name, role, user_id: req.user.id });
    
    if (!profile_name || !profile_password) {
      console.log('Missing profile_name or profile_password');
      return res.status(400).json({ error: 'Profile name and password required' });
    }

    // Check profile limit
    const count = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM client_profiles WHERE user_id = ?', [req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row?.count || 0);
      });
    });

    console.log('Current profile count:', count);

    if (count >= 5) {
      return res.status(400).json({ error: 'Maximum 5 profiles allowed (1 admin + 4 users)' });
    }

    // Check if admin already exists
    if (role === 'admin') {
      const adminExists = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM client_profiles WHERE user_id = ? AND role = ?', [req.user.id, 'admin'], (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        });
      });

      if (adminExists) {
        return res.status(400).json({ error: 'Admin profile already exists' });
      }
    }

    const hashedPassword = await bcrypt.hash(profile_password, 10);
    console.log('Password hashed, inserting profile...');

    db.run(`
      INSERT INTO client_profiles (user_id, profile_name, profile_password, role)
      VALUES (?, ?, ?, ?)
    `, [req.user.id, profile_name, hashedPassword, role || 'user'], function(err) {
      if (err) {
        console.error('Insert error:', err);
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Profile name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }

      console.log('Profile created with ID:', this.lastID);

      db.get('SELECT id, profile_name, role, created_at FROM client_profiles WHERE id = ?', [this.lastID], (err, profile) => {
        if (err) {
          console.error('Fetch error:', err);
          return res.status(500).json({ error: err.message });
        }
        console.log('Profile created successfully:', profile);
        res.status(201).json(profile);
      });
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/verify', authRequired, async (req, res) => {
  try {
    const { profile_id, password } = req.body;

    console.log('Verify password request:', { profile_id, user_id: req.user.id });

    if (!profile_id || !password) {
      return res.status(400).json({ error: 'Profile ID and password required' });
    }

    // Get profile
    const profile = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM client_profiles WHERE id = ? AND user_id = ?', [profile_id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!profile) {
      console.log('Profile not found');
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log('Profile found:', profile.profile_name, 'Role:', profile.role);
    console.log('Entered password length:', password.length);

    // Check admin profile password FIRST (master key)
    const adminProfile = await new Promise((resolve, reject) => {
      db.get('SELECT profile_password FROM client_profiles WHERE user_id = ? AND role = ?', [req.user.id, 'admin'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    console.log('Admin profile exists:', !!adminProfile);

    if (adminProfile && adminProfile.profile_password) {
      const adminMatch = await bcrypt.compare(password, adminProfile.profile_password);
      console.log('Admin profile password match:', adminMatch);
      
      if (adminMatch) {
        console.log('✅ Access granted via ADMIN PROFILE password (master key)');
        return res.json({ success: true, profile: { id: profile.id, profile_name: profile.profile_name, role: profile.role, is_admin: profile.role === 'admin' ? 1 : 0 }, admin_access: true });
      }
    }

    // Check profile password
    console.log('Profile password hash (first 20 chars):', profile.profile_password.substring(0, 20));
    const profileMatch = await bcrypt.compare(password, profile.profile_password);
    console.log('Profile password match:', profileMatch);
    
    if (profileMatch) {
      console.log('✅ Access granted via PROFILE password');
      return res.json({ success: true, profile: { id: profile.id, profile_name: profile.profile_name, role: profile.role, is_admin: profile.role === 'admin' ? 1 : 0 } });
    }

    console.log('❌ Password verification failed - neither admin nor profile password matched');
    res.status(401).json({ error: 'Invalid password' });
  } catch (error) {
    console.error('Verify password error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set admin password
router.post('/set-admin-password', authRequired, async (req, res) => {
  try {
    const { admin_password } = req.body;

    if (!admin_password) {
      return res.status(400).json({ error: 'Admin password required' });
    }

    const hashedPassword = await bcrypt.hash(admin_password, 10);

    db.run('UPDATE users SET admin_password = ? WHERE id = ?', [hashedPassword, req.user.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, message: 'Admin password set successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset profile password (forgot password)
router.post('/reset-password', authRequired, async (req, res) => {
  try {
    const { profile_id, admin_password, new_password } = req.body;

    if (!profile_id || !admin_password || !new_password) {
      return res.status(400).json({ error: 'Profile ID, admin password, and new password required' });
    }

    // Verify admin profile password (master password)
    const adminProfile = await new Promise((resolve, reject) => {
      db.get('SELECT profile_password FROM client_profiles WHERE user_id = ? AND role = ?', [req.user.id, 'admin'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!adminProfile || !adminProfile.profile_password) {
      return res.status(403).json({ error: 'Admin profile not found. Create an admin profile first.' });
    }

    const adminMatch = await bcrypt.compare(admin_password, adminProfile.profile_password);
    if (!adminMatch) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // Reset profile password
    const hashedPassword = await bcrypt.hash(new_password, 10);
    db.run('UPDATE client_profiles SET profile_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', 
      [hashedPassword, profile_id, req.user.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Profile not found' });
      res.json({ success: true, message: 'Password reset successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get profile activity
router.get('/:id/activity', authRequired, (req, res) => {
  const limit = 10;
  
  db.all(`
    SELECT * FROM activity_logs
    WHERE user_id = ? AND profile_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `, [req.user.id, req.params.id, limit], (err, activities) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(activities || []);
  });
});

// Update profile
router.put('/:id', authRequired, async (req, res) => {
  try {
    const { profile_name, password } = req.body;
    
    if (!profile_name || !password) {
      return res.status(400).json({ error: 'Profile name and password required' });
    }

    // Get profile
    const profile = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM client_profiles WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, profile.profile_password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Update profile name
    db.run('UPDATE client_profiles SET profile_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', 
      [profile_name, req.params.id, req.user.id], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Profile name already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, message: 'Profile updated successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete profile
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const { admin_password } = req.body;
    
    if (!admin_password) {
      return res.status(400).json({ error: 'Admin password required' });
    }

    // Verify admin profile password
    const adminProfile = await new Promise((resolve, reject) => {
      db.get('SELECT profile_password FROM client_profiles WHERE user_id = ? AND role = ?', [req.user.id, 'admin'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!adminProfile || !adminProfile.profile_password) {
      return res.status(403).json({ error: 'Admin profile not found' });
    }

    const adminMatch = await bcrypt.compare(admin_password, adminProfile.profile_password);
    if (!adminMatch) {
      return res.status(401).json({ error: 'Invalid admin password' });
    }

    // Delete profile
    db.run('DELETE FROM client_profiles WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Profile not found' });
      res.json({ success: true, message: 'Profile deleted successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
