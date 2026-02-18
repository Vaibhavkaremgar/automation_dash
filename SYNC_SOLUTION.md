# Concurrent Sync Solution for 10+ Users

## Problem Analysis
1. **"Already sync in progress" error** - Mutex lock prevents concurrent syncs
2. **UI freezes during sync** - Blocking operations freeze the screen
3. **Screen refreshes on every sync** - Full page reload disrupts user experience
4. **Multiple users can't sync simultaneously** - Only one user can sync at a time

## Solution Architecture

### 1. Queue-Based Sync System (Per User)
- Each user has their own sync queue
- Multiple users can sync simultaneously
- Syncs for same user are queued sequentially (prevents conflicts)
- No blocking - returns immediately

### 2. Background Processing
- Sync happens in background without blocking UI
- Frontend doesn't wait for sync to complete
- Toast notifications show sync status
- No page refresh needed

### 3. Implementation Steps

#### Step 1: Create Sync Queue Service
File: `server/src/services/syncQueue.js`
```javascript
class SyncQueue {
  constructor() {
    this.queues = new Map(); // userId -> queue
    this.processing = new Map(); // userId -> isProcessing
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
}

module.exports = new SyncQueue();
```

#### Step 2: Update Sync Routes
Replace mutex with queue in `server/src/routes/insurance.js`:

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
        
        return {
          success: true,
          exported: (generalResult.exported || 0) + (lifeResult.exported || 0),
          deleted: (generalResult.deleted || 0) + (lifeResult.deleted || 0),
          updated: (generalResult.updated || 0) + (lifeResult.updated || 0),
          added: (generalResult.added || 0) + (lifeResult.added || 0)
        };
      }
    }).catch(error => {
      console.error('Background sync failed:', error);
      // Log error but don't crash
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check sync status
router.get('/sync/status', (req, res) => {
  const syncQueue = require('../services/syncQueue');
  res.json({
    isProcessing: syncQueue.isProcessing(req.user.id, 'to-sheet'),
    queueLength: syncQueue.getQueueLength(req.user.id, 'to-sheet')
  });
});
```

#### Step 3: Update Frontend
File: `client/src/pages/InsuranceDashboard.tsx`

```typescript
// Replace syncToSheets function
const syncToSheets = async () => {
  try {
    setSyncing(true);
    
    // Send sync request - returns immediately
    const result = await api.post('/api/insurance/sync/to-sheet', {
      tabName: SHEET_TAB_NAME,
      deletedCustomers: deletedCustomers
    });
    
    if (result.data.queued) {
      // Show toast - sync is happening in background
      alert('✅ Sync queued! Processing in background...');
      setSyncing(false); // Don't block UI
      
      // Poll for completion (optional)
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.get('/api/insurance/sync/status');
          if (!status.data.isProcessing) {
            clearInterval(pollInterval);
            alert('✅ Sync completed!');
            await loadData(); // Refresh data once
          }
          attempts++;
          if (attempts > 120) clearInterval(pollInterval); // Stop after 2 minutes
        } catch (e) {
          console.error('Status check failed:', e);
        }
      }, 1000);
    }
  } catch (error) {
    setSyncing(false);
    alert(`❌ Sync failed: ${error.message}`);
  }
};

// Remove auto-refresh on sync
// Don't call loadData() immediately after sync
// Only refresh when user manually requests or on interval
```

## Benefits

✅ **10+ Concurrent Users**: Each user has their own queue
✅ **No UI Freeze**: Sync happens in background
✅ **No Screen Refresh**: Data updates silently
✅ **No "Already Syncing" Error**: Queue handles sequential syncs per user
✅ **Scalable**: Works with any number of users

## How It Works

1. User clicks "Sync to Sheet"
2. Request returns immediately with `queued: true`
3. Sync happens in background queue
4. UI remains responsive
5. Optional: Poll `/sync/status` to show progress
6. When complete, data is updated without page refresh

## Testing with 10 Users

```bash
# Simulate 10 concurrent sync requests
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/insurance/sync/to-sheet \
    -H "Authorization: Bearer token_user_$i" &
done
wait
```

All 10 requests will return immediately, each queued for their respective user.
