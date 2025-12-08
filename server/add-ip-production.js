// Run this script on Railway to add IP restriction
// Railway CLI: railway run node add-ip-production.js

const { getDatabase } = require('./src/db/connection');

const db = getDatabase();

const kmgEmail = 'kvreddy1809@gmail.com';
const restrictedIP = '0.0.0.0'; // This IP will block login from all IPs

console.log('Adding IP restriction for KMG Insurance...');

db.get('SELECT id FROM users WHERE email = ?', [kmgEmail], (err, user) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  if (!user) {
    console.error('User not found:', kmgEmail);
    process.exit(1);
  }
  
  console.log('Found user ID:', user.id);
  
  // Delete existing IPs first
  db.run('DELETE FROM user_ip_allowlist WHERE user_id = ?', [user.id], (err) => {
    if (err) {
      console.error('Error deleting old IPs:', err);
      process.exit(1);
    }
    
    console.log('Cleared old IP restrictions');
    
    // Add the restricted IP
    db.run('INSERT INTO user_ip_allowlist (user_id, ip_address) VALUES (?, ?)', [user.id, restrictedIP], (err) => {
      if (err) {
        console.error('Error adding IP:', err);
        process.exit(1);
      }
      
      console.log('✅ Added IP restriction:', restrictedIP);
      console.log('✅ KMG user will now be blocked from logging in (IP 0.0.0.0 is invalid)');
      
      // Update max_sessions
      db.run('UPDATE users SET max_sessions = 5 WHERE id = ?', [user.id], (err) => {
        if (err) {
          console.error('Error updating max_sessions:', err);
          process.exit(1);
        }
        console.log('✅ Set max_sessions to 5');
        
        // Verify
        db.get('SELECT * FROM user_ip_allowlist WHERE user_id = ?', [user.id], (err, row) => {
          if (err) {
            console.error('Error verifying:', err);
            process.exit(1);
          }
          console.log('\n📋 Current IP allowlist:', row);
          process.exit(0);
        });
      });
    });
  });
});
