const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const { getDatabase } = require('../db/connection');

const router = express.Router();

router.use(authRequired);

router.get('/all', requireRole('admin'), (req, res, next) => {
  try {
    const db = getDatabase();
    
    db.all(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.google_sheet_url,
        COUNT(DISTINCT c.id) as totalCandidates,
        COUNT(DISTINCT CASE WHEN c.status = 'shortlisted' THEN c.id END) as shortlisted,
        COUNT(DISTINCT CASE WHEN c.status = 'rejected' THEN c.id END) as rejected,
        COUNT(DISTINCT CASE WHEN c.status = 'in_process' THEN c.id END) as in_process,
        CASE WHEN u.google_sheet_url IS NOT NULL AND u.google_sheet_url != '' THEN 1 ELSE 0 END as hasSheet,
        MAX(c.updated_at) as lastSync
      FROM users u
      LEFT JOIN candidates c ON u.id = c.user_id
      WHERE u.role = 'client' AND IFNULL(u.status,'active') <> 'deleted'
      GROUP BY u.id, u.name, u.email, u.google_sheet_url
      ORDER BY u.name
    `, [], (err, clients) => {
      if (err) return next(err);
      
      res.json({ clients: clients || [] });
    });
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