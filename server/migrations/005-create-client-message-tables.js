const { getDatabase } = require('../src/db/connection');

async function up() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create KMG message logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS kmg_message_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER,
          customer_name TEXT,
          customer_mobile TEXT,
          message_type TEXT,
          channel TEXT DEFAULT 'whatsapp',
          message_content TEXT,
          status TEXT DEFAULT 'sent',
          sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES insurance_customers(id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) {
          console.error('Error creating kmg_message_logs:', err);
          reject(err);
        } else {
          console.log('✅ Created kmg_message_logs table');
        }
      });

      // Create Joban message logs table
      db.run(`
        CREATE TABLE IF NOT EXISTS joban_message_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER,
          customer_name TEXT,
          customer_mobile TEXT,
          message_type TEXT,
          channel TEXT DEFAULT 'whatsapp',
          message_content TEXT,
          status TEXT DEFAULT 'sent',
          sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (customer_id) REFERENCES insurance_customers(id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) {
          console.error('Error creating joban_message_logs:', err);
          reject(err);
        } else {
          console.log('✅ Created joban_message_logs table');
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
      db.run('DROP TABLE IF EXISTS kmg_message_logs');
      db.run('DROP TABLE IF EXISTS joban_message_logs', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

module.exports = { up, down };
