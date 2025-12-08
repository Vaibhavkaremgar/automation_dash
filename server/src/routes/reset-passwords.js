const express = require('express');
const bcrypt = require('bcryptjs');
const { get, run } = require('../db/connection');

const router = express.Router();

const resetHandler = async (req, res) => {
  try {
    const users = [
      { email: 'vaibhavkar0009@gmail.com', password: 'Vaibhav@121' },
      { email: 'kvreddy1809@gmail.com', password: 'kmg123' },
      { email: 'jobanputra@gmail.com', password: 'joban123' }
    ];
    
    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await run('UPDATE users SET password_hash = ? WHERE email = ?', [passwordHash, user.email]);
    }
    
    res.json({ message: 'Passwords reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/force-reset', resetHandler);
router.post('/force-reset', resetHandler);

module.exports = router;
