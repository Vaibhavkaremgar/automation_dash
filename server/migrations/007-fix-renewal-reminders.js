const { run, all } = require('../src/db/connection');

async function up() {
  try {
    // Check if customer_id column exists
    const cols = await all('PRAGMA table_info(renewal_reminders)');
    const colNames = cols.map(c => c.name);
    
    if (!colNames.includes('customer_id')) {
      await run('ALTER TABLE renewal_reminders ADD COLUMN customer_id INTEGER');
      console.log('✅ Added customer_id to renewal_reminders');
    }
    
    if (!colNames.includes('sent_via')) {
      await run('ALTER TABLE renewal_reminders ADD COLUMN sent_via TEXT');
      console.log('✅ Added sent_via to renewal_reminders');
    }
    
    console.log('✅ Renewal reminders table fixed');
  } catch (err) {
    console.error('❌ Migration 007 failed:', err);
    throw err;
  }
}

module.exports = { up };
