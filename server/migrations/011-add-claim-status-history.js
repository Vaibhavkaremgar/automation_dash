const { getDatabase } = require('../src/db/connection');

async function up() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS claim_status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        claim_id INTEGER NOT NULL,
        old_status TEXT,
        new_status TEXT,
        notes TEXT,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (claim_id) REFERENCES insurance_claims(id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) {
        console.error('Error creating claim_status_history:', err);
        return reject(err);
      }
      console.log('✅ claim_status_history table created');
      resolve();
    });
  });
}

module.exports = { up };
