const { getDatabase } = require('../src/db/connection');

async function up() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create user_profiles table
      db.run(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          profile_name TEXT NOT NULL,
          avatar_color TEXT DEFAULT '#6366f1',
          is_default INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating user_profiles:', err);
          return reject(err);
        }
        console.log('✅ user_profiles table created');
        
        // Create activity_logs table
        db.run(`
          CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            profile_id INTEGER,
            activity_type TEXT NOT NULL,
            activity_description TEXT,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (profile_id) REFERENCES user_profiles(id) ON DELETE SET NULL
          )
        `, (err) => {
          if (err) {
            console.error('Error creating activity_logs:', err);
            return reject(err);
          }
          console.log('✅ activity_logs table created');
          resolve();
        });
      });
    });
  });
}

module.exports = { up };
