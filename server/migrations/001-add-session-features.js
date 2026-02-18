const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function runMigration() {
  const dbPath = path.join(__dirname, '../../data/hirehero.db');
  const db = new sqlite3.Database(dbPath);

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('🔄 Running session features migration...');

      // 1. Add max_sessions to users table
      db.run(`ALTER TABLE users ADD COLUMN max_sessions INTEGER DEFAULT 5`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding max_sessions:', err.message);
        } else {
          console.log('✅ Added max_sessions column to users');
        }
      });

      // 2. Create user_ip_allowlist table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_ip_allowlist (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          ip_address TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating user_ip_allowlist:', err.message);
        } else {
          console.log('✅ Created user_ip_allowlist table');
        }
      });

      // 3. Create sessions table
      db.run(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL,
          token TEXT NOT NULL,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating sessions:', err.message);
        } else {
          console.log('✅ Created sessions table');
        }
      });

      // 4. Set max_sessions = 9999 for admin users
      db.run(`UPDATE users SET max_sessions = 9999 WHERE role = 'admin'`, (err) => {
        if (err) {
          console.error('Error updating admin max_sessions:', err.message);
        } else {
          console.log('✅ Set admin users to unlimited sessions (9999)');
        }
      });

      // 5. Enable WAL mode for better concurrency
      db.run(`PRAGMA journal_mode=WAL`, (err) => {
        if (err) {
          console.error('Error enabling WAL:', err.message);
        } else {
          console.log('✅ Enabled WAL mode');
        }
      });

      db.run(`PRAGMA synchronous=NORMAL`, (err) => {
        if (err) {
          console.error('Error setting synchronous:', err.message);
        } else {
          console.log('✅ Set synchronous mode to NORMAL');
        }

        db.close((err) => {
          if (err) reject(err);
          else {
            console.log('✅ Migration completed successfully');
            resolve();
          }
        });
      });
    });
  });
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigration };
