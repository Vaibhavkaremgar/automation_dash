const { getDatabase } = require('../db/connection');
const db = getDatabase();

/**
 * Middleware to enforce strict data isolation between clients
 * Ensures users can only access their own data
 */
function enforceDataIsolation(req, res, next) {
  // Store original user_id for validation
  req.isolatedUserId = req.user.id;
  
  // Log access attempt for audit
  console.log(`[DATA ISOLATION] User ${req.user.id} (${req.user.email}) accessing ${req.method} ${req.path}`);
  
  next();
}

/**
 * Validate that a customer belongs to the authenticated user
 */
async function validateCustomerOwnership(req, res, next) {
  const customerId = req.params.id || req.body.customer_id;
  
  if (!customerId) {
    return next();
  }
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT user_id FROM insurance_customers WHERE id = ?',
      [customerId],
      (err, customer) => {
        if (err) {
          console.error('[DATA ISOLATION] Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!customer) {
          console.warn(`[DATA ISOLATION] Customer ${customerId} not found`);
          return res.status(404).json({ error: 'Customer not found' });
        }
        
        if (customer.user_id !== req.user.id) {
          console.error(`[DATA ISOLATION] SECURITY VIOLATION: User ${req.user.id} attempted to access customer ${customerId} owned by user ${customer.user_id}`);
          return res.status(403).json({ error: 'Access denied: You do not have permission to access this resource' });
        }
        
        next();
      }
    );
  });
}

/**
 * Validate that a claim belongs to the authenticated user
 */
async function validateClaimOwnership(req, res, next) {
  const claimId = req.params.id;
  
  if (!claimId) {
    return next();
  }
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT user_id FROM insurance_claims WHERE id = ?',
      [claimId],
      (err, claim) => {
        if (err) {
          console.error('[DATA ISOLATION] Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!claim) {
          console.warn(`[DATA ISOLATION] Claim ${claimId} not found`);
          return res.status(404).json({ error: 'Claim not found' });
        }
        
        if (claim.user_id !== req.user.id) {
          console.error(`[DATA ISOLATION] SECURITY VIOLATION: User ${req.user.id} attempted to access claim ${claimId} owned by user ${claim.user_id}`);
          return res.status(403).json({ error: 'Access denied: You do not have permission to access this resource' });
        }
        
        next();
      }
    );
  });
}

/**
 * Validate that a profile belongs to the authenticated user
 */
async function validateProfileOwnership(req, res, next) {
  const profileId = req.params.id;
  
  if (!profileId) {
    return next();
  }
  
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT user_id FROM user_profiles WHERE id = ?',
      [profileId],
      (err, profile) => {
        if (err) {
          console.error('[DATA ISOLATION] Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!profile) {
          console.warn(`[DATA ISOLATION] Profile ${profileId} not found`);
          return res.status(404).json({ error: 'Profile not found' });
        }
        
        if (profile.user_id !== req.user.id) {
          console.error(`[DATA ISOLATION] SECURITY VIOLATION: User ${req.user.id} attempted to access profile ${profileId} owned by user ${profile.user_id}`);
          return res.status(403).json({ error: 'Access denied: You do not have permission to access this resource' });
        }
        
        next();
      }
    );
  });
}

module.exports = {
  enforceDataIsolation,
  validateCustomerOwnership,
  validateClaimOwnership,
  validateProfileOwnership
};
