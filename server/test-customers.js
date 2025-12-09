require('dotenv').config();
const { getDatabase } = require('./src/db/connection');
const db = getDatabase();

console.log('\n=== Checking Customers in Database ===\n');

// Get all users
db.all('SELECT id, email, name FROM users WHERE role = "client"', [], (err, users) => {
  if (err) {
    console.error('Error:', err);
    return;
  }

  console.log('Users:');
  users.forEach(user => {
    console.log(`  - ID: ${user.id}, Email: ${user.email}, Name: ${user.name}`);
  });

  // For each user, get their customers
  users.forEach(user => {
    console.log(`\n--- Customers for ${user.email} (User ID: ${user.id}) ---`);
    
    db.all('SELECT id, name, registration_no FROM insurance_customers WHERE user_id = ?', [user.id], (err, customers) => {
      if (err) {
        console.error('Error:', err);
        return;
      }

      if (customers.length === 0) {
        console.log('  No customers found');
      } else {
        customers.forEach(c => {
          console.log(`  - ID: ${c.id}, Name: "${c.name}", Vehicle: "${c.registration_no || 'N/A'}"`);
        });
      }
    });
  });

  // Check claims
  setTimeout(() => {
    console.log('\n--- Existing Claims ---');
    db.all('SELECT c.id, c.user_id, c.customer_id, c.vehicle_number, ic.name as customer_name FROM insurance_claims c LEFT JOIN insurance_customers ic ON c.customer_id = ic.id', [], (err, claims) => {
      if (err) {
        console.error('Error:', err);
        return;
      }

      if (claims.length === 0) {
        console.log('  No claims found');
      } else {
        claims.forEach(c => {
          console.log(`  - Claim ID: ${c.id}, User: ${c.user_id}, Customer: "${c.customer_name}", Vehicle: "${c.vehicle_number}"`);
        });
      }
      
      console.log('\n=== Done ===\n');
      process.exit(0);
    });
  }, 500);
});
