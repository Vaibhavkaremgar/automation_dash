const path = require('path');
(async () => {
  try {
    const { runMigrations } = require(path.resolve('server', 'src', 'db', 'connection'));
    await runMigrations();
    require(path.resolve('server', 'seed-admin.js'));
  } catch (e) {
    console.error('Failed to initialize and seed admin:', e);
    process.exit(1);
  }
})();
