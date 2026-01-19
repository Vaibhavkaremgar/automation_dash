// Updated Frontend Sync Functions for InsuranceDashboard.tsx
// Replace the syncToSheets and syncFromSheets functions with these

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
      setSyncing(false); // Don't block UI immediately
      
      // Optional: Poll for completion
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.get('/api/insurance/sync/status');
          
          if (!status.data.isProcessing) {
            clearInterval(pollInterval);
            alert('✅ Sync completed successfully!');
            setDeletedCustomers([]); // Clear deleted customers after sync
            // Optionally refresh data once
            // await loadData();
          }
          
          attempts++;
          if (attempts > 120) {
            clearInterval(pollInterval); // Stop after 2 minutes
            console.log('Sync status polling timeout');
          }
        } catch (e) {
          console.error('Status check failed:', e);
        }
      }, 1000); // Poll every 1 second
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

const syncFromSheets = async (silent = false) => {
  try {
    setSyncing(true);
    
    // Send sync request - returns immediately
    const result = await api.post('/api/insurance/sync/from-sheet', {
      tabName: SHEET_TAB_NAME
    });
    
    if (result.data.queued) {
      if (!silent) {
        alert('✅ Sync from sheet queued! Processing in background...');
      }
      setSyncing(false); // Don't block UI
      
      // Optional: Poll for completion
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.get('/api/insurance/sync/status');
          
          if (!status.data.fromSheetProcessing) {
            clearInterval(pollInterval);
            if (!silent) {
              alert('✅ Sync from sheet completed!');
            }
            // Refresh data once sync completes
            await loadData();
          }
          
          attempts++;
          if (attempts > 120) {
            clearInterval(pollInterval);
            console.log('Sync from sheet polling timeout');
          }
        } catch (e) {
          console.error('Status check failed:', e);
        }
      }, 1000);
    } else {
      setSyncing(false);
      if (!silent) {
        alert(`❌ Sync from sheet failed: ${result.data.error || 'Unknown error'}`);
      }
    }
  } catch (error) {
    setSyncing(false);
    console.error('Sync from sheet error:', error);
    if (!silent) {
      alert(`❌ Sync from sheet failed: ${error.message}`);
    }
  }
};

// Optional: Add a sync status indicator component
const SyncStatusIndicator = () => {
  const [syncStatus, setSyncStatus] = useState({ isProcessing: false, queueLength: 0 });
  
  useEffect(() => {
    if (!syncing) return;
    
    const interval = setInterval(async () => {
      try {
        const status = await api.get('/api/insurance/sync/status');
        setSyncStatus(status.data);
      } catch (e) {
        console.error('Failed to get sync status:', e);
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [syncing]);
  
  if (!syncStatus.isProcessing) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 text-sm text-blue-300">
      🔄 Syncing... {syncStatus.queueLength > 0 && `(${syncStatus.queueLength} in queue)`}
    </div>
  );
};
