const { getDatabase } = require('../src/db/connection');

async function up() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(message_logs)`, [], (err, columns) => {
      if (err) {
        console.error('Error checking message_logs columns:', err);
        return reject(err);
      }
      
      const hasClientKey = columns.some(col => col.name === 'client_key');
      
      if (!hasClientKey) {
        console.log('Adding client_key column to message_logs...');
        db.run('ALTER TABLE message_logs ADD COLUMN client_key TEXT', (err) => {
          if (err) {
            console.error('Error adding client_key column:', err);
            return reject(err);
          }
          console.log('✅ client_key column added to message_logs');
          resolve();
        });
      } else {
        console.log('✅ message_logs already has client_key column');
        resolve();
      }
    });
  });
}

module.exports = { up };