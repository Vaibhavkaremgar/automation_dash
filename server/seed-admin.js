const bcrypt = require('bcryptjs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'data', 'hirehero.db');
const db = new sqlite3.Database(dbPath);

async function seedAdmin() {
  console.log('Seeding admin user...');
  
  const email = 'vaibhavkar0009@gmail.com';
  const password = 'Vaibhav@121';
  const name = 'Admin';
  
  return new Promise((resolve, reject) => {
    // Check if admin exists
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, existing) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (existing) {
        console.log('✓ Admin user already exists');
        
        // Update Google Sheets URL if missing
        if (!existing.google_sheet_url) {
          const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/1amZkYzhw2lMmIbw0ftFAw8KJ1SX86zJ2rubWDQgs8CE/edit';
          db.run(
            'UPDATE users SET google_sheet_url = ? WHERE id = ?',
            [googleSheetUrl, existing.id],
            (err) => {
              if (err) {
                console.error('Failed to update Google Sheets URL:', err);
              } else {
                console.log('✓ Updated admin user with Google Sheets URL');
              }
              resolve();
            }
          );
        } else {
          resolve();
        }
        return;
      }
      
      // Create admin
      const passwordHash = await bcrypt.hash(password, 10);
      const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/1amZkYzhw2lMmIbw0ftFAw8KJ1SX86zJ2rubWDQgs8CE/edit';
      
      db.run(
        'INSERT INTO users (email, password_hash, name, role, google_sheet_url) VALUES (?, ?, ?, ?, ?)',
        [email, passwordHash, name, 'admin', googleSheetUrl],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          const userId = this.lastID;
          
          // Create wallet
          db.run('INSERT INTO wallets (user_id, balance_cents) VALUES (?, ?)', [userId, 0], (err) => {
            if (err) {
              reject(err);
              return;
            }
            
            console.log('✅ Admin user created successfully!');
            console.log(`Email: ${email}`);
            console.log(`Password: ${password}`);
            resolve();
          });
        }
      );
    });
  });
}

seedAdmin()
  .then(() => {
    db.close(() => {
      process.exit(0);
    });
  })
  .catch(err => {
    console.error('Error seeding admin:', err);
    db.close(() => {
      process.exit(1);
    });
  });
