const { getDatabase, all } = require('../src/db/connection');

async function up() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // First, check if company_name column exists
      db.all(`PRAGMA table_info(users)`, (err, columns) => {
        if (err) {
          console.error('Error checking table structure:', err);
          reject(err);
          return;
        }
        
        const hasCompanyName = columns.some(col => col.name === 'company_name');
        
        if (!hasCompanyName) {
          console.log('⚠️  company_name column does not exist, skipping migration');
          console.log('ℹ️  Column will be created by main migrations');
          resolve();
          return;
        }
        
        console.log('✅ company_name column exists, running migration...');
        
        // Update Joban users
        db.run(`
          UPDATE users 
          SET company_name = 'Joban Putra Insurance' 
          WHERE client_type = 'insurance' 
          AND (
            LOWER(email) LIKE '%joban%' 
            OR LOWER(email) LIKE '%jobanputra%'
          )
        `, (err) => {
          if (err) {
            console.error('Error updating Joban users:', err);
          } else {
            console.log('✅ Updated Joban users');
          }
        });

        // Update KMG users
        db.run(`
          UPDATE users 
          SET company_name = 'KMG Insurance' 
          WHERE client_type = 'insurance' 
          AND LOWER(email) LIKE '%kmg%'
        `, (err) => {
          if (err) {
            console.error('Error updating KMG users:', err);
          } else {
            console.log('✅ Updated KMG users');
          }
        });

        // Verify
        db.all(`
          SELECT id, email, company_name, client_type 
          FROM users 
          WHERE client_type = 'insurance'
        `, (err, rows) => {
          if (err) {
            console.error('Error verifying:', err);
          } else {
            console.log('📋 Insurance users after migration:');
            rows.forEach(row => {
              console.log(`  - ${row.email} → ${row.company_name}`);
            });
          }
          resolve();
        });
      });
    });
  });
}

async function down() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE users 
      SET company_name = NULL 
      WHERE client_type = 'insurance'
    `, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = { up, down };
