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
  console.log('⚠️ Backup scheduler disabled - service account storage limitations');
  // Backup disabled due to Google service account storage quota limitations
  return;
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
