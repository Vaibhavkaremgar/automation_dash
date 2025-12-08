const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/hirehero.db');
const db = new sqlite3.Database(dbPath);

async function finalFix() {
  console.log('\n🔧 Final Fix for HR Agent Dashboard\n');
  
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      // 1. Fix renewal_reminders table
      console.log('1️⃣ Fixing renewal_reminders table...');
      
      db.all('PRAGMA table_info(renewal_reminders)', async (err, cols) => {
        if (err) {
          console.error('Error checking table:', err);
          return;
        }
        
        const colNames = cols.map(c => c.name);
        console.log('   Current columns:', colNames.join(', '));
        
        if (!colNames.includes('customer_id')) {
          db.run('ALTER TABLE renewal_reminders ADD COLUMN customer_id INTEGER', (err) => {
            if (err) console.error('   ❌ Failed to add customer_id:', err.message);
            else console.log('   ✅ Added customer_id column');
          });
        } else {
          console.log('   ✅ customer_id column exists');
        }
        
        if (!colNames.includes('sent_via')) {
          db.run('ALTER TABLE renewal_reminders ADD COLUMN sent_via TEXT', (err) => {
            if (err) console.error('   ❌ Failed to add sent_via:', err.message);
            else console.log('   ✅ Added sent_via column');
          });
        } else {
          console.log('   ✅ sent_via column exists');
        }
      });
      
      // 2. Verify users and passwords
      setTimeout(() => {
        console.log('\n2️⃣ Verifying users and passwords...');
        
        const users = [
          { email: 'vaibhavkar0009@gmail.com', password: 'Vaibhav@121', name: 'Admin' },
          { email: 'kvreddy1809@gmail.com', password: 'kmg123', name: 'KMG Insurance' },
          { email: 'jobanputra@gmail.com', password: 'joban123', name: 'Joban Insurance' }
        ];
        
        users.forEach(user => {
          db.get('SELECT email, password_hash, status, google_sheet_url FROM users WHERE email = ?', [user.email], async (err, row) => {
            if (err) {
              console.error(`   ❌ Error checking ${user.email}:`, err.message);
              return;
            }
            
            if (!row) {
              console.log(`   ⚠️  ${user.name} not found in database`);
              return;
            }
            
            const passwordMatch = await bcrypt.compare(user.password, row.password_hash);
            const statusOk = row.status === 'active';
            const hasSheet = !!row.google_sheet_url;
            
            console.log(`   ${user.name}:`);
            console.log(`      Email: ${row.email}`);
            console.log(`      Password: ${passwordMatch ? '✅ CORRECT' : '❌ WRONG'}`);
            console.log(`      Status: ${statusOk ? '✅ active' : '⚠️  ' + row.status}`);
            console.log(`      Sheet URL: ${hasSheet ? '✅ Set' : '⚠️  Missing'}`);
          });
        });
      }, 1000);
      
      // 3. Check customer counts
      setTimeout(() => {
        console.log('\n3️⃣ Checking customer data...');
        
        db.get('SELECT COUNT(*) as count FROM insurance_customers WHERE user_id = (SELECT id FROM users WHERE email = ?)', ['kvreddy1809@gmail.com'], (err, row) => {
          if (err) console.error('   ❌ Error:', err.message);
          else console.log(`   📊 KMG Insurance: ${row.count} customers`);
        });
        
        db.get('SELECT COUNT(*) as count FROM insurance_customers WHERE user_id = (SELECT id FROM users WHERE email = ?)', ['jobanputra@gmail.com'], (err, row) => {
          if (err) console.error('   ❌ Error:', err.message);
          else console.log(`   📊 Joban Insurance: ${row.count} customers`);
        });
      }, 2000);
      
      // 4. Verify critical tables
      setTimeout(() => {
        console.log('\n4️⃣ Verifying critical tables...');
        
        const tables = [
          'users',
          'insurance_customers',
          'renewal_reminders',
          'message_logs',
          'insurance_claims',
          'sessions',
          'wallets'
        ];
        
        tables.forEach(table => {
          db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table], (err, row) => {
            if (err) console.error(`   ❌ Error checking ${table}:`, err.message);
            else if (row) console.log(`   ✅ ${table} table exists`);
            else console.log(`   ⚠️  ${table} table MISSING`);
          });
        });
      }, 3000);
      
      // 5. Final summary
      setTimeout(() => {
        console.log('\n✅ Fix completed!\n');
        console.log('📋 Login Credentials:');
        console.log('   Admin: vaibhavkar0009@gmail.com / Vaibhav@121');
        console.log('   KMG: kvreddy1809@gmail.com / kmg123');
        console.log('   Joban: jobanputra@gmail.com / joban123\n');
        console.log('🚀 Next steps:');
        console.log('   1. Start server: npm start');
        console.log('   2. Login with credentials above');
        console.log('   3. Click "Sync from Sheets" button');
        console.log('   4. Verify data appears in dashboard\n');
        console.log('📦 For Railway deployment:');
        console.log('   - Read RAILWAY_DEPLOYMENT.md');
        console.log('   - Set all environment variables');
        console.log('   - Add persistent volume at /app/data');
        console.log('   - Deploy and check logs\n');
        
        db.close();
        resolve();
      }, 4000);
    });
  });
}

finalFix().catch(console.error);
