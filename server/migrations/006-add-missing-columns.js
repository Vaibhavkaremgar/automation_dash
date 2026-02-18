const { run, all } = require('../src/db/connection');

async function up() {
  try {
    // Check and add missing columns to users table
    const userCols = await all('PRAGMA table_info(users)');
    const userColNames = userCols.map(c => c.name);
    
    if (!userColNames.includes('can_change_password')) {
      await run('ALTER TABLE users ADD COLUMN can_change_password INTEGER DEFAULT 0');
      console.log('✅ Added can_change_password to users');
    }
    
    // Check and add missing columns to email_logs table
    const emailCols = await all('PRAGMA table_info(email_logs)');
    const emailColNames = emailCols.map(c => c.name);
    
    if (!emailColNames.includes('recipient_email')) {
      await run('ALTER TABLE email_logs ADD COLUMN recipient_email TEXT');
      console.log('✅ Added recipient_email to email_logs');
    }
    
    console.log('✅ Missing columns migration completed');
  } catch (err) {
    console.error('❌ Migration 006 failed:', err);
    throw err;
  }
}

module.exports = { up };
