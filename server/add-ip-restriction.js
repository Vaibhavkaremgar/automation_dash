const { getDatabase } = require('./src/db/connection');

const db = getDatabase();

// Add IP 0.0.0.0 for KMG user
const kmgEmail = 'kvreddy1809@gmail.com';

db.get('SELECT id FROM users WHERE email = ?', [kmgEmail], (err, user) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  if (!user) {
    console.error('User not found');
    process.exit(1);
  }
  
  // Check if IP already exists
  db.get('SELECT id FROM user_ip_allowlist WHERE user_id = ? AND ip_address = ?', [user.id, '0.0.0.0'], (err, existing) => {
    if (err) {
      console.error('Error:', err);
      process.exit(1);
    }
    
    if (existing) {
      console.log('✅ IP 0.0.0.0 already exists for', kmgEmail);
      process.exit(0);
    }
    
    // Add IP
    db.run('INSERT INTO user_ip_allowlist (user_id, ip_address) VALUES (?, ?)', [user.id, '0.0.0.0'], (err) => {
      if (err) {
        console.error('Error adding IP:', err);
        process.exit(1);
      }
      
      console.log('✅ Added IP 0.0.0.0 for', kmgEmail);
      
      // Update max_sessions to 5
      db.run('UPDATE users SET max_sessions = 5 WHERE id = ?', [user.id], (err) => {
        if (err) {
          console.error('Error updating max_sessions:', err);
          process.exit(1);
        }
        console.log('✅ Set max_sessions to 5 for', kmgEmail);
        process.exit(0);
      });
    });
  });
});
