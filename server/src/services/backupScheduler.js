const fs = require('fs');
const path = require('path');

let backupFunction = null;
let backupInterval = null;

// Safe backup wrapper
async function triggerBackup() {
  if (!backupFunction) {
    console.log('⚠️ Backup function not initialized');
    return;
  }
  
  try {
    await backupFunction();
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    // Swallow error - don't crash the app
  }
}

// Initialize backup scheduler
function initBackupScheduler() {
  // Check if DB exists on startup
  const dbPath = process.env.DB_PATH;
  if (dbPath) {
    const resolvedPath = path.resolve(__dirname, '../../', dbPath);
    if (!fs.existsSync(resolvedPath)) {
      console.warn('⚠️ WARNING: Database file not found at', resolvedPath);
      console.warn('⚠️ Database will be created on first use');
    }
  }

  // Dynamically import backup function
  import('../utils/driveDbBackup.js')
    .then(module => {
      backupFunction = module.backupSqliteToDrive;
      console.log('✅ Backup system initialized');
      
      // Schedule backup every 6 hours (21600000 ms)
      backupInterval = setInterval(() => {
        console.log('🔄 Running scheduled backup...');
        triggerBackup();
      }, 6 * 60 * 60 * 1000);
      
      // Run initial backup after 5 minutes
      setTimeout(() => {
        console.log('🔄 Running initial backup...');
        triggerBackup();
      }, 5 * 60 * 1000);
    })
    .catch(error => {
      console.error('❌ Failed to initialize backup system:', error.message);
      // Continue without backup - don't crash
    });
}

// Manual trigger for testing
async function manualBackup() {
  console.log('🔄 Manual backup triggered...');
  await triggerBackup();
}

// Cleanup on shutdown
function stopBackupScheduler() {
  if (backupInterval) {
    clearInterval(backupInterval);
    console.log('🛑 Backup scheduler stopped');
  }
}

module.exports = {
  initBackupScheduler,
  manualBackup,
  stopBackupScheduler,
  triggerBackup
};
