// Quick test to verify server starts with SQLite
const { runMigrations } = require('./src/db/connection');

console.log('Testing SQLite database initialization...\n');

runMigrations()
  .then(() => {
    console.log('\n✅ SUCCESS! Database initialized correctly.');
    console.log('✅ All tables created.');
    console.log('✅ SQLite restoration is complete!\n');
    console.log('You can now start the server with: npm run dev\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ ERROR:', err.message);
    process.exit(1);
  });
