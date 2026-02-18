const { getDatabase } = require('../src/db/connection');

async function up() {
  const db = getDatabase();
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if customer_id column exists
      db.all(`PRAGMA table_info(insurance_claims)`, [], (err, columns) => {
        if (err) {
          console.error('Error checking insurance_claims columns:', err);
          return reject(err);
        }
        
        const hasCustomerId = columns.some(col => col.name === 'customer_id');
        const hasUserId = columns.some(col => col.name === 'user_id');
        const hasPolicyNumber = columns.some(col => col.name === 'policy_number');
        const hasInsuranceCompany = columns.some(col => col.name === 'insurance_company');
        const hasVehicleNumber = columns.some(col => col.name === 'vehicle_number');
        const hasClaimType = columns.some(col => col.name === 'claim_type');
        const hasIncidentDate = columns.some(col => col.name === 'incident_date');
        const hasDescription = columns.some(col => col.name === 'description');
        const hasClaimAmount = columns.some(col => col.name === 'claim_amount');
        const hasClaimStatus = columns.some(col => col.name === 'claim_status');
        
        if (!hasCustomerId || !hasUserId) {
          console.log('Recreating insurance_claims table with correct schema...');
          
          db.run(`DROP TABLE IF EXISTS insurance_claims`, (err) => {
            if (err) {
              console.error('Error dropping insurance_claims:', err);
              return reject(err);
            }
            
            db.run(`
              CREATE TABLE insurance_claims (
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
              if (err) {
                console.error('Error creating insurance_claims:', err);
                return reject(err);
              }
              console.log('✅ insurance_claims table recreated successfully');
              resolve();
            });
          });
        } else {
          console.log('✅ insurance_claims table already has correct schema');
          resolve();
        }
      });
    });
  });
}

module.exports = { up };
