const { getDatabase } = require('../src/db/connection');

async function up() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.all(`PRAGMA table_info(message_logs)`, [], (err, columns) => {
        if (err) {
          console.error('Error checking message_logs columns:', err);
          return reject(err);
        }
        
        const colNames = columns.map(col => col.name);
        const hasChannel = colNames.includes('channel');
        const hasStatus = colNames.includes('status');
        const hasCustomerId = colNames.includes('customer_id');
        const hasCustomerNameFallback = colNames.includes('customer_name_fallback');
        
        if (!hasChannel || !hasStatus || !hasCustomerId) {
          console.log('Adding missing columns to message_logs...');
          
          const alterQueries = [];
          if (!hasChannel) alterQueries.push('ALTER TABLE message_logs ADD COLUMN channel TEXT');
          if (!hasStatus) alterQueries.push('ALTER TABLE message_logs ADD COLUMN status TEXT DEFAULT "sent"');
          if (!hasCustomerId) alterQueries.push('ALTER TABLE message_logs ADD COLUMN customer_id INTEGER');
          if (!hasCustomerNameFallback) alterQueries.push('ALTER TABLE message_logs ADD COLUMN customer_name_fallback TEXT');
          
          let completed = 0;
          alterQueries.forEach(query => {
            db.run(query, (err) => {
              if (err) {
                console.error('Error adding column:', err);
                return reject(err);
              }
              completed++;
              if (completed === alterQueries.length) {
                console.log('✅ message_logs columns added successfully');
                resolve();
              }
            });
          });
        } else {
          console.log('✅ message_logs table already has required columns');
          resolve();
        }
      });
    });
  });
}

module.exports = { up };
