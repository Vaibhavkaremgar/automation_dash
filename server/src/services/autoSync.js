const { getDatabase } = require('../db/connection');
const sheetsService = require('./sheets');

class AutoSyncService {
  constructor() {
    this.intervalId = null;
  }

  start() {
    console.log('🔄 Auto-sync service disabled (to prevent errors)');
    // Disabled temporarily
    // this.syncAllClients();
    // this.intervalId = setInterval(() => {
    //   this.syncAllClients();
    // }, 5 * 60 * 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Auto-sync service stopped');
    }
  }

  async syncAllClients() {
    try {
      const db = getDatabase();
      
      // Get all clients with Google Sheets URLs
      const clients = await new Promise((resolve, reject) => {
        db.all(`
          SELECT id, name, google_sheet_url 
          FROM users 
          WHERE role = 'client' 
          AND google_sheet_url IS NOT NULL 
          AND google_sheet_url != ''
        `, [], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      console.log(`🔄 Auto-syncing ${clients.length} clients...`);

      for (const client of clients) {
        try {
          const match = client.google_sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
          if (!match) continue;

          const spreadsheetId = match[1];
          const result = await sheetsService.syncCandidates(client.id, spreadsheetId, 'output');
          
          if (result.synced > 0) {
            console.log(`✅ Synced ${result.synced} candidates for ${client.name}`);
          }
        } catch (error) {
          console.error(`❌ Sync failed for ${client.name}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Auto-sync error:', error);
    }
  }
}

module.exports = new AutoSyncService();