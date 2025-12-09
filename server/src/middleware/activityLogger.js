const { getDatabase } = require('../db/connection');

function logActivity(userId, profileId, activityType, description, metadata = null) {
  const db = getDatabase();
  db.run(
    'INSERT INTO activity_logs (user_id, profile_id, activity_type, activity_description, metadata) VALUES (?, ?, ?, ?, ?)',
    [userId, profileId, activityType, description, metadata ? JSON.stringify(metadata) : null],
    (err) => {
      if (err) console.error('Activity log error:', err.message);
    }
  );
}

function activityLogger(req, res, next) {
  // This runs after authRequired, so req.user should exist
  const profileId = req.headers['x-profile-id'];
  const userId = req.user?.id;
  
  req.logActivity = (type, description, metadata) => {
    if (userId && profileId) {
      logActivity(userId, profileId, type, description, metadata);
    }
  };
  
  next();
}

module.exports = { activityLogger, logActivity };
