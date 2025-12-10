const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');

const router = express.Router();

router.use(authRequired);

router.get('/all', requireRole('admin'), async (req, res, next) => {
  try {
    const db = getDatabase();
    
    // Get all clients with HR stats
    const hrClients = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.client_type,
          u.google_sheet_url,
          COUNT(DISTINCT c.id) as totalCandidates,
          COUNT(DISTINCT CASE WHEN c.status = 'shortlisted' THEN c.id END) as shortlisted,
          COUNT(DISTINCT CASE WHEN c.status = 'rejected' THEN c.id END) as rejected,
          COUNT(DISTINCT CASE WHEN c.status = 'in_process' THEN c.id END) as in_process,
          CASE WHEN u.google_sheet_url IS NOT NULL AND u.google_sheet_url != '' THEN 1 ELSE 0 END as hasSheet,
          MAX(c.updated_at) as lastSync
        FROM users u
        LEFT JOIN candidates c ON u.id = c.user_id
        WHERE u.role = 'client' AND IFNULL(u.client_type, 'hr') = 'hr' AND IFNULL(u.status,'active') <> 'deleted'
        GROUP BY u.id, u.name, u.email, u.google_sheet_url, u.client_type
        ORDER BY u.name
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    // Get insurance clients with their stats
    const insuranceClients = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.client_type,
          u.google_sheet_url,
          COUNT(DISTINCT ic.id) as totalCustomers,
          COUNT(DISTINCT CASE WHEN ic.status = 'done' THEN ic.id END) as activePolicies,
          SUM(CASE WHEN ic.status = 'done' THEN ic.premium ELSE 0 END) as totalPremium,
          COUNT(DISTINCT CASE WHEN ic.status = 'pending' AND ic.renewal_date IS NOT NULL THEN ic.id END) as upcomingRenewals,
          CASE WHEN u.google_sheet_url IS NOT NULL AND u.google_sheet_url != '' THEN 1 ELSE 0 END as hasSheet,
          MAX(ic.updated_at) as lastSync
        FROM users u
        LEFT JOIN insurance_customers ic ON u.id = ic.user_id
        WHERE u.role = 'client' AND u.client_type = 'insurance' AND IFNULL(u.status,'active') <> 'deleted'
        GROUP BY u.id, u.name, u.email, u.google_sheet_url, u.client_type
        ORDER BY u.name
      `, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    
    const allClients = [...hrClients, ...insuranceClients];
    res.json({ clients: allClients });
  } catch (error) {
    next(error);
  }
});

router.get('/client/:clientId', requireRole('admin'), (req, res, next) => {
  try {
    const db = getDatabase();
    const clientId = parseInt(req.params.clientId, 10);
    
    // Get client info and sheet status
    db.get('SELECT name, google_sheet_url FROM users WHERE id = ? AND role = "client"', [clientId], (err, client) => {
      if (err) return next(err);
      if (!client) return res.status(404).json({ error: 'Client not found' });
      
      // Get all candidates with their data
      db.all(`
        SELECT 
          name, email, mobile, interview_date, summary, job_description, 
          resume_text, transcript, status, match_score, matching_skills, 
          missing_skills, created_at, updated_at
        FROM candidates 
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `, [clientId], (err, candidates) => {
        if (err) return next(err);
        
        const totalCandidates = candidates.length;
        const shortlisted = candidates.filter(c => c.status === 'shortlisted').length;
        const rejected = candidates.filter(c => c.status === 'rejected').length;
        const inProcess = candidates.filter(c => c.status === 'in_process').length;
        
        // Calculate today's interviews
        const today = new Date().toISOString().split('T')[0];
        const interviewsToday = candidates.filter(c => 
          c.interview_date && c.interview_date.includes(today)
        ).length;
        
        // Get recent activity (last 10 candidates)
        const recentActivity = candidates.slice(0, 10).map(c => ({
          name: c.name,
          status: c.status,
          updatedAt: c.updated_at
        }));
        
        res.json({
          totalCandidates,
          shortlisted,
          rejected,
          inProcess,
          interviewsToday,
          newApplicationsToday: candidates.filter(c => 
            c.created_at && c.created_at.includes(today)
          ).length,
          sheetConnected: !!(client.google_sheet_url),
          recentActivity,
          candidates: candidates.map(c => ({
            ...c,
            transcript: c.transcript || 'No transcript available'
          }))
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;