const { getDatabase } = require('../db/connection');
const db = getDatabase();

/**
 * Security audit logger middleware
 * Logs all data access attempts for security monitoring
 */
function securityAuditLogger(req, res, next) {
  const auditData = {
    user_id: req.user?.id || null,
    user_email: req.user?.email || null,
    method: req.method,
    path: req.path,
    ip_address: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  };

  // Log to console for immediate visibility
  console.log(`[SECURITY AUDIT] ${auditData.timestamp} | User: ${auditData.user_email} | ${auditData.method} ${auditData.path} | IP: ${auditData.ip_address}`);

  // Store in database for long-term audit trail
  db.run(
    `INSERT INTO security_audit_log (user_id, user_email, method, path, ip_address, user_agent, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [auditData.user_id, auditData.user_email, auditData.method, auditData.path, auditData.ip_address, auditData.user_agent, auditData.timestamp],
    (err) => {
      if (err) {
        console.error('[SECURITY AUDIT] Failed to log audit entry:', err);
      }
    }
  );

  next();
}

/**
 * Create security audit log table if it doesn't exist
 */
function initSecurityAuditTable() {
  db.run(`
    CREATE TABLE IF NOT EXISTS security_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_email TEXT,
      method TEXT,
      path TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Failed to create security_audit_log table:', err);
    } else {
      console.log('✅ Security audit log table ready');
    }
  });
}

module.exports = {
  securityAuditLogger,
  initSecurityAuditTable
};
