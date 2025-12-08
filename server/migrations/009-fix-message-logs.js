const { run, all } = require('../src/db/connection');

async function up() {
  try {
    // Check if customer_id column exists in message_logs
    const cols = await all('PRAGMA table_info(message_logs)');
    const colNames = cols.map(c => c.name);
    
    if (!colNames.includes('customer_id')) {
      await run('ALTER TABLE message_logs ADD COLUMN customer_id INTEGER');
      console.log('✅ Added customer_id to message_logs');
    }
    
    if (!colNames.includes('customer_name_fallback')) {
      await run('ALTER TABLE message_logs ADD COLUMN customer_name_fallback TEXT');
      console.log('✅ Added customer_name_fallback to message_logs');
    }
    
    console.log('✅ Message logs table fixed');
  } catch (err) {
    console.error('❌ Migration 009 failed:', err);
    throw err;
  }
}

module.exports = { up };
