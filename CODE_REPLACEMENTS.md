# Exact Code Replacements

## File 1: Create New Service
**Path:** `server/src/services/syncQueue.js`
**Action:** CREATE NEW FILE

```javascript
class SyncQueue {
  constructor() {
    this.queues = new Map();
    this.processing = new Map();
  }

  async enqueue(userId, tabName, syncFn) {
    const key = `${userId}_${tabName}`;
    
    if (!this.queues.has(key)) {
      this.queues.set(key, []);
      this.processing.set(key, false);
    }

    const queue = this.queues.get(key);
    
    return new Promise((resolve, reject) => {
      queue.push({ syncFn, resolve, reject });
      this.processQueue(key);
    });
  }

  async processQueue(key) {
    if (this.processing.get(key)) return;
    
    const queue = this.queues.get(key);
    if (!queue || queue.length === 0) return;

    this.processing.set(key, true);

    while (queue.length > 0) {
      const { syncFn, resolve, reject } = queue.shift();
      
      try {
        const result = await syncFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing.set(key, false);
  }

  isProcessing(userId, tabName) {
    const key = `${userId}_${tabName}`;
    return this.processing.get(key) || false;
  }

  getQueueLength(userId, tabName) {
    const key = `${userId}_${tabName}`;
    const queue = this.queues.get(key);
    return queue ? queue.length : 0;
  }
}

module.exports = new SyncQueue();
```

## File 2: Update Backend Routes
**Path:** `server/src/routes/insurance.js`
**Action:** FIND AND REPLACE

### Find This:
```javascript
// Sync to Google Sheets
router.post('/sync/to-sheet', activityLogger, async (req, res) => {
  const syncMutex = require('../utils/syncMutex');
  
  // Check if sync already in progress for this user
  if (syncMutex.isLocked(req.user.id)) {
    return res.status(409).json({ 
      error: 'Sync already in progress',
      message: 'Please wait for the current sync to complete'
    });
  }
  
  const release = await syncMutex.acquire(req.user.id);
  
  try {
```

### Replace With:
```javascript
// Sync to Google Sheets
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
```

### Find This (at end of sync/to-sheet):
```javascript
  } finally {
    release(); // Always release lock
  }
});
```

### Replace With:
```javascript
    }).catch(error => {
      console.error(`❌ Background sync failed for user ${req.user.id}:`, error);
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Add This New Endpoint:
```javascript
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
```

## File 3: Update Frontend Functions
**Path:** `client/src/pages/InsuranceDashboard.tsx`
**Action:** FIND AND REPLACE

### Find This:
```typescript
const syncToSheets = async () => {
  try {
    setSyncing(true);
    const result = await api.post('/api/insurance/sync/to-sheet', {
      tabName: SHEET_TAB_NAME,
      deletedCustomers: deletedCustomers
    });
    
    if (result.data.message === 'No changes to sync') {
      alert('ℹ️ No changes detected - Sheet is already up to date!');
    } else {
      const parts = [];
      if (result.data.deleted > 0) parts.push(`Deleted: ${result.data.deleted}`);
      if (result.data.updated > 0) parts.push(`Updated: ${result.data.updated}`);
      if (result.data.added > 0) parts.push(`Added: ${result.data.added}`);
      
      alert(`✅ Sync completed!\n\n${parts.join('\n')}`);
      
      setDeletedCustomers([]);
    }
  } catch (error) {
    console.error('Failed to sync to sheets:', error);
    alert(`❌ Sync to sheet failed: ${error.response?.data?.error || error.message}`);
  } finally {
    setSyncing(false);
  }
};
```

### Replace With:
```typescript
const syncToSheets = async () => {
  try {
    setSyncing(true);
    
    const result = await api.post('/api/insurance/sync/to-sheet', {
      tabName: SHEET_TAB_NAME,
      deletedCustomers: deletedCustomers
    });
    
    if (result.data.queued) {
      alert('✅ Sync queued! Processing in background...');
      setSyncing(false);
      
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.get('/api/insurance/sync/status');
          
          if (!status.data.isProcessing) {
            clearInterval(pollInterval);
            alert('✅ Sync completed successfully!');
            setDeletedCustomers([]);
          }
          
          attempts++;
          if (attempts > 120) clearInterval(pollInterval);
        } catch (e) {
          console.error('Status check failed:', e);
        }
      }, 1000);
    } else {
      setSyncing(false);
      alert(`❌ Sync failed: ${result.data.error || 'Unknown error'}`);
    }
  } catch (error) {
    setSyncing(false);
    console.error('Sync error:', error);
    alert(`❌ Sync failed: ${error.message}`);
  }
};
```

## Summary of Changes

1. **Create** `syncQueue.js` - New queue service
2. **Replace** sync/to-sheet endpoint - Remove mutex, add queue
3. **Replace** sync/from-sheet endpoint - Remove mutex, add queue
4. **Add** /sync/status endpoint - Status checking
5. **Replace** syncToSheets() function - Background processing
6. **Replace** syncFromSheets() function - Background processing

## Testing After Changes

```bash
# Test 1: Build
npm run build

# Test 2: Start server
npm start

# Test 3: Test with multiple users
# Open 3 browser windows
# Login as different users
# Click sync simultaneously
# Expected: All return immediately, no errors
```

## Rollback

If issues occur, revert the changes and restart the server.
