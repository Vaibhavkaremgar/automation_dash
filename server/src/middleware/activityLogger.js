const { getDatabase } = require('../db/connection');

const db = getDatabase();

function logActivity(userId, profileId, activityType, description, metadata = null) {
  db.run(
    'INSERT INTO activity_logs (user_id, profile_id, activity_type, activity_description, metadata) VALUES (?, ?, ?, ?, ?)',
    [userId, profileId, activityType, description, metadata ? JSON.stringify(metadata) : null],
    (err) => {
      if (err) console.error('Failed to log activity:', err);
    }
  );
}

function activityMiddleware(req, res, next) {
  const originalJson = res.json;
  
  res.json = function(data) {
    if (req.user && req.method !== 'GET') {
      const profileId = req.headers['x-profile-id'] || null;
      const activityType = `${req.method} ${req.path}`;
      const description = getActivityDescription(req);
      
      if (description) {
        logActivity(req.user.id, profileId, activityType, description);
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

function getActivityDescription(req) {
  const path = req.path;
  const method = req.method;
  
  if (path.includes('/customers') && method === 'POST') return 'Added new customer';
  if (path.includes('/customers') && method === 'PUT') return 'Updated customer';
  if (path.includes('/customers') && method === 'DELETE') return 'Deleted customer';
  if (path.includes('/sync/from-sheet')) return 'Synced data from Google Sheets';
  if (path.includes('/sync/to-sheet')) return 'Synced data to Google Sheets';
  if (path.includes('/claims') && method === 'POST') return 'Filed new claim';
  if (path.includes('/claims') && method === 'PUT') return 'Updated claim';
  if (path.includes('/jobs') && method === 'POST') return 'Created new job';
  if (path.includes('/candidates') && method === 'POST') return 'Added new candidate';
  
  return null;
}

module.exports = { activityMiddleware, logActivity };
