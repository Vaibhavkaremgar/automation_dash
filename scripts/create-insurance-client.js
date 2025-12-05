const bcrypt = require('bcryptjs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'data', 'hirehero.db');
const db = new sqlite3.Database(dbPath);

async function createInsuranceClient() {
  try {
    console.log('🏢 Creating insurance client...');
    
    const email = 'insurance@example.com';
    const password = 'insurance123';
    const name = 'Insurance Agency Demo';
    const client_type = 'insurance';
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create insurance client
    db.run(`
      INSERT INTO users (email, password_hash, name, role, client_type, status, created_at)
      VALUES (?, ?, ?, 'client', ?, 'active', CURRENT_TIMESTAMP)
    `, [email, passwordHash, name, client_type], function(err) {
      if (err) {
        console.error('❌ Error creating insurance client:', err);
        return;
      }
      
      const userId = this.lastID;
      console.log('✅ Insurance client created with ID:', userId);
      
      // Create wallet for the client
      db.run(`
        INSERT INTO wallets (user_id, balance_cents, updated_at)
        VALUES (?, 10000, CURRENT_TIMESTAMP)
      `, [userId], (err) => {
        if (err) {
          console.error('❌ Error creating wallet:', err);
        } else {
          console.log('💰 Wallet created with ₹100 balance');
        }
      });
      
      // Add some sample insurance customers
      const sampleCustomers = [
        {
          name: 'John Doe',
          mobile: '9876543210',
          renewal_date: '2024-02-15',
          company: 'HDFC ERGO',
          product: 'Comprehensive',
          registration: 'MH01AB1234',
          premium: 15000,
          status: 'active'
        },
        {
          name: 'Jane Smith',
          mobile: '9876543211',
          renewal_date: '2024-01-20',
          company: 'ICICI Lombard',
          product: 'Third Party',
          registration: 'MH02CD5678',
          premium: 8000,
          status: 'paid'
        },
        {
          name: 'Bob Johnson',
          mobile: '9876543212',
          renewal_date: '2024-01-05',
          company: 'Bajaj Allianz',
          product: 'Comprehensive',
          registration: 'MH03EF9012',
          premium: 12000,
          status: 'expired'
        }
      ];
      
      sampleCustomers.forEach((customer, index) => {
        db.run(`
          INSERT INTO insurance_customers (user_id, serial_no, name, mobile_number, renewal_date, company, product, registration_no, premium, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [userId, index + 1, customer.name, customer.mobile, customer.renewal_date, customer.company, customer.product, customer.registration, customer.premium, customer.status], (err) => {
          if (err) {
            console.error('❌ Error creating sample customer:', err);
          } else {
            console.log(`✅ Sample customer created: ${customer.name}`);
          }
        });
      });
      
      console.log('\n🎉 Insurance client setup complete!');
      console.log('📧 Email: insurance@example.com');
      console.log('🔑 Password: insurance123');
      console.log('💰 Initial balance: ₹100');
      console.log('👥 Sample customers: 3');
      
      db.close();
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
  }
}

createInsuranceClient();