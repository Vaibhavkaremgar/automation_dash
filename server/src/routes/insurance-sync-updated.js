// Updated sync routes - Replace the sync endpoints in insurance.js

// Sync to Google Sheets - BACKGROUND PROCESSING
router.post('/sync/to-sheet', activityLogger, async (req, res) => {
  const syncQueue = require('../services/syncQueue');
  const { deletedCustomers = [] } = req.body;
  const { get } = require('../db/connection');
  const { getClientConfig } = require('../config/insuranceClients');
  
  try {
    // Return immediately - sync happens in background
    res.json({ 
      success: true, 
      message: 'Sync queued. Processing in background...',
      queued: true 
    });

    // Enqueue sync - doesn't block response
    syncQueue.enqueue(req.user.id, 'to-sheet', async () => {
      console.log(`🔄 Background sync started for user ${req.user.id}`);
      
      const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
      if (!user) throw new Error('User not found');
      
      const clientConfig = getClientConfig(user.email);
      const spreadsheetId = clientConfig.spreadsheetId;
      
      if (clientConfig.tabs) {
        const generalTab = clientConfig.tabs.general.tab;
        const lifeTab = clientConfig.tabs.life.tab;
        
        const generalResult = await insuranceSync.syncToSheet(
          req.user.id, 
          spreadsheetId, 
          generalTab, 
          ['motor', 'health', 'non-motor', '2-wheeler', 'general'], 
          deletedCustomers
        );
        
        const lifeResult = await insuranceSync.syncToSheet(
          req.user.id, 
          spreadsheetId, 
          lifeTab, 
          ['life'], 
          deletedCustomers
        );
        
        const result = {
          success: true,
          exported: (generalResult.exported || 0) + (lifeResult.exported || 0),
          deleted: (generalResult.deleted || 0) + (lifeResult.deleted || 0),
          updated: (generalResult.updated || 0) + (lifeResult.updated || 0),
          added: (generalResult.added || 0) + (lifeResult.added || 0)
        };
        
        console.log(`✅ Background sync completed for user ${req.user.id}:`, result);
        return result;
      } else {
        const tabName = clientConfig.tabName;
        return await insuranceSync.syncToSheet(req.user.id, spreadsheetId, tabName, null, deletedCustomers);
      }
    }).catch(error => {
      console.error(`❌ Background sync failed for user ${req.user.id}:`, error);
      // Log error but don't crash - user already got response
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Sync from Google Sheets - BACKGROUND PROCESSING
router.post('/sync/from-sheet', activityLogger, async (req, res) => {
  const syncQueue = require('../services/syncQueue');
  const { get } = require('../db/connection');
  const { getClientConfig } = require('../config/insuranceClients');
  
  try {
    // Return immediately - sync happens in background
    res.json({ 
      success: true, 
      message: 'Sync queued. Processing in background...',
      queued: true 
    });

    // Enqueue sync - doesn't block response
    syncQueue.enqueue(req.user.id, 'from-sheet', async () => {
      console.log(`🔄 Background sync from sheet started for user ${req.user.id}`);
      
      const user = await get('SELECT email FROM users WHERE id = ?', [req.user.id]);
      if (!user) throw new Error('User not found');
      
      const clientConfig = getClientConfig(user.email);
      const spreadsheetId = clientConfig.spreadsheetId;
      
      if (clientConfig.tabs) {
        const generalTab = clientConfig.tabs.general.tab;
        const lifeTab = clientConfig.tabs.life.tab;
        
        const generalResult = await insuranceSync.syncFromSheet(req.user.id, spreadsheetId, generalTab, 'general');
        const lifeResult = await insuranceSync.syncFromSheet(req.user.id, spreadsheetId, lifeTab, 'life');
        
        const result = {
          success: true,
          imported: (generalResult.imported || 0) + (lifeResult.imported || 0),
          updated: (generalResult.updated || 0) + (lifeResult.updated || 0)
        };
        
        console.log(`✅ Background sync from sheet completed for user ${req.user.id}:`, result);
        return result;
      } else {
        const tabName = clientConfig.tabName;
        return await insuranceSync.syncFromSheet(req.user.id, spreadsheetId, tabName);
      }
    }).catch(error => {
      console.error(`❌ Background sync from sheet failed for user ${req.user.id}:`, error);
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check sync status
router.get('/sync/status', (req, res) => {
  const syncQueue = require('../services/syncQueue');
  res.json({
    isProcessing: syncQueue.isProcessing(req.user.id, 'to-sheet') || syncQueue.isProcessing(req.user.id, 'from-sheet'),
    toSheetProcessing: syncQueue.isProcessing(req.user.id, 'to-sheet'),
    fromSheetProcessing: syncQueue.isProcessing(req.user.id, 'from-sheet'),
    toSheetQueueLength: syncQueue.getQueueLength(req.user.id, 'to-sheet'),
    fromSheetQueueLength: syncQueue.getQueueLength(req.user.id, 'from-sheet')
  });
});
