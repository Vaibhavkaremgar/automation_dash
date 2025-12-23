const { run, get } = require('../src/db/connection');

async function up() {
  try {
    console.log('🔄 Adding missing product_type column...');
    
    // Check if column exists
    const columns = await new Promise((resolve, reject) => {
      const { all } = require('../src/db/connection');
      all('PRAGMA table_info(insurance_customers)', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    const hasProductType = columns.some(col => col.name === 'product_type');
    
    if (!hasProductType) {
      await run('ALTER TABLE insurance_customers ADD COLUMN product_type TEXT');
      console.log('✅ Added product_type column');
    } else {
      console.log('✅ product_type column already exists');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

module.exports = { up };