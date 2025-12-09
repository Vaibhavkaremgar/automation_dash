require('dotenv').config();
const { getDatabase } = require('./src/db/connection');
const db = getDatabase();

console.log('\n=== Database Cleanup Script ===\n');

// Keep only these 3 users
const keepEmails = [
  'vaibhavkar0009@gmail.com',
  'kvreddy1809@gmail.com', 
  'jobanputra@gmail.com'
];

db.serialize(() => {
  // Get users to keep
  db.all('SELECT id, email FROM users WHERE email IN (?, ?, ?)', keepEmails, (err, keepUsers) => {
    if (err) {
      console.error('Error:', err);
      return;
    }

    console.log('Users to KEEP:');
    keepUsers.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`));

    const keepIds = keepUsers.map(u => u.id);

    // Get users to delete
    db.all('SELECT id, email FROM users WHERE email NOT IN (?, ?, ?)', keepEmails, (err, deleteUsers) => {
      if (err) {
        console.error('Error:', err);
        return;
      }

      console.log('\nUsers to DELETE:');
      if (deleteUsers.length === 0) {
        console.log('  None');
      } else {
        deleteUsers.forEach(u => console.log(`  - ${u.email} (ID: ${u.id})`));
      }

      // Clear message logs
      console.log('\n--- Clearing message_logs table ---');
      db.run('DELETE FROM message_logs', function(err) {
        if (err) console.error('Error clearing message_logs:', err);
        else console.log(`✓ Deleted ${this.changes} message logs`);

        // Delete data for users not in keep list
        if (deleteUsers.length > 0) {
          const deleteIds = deleteUsers.map(u => u.id);
          const placeholders = deleteIds.map(() => '?').join(',');

          console.log('\n--- Deleting data for removed users ---');

          // Delete insurance customers
          db.run(`DELETE FROM insurance_customers WHERE user_id IN (${placeholders})`, deleteIds, function(err) {
            if (err) console.error('Error deleting customers:', err);
            else console.log(`✓ Deleted ${this.changes} insurance customers`);
          });

          // Delete insurance claims
          db.run(`DELETE FROM insurance_claims WHERE user_id IN (${placeholders})`, deleteIds, function(err) {
            if (err) console.error('Error deleting claims:', err);
            else console.log(`✓ Deleted ${this.changes} insurance claims`);
          });

          // Delete profiles
          db.run(`DELETE FROM user_profiles WHERE user_id IN (${placeholders})`, deleteIds, function(err) {
            if (err) console.error('Error deleting profiles:', err);
            else console.log(`✓ Deleted ${this.changes} user profiles`);
          });

          // Delete sessions
          db.run(`DELETE FROM user_sessions WHERE user_id IN (${placeholders})`, deleteIds, function(err) {
            if (err) console.error('Error deleting sessions:', err);
            else console.log(`✓ Deleted ${this.changes} user sessions`);
          });

          // Delete users
          db.run(`DELETE FROM users WHERE id IN (${placeholders})`, deleteIds, function(err) {
            if (err) console.error('Error deleting users:', err);
            else console.log(`✓ Deleted ${this.changes} users`);

            console.log('\n=== Cleanup Complete ===\n');
            process.exit(0);
          });
        } else {
          console.log('\n=== Cleanup Complete ===\n');
          process.exit(0);
        }
      });
    });
  });
});
