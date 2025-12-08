const { run, all } = require('../src/db/connection');

async function up() {
  try {
    // Check if notes column exists
    const cols = await all('PRAGMA table_info(insurance_customers)');
    const colNames = cols.map(c => c.name);
    
    if (!colNames.includes('notes')) {
      await run('ALTER TABLE insurance_customers ADD COLUMN notes TEXT');
      console.log('✅ Added notes column to insurance_customers');
    } else {
      console.log('✅ notes column already exists');
    }
  } catch (err) {
    console.error('❌ Migration 008 failed:', err);
    throw err;
  }
}

module.exports = { up };
