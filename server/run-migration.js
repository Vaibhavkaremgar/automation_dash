const { runMigrations } = require('./src/db/connection');

async function runInsuranceMigration() {
  try {
    console.log('🚀 Starting insurance company name migration...');
    
    // First run standard migrations
    await runMigrations();
    
    // Then run our custom migration
    const migration = require('./migrations/004-set-insurance-company-names');
    await migration.up();
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Restart your server');
    console.log('2. Logout and login again');
    console.log('3. Check the debug box in Add Customer modal');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runInsuranceMigration();
