const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/hirehero.db');
const db = new sqlite3.Database(dbPath);

async function fixDashboard() {
  console.log('\n🔧 Fixing HR Agent Dashboard...\n');
  
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      // 1. Update user credentials and google_sheet_url
      console.log('1️⃣ Updating user credentials and sheet URLs...');
      
      const users = [
        {
          email: 'vaibhavkar0009@gmail.com',
          password: 'Vaibhav@121',
          name: 'Admin',
          role: 'admin',
          client_type: 'hr',
          google_sheet_url: 'https://docs.google.com/spreadsheets/d/1amZkYzhw2lMmIbw0ftFAw8KJ1SX86zJ2rubWDQgs8CE/edit',
          status: 'active'
        },
        {
          email: 'kvreddy1809@gmail.com',
          password: 'kmg123',
          name: 'KMG Insurance',
          role: 'client',
          client_type: 'insurance',
          google_sheet_url: 'https://docs.google.com/spreadsheets/d/1EpMAg1gSXPKr83cTugvGexrqv3Yt5Tb85Re2Shah8mw/edit',
          status: 'active'
        },
        {
          email: 'jobanputra@gmail.com',
          password: 'joban123',
          name: 'Joban Putra Insurance Shoppe',
          role: 'client',
          client_type: 'insurance',
          google_sheet_url: 'https://docs.google.com/spreadsheets/d/1oX5MGRMo6oz87ivTXeMOy6vtIDPJXXawz_lGqmOvUEo/edit',
          status: 'active'
        }
      ];
      
      for (const user of users) {
        const passwordHash = await bcrypt.hash(user.password, 10);
        
        db.run(`
          UPDATE users 
          SET password_hash = ?, 
              google_sheet_url = ?, 
              status = ?,
              client_type = ?,
              name = ?
          WHERE email = ?
        `, [passwordHash, user.google_sheet_url, user.status, user.client_type, user.name, user.email], (err) => {
          if (err) {
            console.error(`   ❌ Failed to update ${user.email}:`, err.message);
          } else {
            console.log(`   ✅ Updated ${user.email}`);
          }
        });
      }
      
      // 2. Ensure all required tables exist
      console.log('\n2️⃣ Checking database tables...');
      
      // Check insurance_customers table
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='insurance_customers'", (err, row) => {
        if (row) {
          console.log('   ✅ insurance_customers table exists');
        } else {
          console.log('   ⚠️  insurance_customers table missing');
        }
      });
      
      // Check message_logs table
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='message_logs'", (err, row) => {
        if (row) {
          console.log('   ✅ message_logs table exists');
        } else {
          console.log('   ⚠️  message_logs table missing');
        }
      });
      
      // Check renewal_reminders table
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='renewal_reminders'", (err, row) => {
        if (row) {
          console.log('   ✅ renewal_reminders table exists');
        } else {
          console.log('   ⚠️  renewal_reminders table missing');
        }
      });
      
      // Check insurance_claims table
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='insurance_claims'", (err, row) => {
        if (row) {
          console.log('   ✅ insurance_claims table exists');
        } else {
          console.log('   ⚠️  insurance_claims table missing - creating...');
          db.run(`
            CREATE TABLE IF NOT EXISTS insurance_claims (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              customer_id INTEGER NOT NULL,
              policy_number TEXT,
              insurance_company TEXT,
              vehicle_number TEXT,
              claim_type TEXT,
              incident_date TEXT,
              description TEXT,
              claim_amount REAL,
              claim_status TEXT DEFAULT 'filed',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
              FOREIGN KEY (customer_id) REFERENCES insurance_customers(id) ON DELETE CASCADE
            )
          `, (err) => {
            if (err) console.error('   ❌ Failed to create insurance_claims:', err.message);
            else console.log('   ✅ Created insurance_claims table');
          });
        }
      });
      
      // Check claim_status_history table
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='claim_status_history'", (err, row) => {
        if (!row) {
          console.log('   ⚠️  claim_status_history table missing - creating...');
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
            if (err) console.error('   ❌ Failed to create claim_status_history:', err.message);
            else console.log('   ✅ Created claim_status_history table');
          });
        }
      });
      
      // 3. Check customer counts
      setTimeout(() => {
        console.log('\n3️⃣ Checking customer data...');
        
        db.get('SELECT COUNT(*) as count FROM insurance_customers WHERE user_id = (SELECT id FROM users WHERE email = ?)', ['kvreddy1809@gmail.com'], (err, row) => {
          if (err) {
            console.error('   ❌ Error checking KMG customers:', err.message);
          } else {
            console.log(`   📊 KMG Insurance: ${row.count} customers`);
          }
        });
        
        db.get('SELECT COUNT(*) as count FROM insurance_customers WHERE user_id = (SELECT id FROM users WHERE email = ?)', ['jobanputra@gmail.com'], (err, row) => {
          if (err) {
            console.error('   ❌ Error checking Joban customers:', err.message);
          } else {
            console.log(`   📊 Joban Insurance: ${row.count} customers`);
          }
        });
        
        // 4. Final summary
        setTimeout(() => {
          console.log('\n✅ Dashboard fix completed!\n');
          console.log('📋 Next steps:');
          console.log('   1. Restart your server: npm start');
          console.log('   2. Login with credentials:');
          console.log('      - Admin: vaibhavkar0009@gmail.com / Vaibhav@121');
          console.log('      - KMG: kvreddy1809@gmail.com / kmg123');
          console.log('      - Joban: jobanputra@gmail.com / joban123');
          console.log('   3. Click "Sync from Sheet" button in dashboard');
          console.log('   4. Data should appear in the dashboard\n');
          
          db.close();
          resolve();
        }, 1000);
      }, 1000);
    });
  });
}

fixDashboard().catch(console.error);
