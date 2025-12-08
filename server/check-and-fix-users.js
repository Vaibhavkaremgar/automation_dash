const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/hirehero.db');
const db = new sqlite3.Database(dbPath);

const users = [
  {
    email: 'vaibhavkar0009@gmail.com',
    password: 'Vaibhav@121',
    name: 'Admin',
    role: 'admin',
    client_type: 'hr'
  },
  {
    email: 'kvreddy1809@gmail.com',
    password: 'kmg123',
    name: 'KMG Insurance',
    role: 'client',
    client_type: 'insurance'
  },
  {
    email: 'jobanputra@gmail.com',
    password: 'joban123',
    name: 'Joban Putra Insurance Shoppe',
    role: 'client',
    client_type: 'insurance'
  }
];

async function checkAndFixUsers() {
  console.log('\n🔍 Checking database users...\n');
  
  // First, list all users
  db.all('SELECT id, email, name, role, status FROM users', [], async (err, rows) => {
    if (err) {
      console.error('❌ Error reading users:', err.message);
      db.close();
      return;
    }
    
    console.log('📋 Current users in database:');
    if (rows.length === 0) {
      console.log('   No users found!\n');
    } else {
      rows.forEach(user => {
        console.log(`   - ${user.email} (${user.name}) - Role: ${user.role}, Status: ${user.status}`);
      });
      console.log('');
    }
    
    // Now fix/create users
    console.log('🔧 Fixing user passwords...\n');
    
    for (const user of users) {
      try {
        const passwordHash = await bcrypt.hash(user.password, 10);
        
        // Check if user exists
        db.get('SELECT id FROM users WHERE email = ?', [user.email], (err, row) => {
          if (err) {
            console.error(`❌ Error checking ${user.email}:`, err.message);
            return;
          }
          
          if (row) {
            // Update existing user
            db.run(
              'UPDATE users SET password_hash = ?, status = ? WHERE email = ?',
              [passwordHash, 'active', user.email],
              (err) => {
                if (err) {
                  console.error(`❌ Failed to update ${user.email}:`, err.message);
                } else {
                  console.log(`✅ Updated password for ${user.email}`);
                }
              }
            );
          } else {
            // Create new user
            db.run(
              'INSERT INTO users (email, password_hash, name, role, client_type, status) VALUES (?, ?, ?, ?, ?, ?)',
              [user.email, passwordHash, user.name, user.role, user.client_type, 'active'],
              function(err) {
                if (err) {
                  console.error(`❌ Failed to create ${user.email}:`, err.message);
                } else {
                  console.log(`✅ Created user ${user.email}`);
                  
                  // Create wallet
                  db.run(
                    'INSERT INTO wallets (user_id, balance_cents) VALUES (?, ?)',
                    [this.lastID, 1000000],
                    (err) => {
                      if (err) {
                        console.error(`⚠️  Failed to create wallet for ${user.email}`);
                      } else {
                        console.log(`   💰 Wallet created for ${user.email}`);
                      }
                    }
                  );
                }
              }
            );
          }
        });
      } catch (err) {
        console.error(`❌ Error processing ${user.email}:`, err.message);
      }
    }
    
    // Wait a bit for all operations to complete
    setTimeout(() => {
      console.log('\n✅ Done! Try logging in now with these credentials:\n');
      console.log('Admin:');
      console.log('  Email: vaibhavkar0009@gmail.com');
      console.log('  Password: Vaibhav@121\n');
      console.log('KMG Insurance:');
      console.log('  Email: kvreddy1809@gmail.com');
      console.log('  Password: kmg123\n');
      console.log('Joban Insurance:');
      console.log('  Email: jobanputra@gmail.com');
      console.log('  Password: joban123\n');
      
      db.close();
    }, 2000);
  });
}

checkAndFixUsers();
