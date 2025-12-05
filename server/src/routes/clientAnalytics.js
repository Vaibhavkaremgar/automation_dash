const express = require('express');
const { authRequired, requireRole } = require('../middleware/auth');
const sheetsService = require('../services/sheets');
const { getDatabase } = require('../db/connection');

const adminRequired = requireRole('admin');

const router = express.Router();

// Get analytics for a specific client from their Google Sheet
router.get('/client/:clientId', authRequired, adminRequired, async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const db = getDatabase();
    
    // Get client details including sheet URL
    const client = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ? AND role = "client"', [clientId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    let analytics = {
      clientName: client.name || client.email,
      totalCandidates: 0,
      shortlisted: 0,
      rejected: 0,
      avgMatchScore: 0,
      topSkills: [],
      recentActivity: [],
      sheetConnected: !!client.google_sheet_url,
      interviewsToday: 0,
      newApplicationsToday: 0
    };

    // If client has Google Sheets URL, fetch fresh data
    if (client.google_sheet_url) {
      try {
        // Extract spreadsheet ID from URL
        const match = client.google_sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          const spreadsheetId = match[1];
          
          // Sync data from sheet with your column structure
          await sheetsService.syncCandidates(clientId, spreadsheetId, 'output');
          
          // Get analytics from synced data
          const candidates = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM candidates WHERE user_id = ?', [clientId], (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            });
          });

          analytics.totalCandidates = candidates.length;
          analytics.shortlisted = candidates.filter(c => c.status === 'shortlisted' || c.status === 'Selected').length;
          analytics.rejected = candidates.filter(c => c.status === 'rejected' || c.status === 'Rejected').length;
          
          // No match score in your sheet, so set to 0
          analytics.avgMatchScore = 0;

          // No skills data in your sheet
          analytics.topSkills = [];

          // Recent activity (last 10 candidates)
          analytics.recentActivity = candidates
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, 10)
            .map(c => ({
              name: c.name,
              status: c.status,
              matchScore: 0,
              updatedAt: c.updated_at
            }));

          // Calculate today's metrics
          const today = new Date().toISOString().split('T')[0];
          analytics.newApplicationsToday = candidates.filter(c => 
            c.created_at && c.created_at.startsWith(today)
          ).length;
          
          // Count interviews today based on interview_date
          analytics.interviewsToday = candidates.filter(c => {
            if (!c.interview_date) return false;
            const interviewDate = new Date(c.interview_date).toISOString().split('T')[0];
            return interviewDate === today;
          }).length;
        }
      } catch (error) {
        console.error('Error fetching sheet data:', error);
        analytics.error = 'Failed to fetch data from Google Sheets';
      }
    }

    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

// Get analytics for all clients
router.get('/all', authRequired, adminRequired, async (req, res, next) => {
  try {
    const db = getDatabase();
    
    const clients = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM users WHERE role = "client"', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const clientAnalytics = [];

    for (const client of clients) {
      // Sync from Google Sheets if URL exists
      if (client.google_sheet_url) {
        try {
          const match = client.google_sheet_url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
          if (match) {
            const spreadsheetId = match[1];
            await sheetsService.syncCandidates(client.id, spreadsheetId, 'output');
          }
        } catch (error) {
          console.error(`Sync failed for client ${client.id}:`, error.message);
        }
      }

      // Get candidate count from database (after sync)
      const candidateCount = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM candidates WHERE user_id = ?', [client.id], (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      const shortlistedCount = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM candidates WHERE user_id = ? AND (status = "shortlisted" OR status = "Selected")', [client.id], (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      const rejectedCount = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM candidates WHERE user_id = ? AND (status = "rejected" OR status = "Rejected")', [client.id], (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        });
      });

      clientAnalytics.push({
        id: client.id,
        name: client.name || client.email,
        email: client.email,
        totalCandidates: candidateCount,
        shortlisted: shortlistedCount,
        rejected: rejectedCount,
        hasSheet: !!client.google_sheet_url,
        lastSync: new Date().toISOString()
      });
    }

    res.json({ clients: clientAnalytics });
  } catch (error) {
    next(error);
  }
});

module.exports = router;