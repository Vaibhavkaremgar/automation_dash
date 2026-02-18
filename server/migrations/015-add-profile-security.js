const { getDatabase } = require('../src/db/connection');

async function up() {
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Add admin_password to users table
      db.run(`
        ALTER TABLE users ADD COLUMN admin_password TEXT;
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding admin_password:', err);
        }
      });

      // Create profiles table
      db.run(`
        CREATE TABLE IF NOT EXISTS client_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          profile_name TEXT NOT NULL,
          profile_password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(user_id, profile_name)
        );
      `, (err) => {
        if (err) {
          console.error('Error creating client_profiles table:', err);
          reject(err);
        } else {
          console.log('✅ Profile security migration completed');
          resolve();
        }
      });
    });
  });
}

async function down() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('DROP TABLE IF EXISTS client_profiles', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

module.exports = { up, down };
