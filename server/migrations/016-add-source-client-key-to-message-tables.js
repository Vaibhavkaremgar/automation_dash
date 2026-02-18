const { getDatabase } = require('../src/db/connection');

async function up() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Add source and client_key columns to kmg_message_logs
      db.all(`PRAGMA table_info(kmg_message_logs)`, [], (err, columns) => {
        if (err) {
          console.error('Error checking kmg_message_logs columns:', err);
          return reject(err);
        }
        
        const hasSource = columns.some(col => col.name === 'source');
        const hasClientKey = columns.some(col => col.name === 'client_key');
        
        if (!hasSource) {
          db.run('ALTER TABLE kmg_message_logs ADD COLUMN source TEXT DEFAULT "dashboard"', (err) => {
            if (err) console.error('Error adding source to kmg_message_logs:', err);
            else console.log('✅ Added source column to kmg_message_logs');
          });
        }
        
        if (!hasClientKey) {
          db.run('ALTER TABLE kmg_message_logs ADD COLUMN client_key TEXT DEFAULT "kmg"', (err) => {
            if (err) console.error('Error adding client_key to kmg_message_logs:', err);
            else console.log('✅ Added client_key column to kmg_message_logs');
          });
        }
      });

      // Add source and client_key columns to joban_message_logs
      db.all(`PRAGMA table_info(joban_message_logs)`, [], (err, columns) => {
        if (err) {
          console.error('Error checking joban_message_logs columns:', err);
          return reject(err);
        }
        
        const hasSource = columns.some(col => col.name === 'source');
        const hasClientKey = columns.some(col => col.name === 'client_key');
        
        if (!hasSource) {
          db.run('ALTER TABLE joban_message_logs ADD COLUMN source TEXT DEFAULT "dashboard"', (err) => {
            if (err) console.error('Error adding source to joban_message_logs:', err);
            else console.log('✅ Added source column to joban_message_logs');
          });
        }
        
        if (!hasClientKey) {
          db.run('ALTER TABLE joban_message_logs ADD COLUMN client_key TEXT DEFAULT "joban"', (err) => {
            if (err) {
              console.error('Error adding client_key to joban_message_logs:', err);
              reject(err);
            } else {
              console.log('✅ Added client_key column to joban_message_logs');
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  });
}

module.exports = { up };