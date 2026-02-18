const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const { get, run, all } = require('../db/connection');

class AnalyticsService {
  constructor() {
    this.serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }

  async getClientAnalytics(userId) {
    try {
      const user = await get('SELECT google_sheet_url FROM users WHERE id = ?', [userId]);
      
      if (!user?.google_sheet_url) {
        return { error: 'No Google Sheet configured for this client' };
      }

      const sheetId = this.extractSheetId(user.google_sheet_url);
      if (!sheetId) {
        return { error: 'Invalid Google Sheet URL' };
      }

      let analytics;
      try {
        const doc = new GoogleSpreadsheet(sheetId, this.serviceAccountAuth);
        await doc.loadInfo();
        
        const sheet = doc.sheetsByIndex[0];
        await sheet.loadHeaderRow();
        const rows = await sheet.getRows();

        analytics = this.calculateAnalytics(rows);
        await this.cacheAnalytics(userId, analytics);
      } catch (sheetError) {
        console.error('Google Sheets error for user', userId, ':', sheetError.message);
        analytics = await this.getCachedAnalytics(userId);
        analytics.error = 'Unable to fetch live data. Showing cached results.';
      }
      
      return analytics;
    } catch (error) {
      console.error('Analytics error:', error);
      return this.getCachedAnalytics(userId);
    }
  }

  extractSheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  calculateAnalytics(rows) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = now.toDateString();

    let totalResumes = rows.length;
    let interviewsScheduled = 0;
    let interviewsToday = 0;
    let weeklyResumes = 0;
    let weeklyInterviews = 0;
    let shortlisted = 0;
    let rejected = 0;

    rows.forEach(row => {
      const rowData = row._rawData;
      
      const hasMeetLink = rowData.some(cell => 
        cell && typeof cell === 'string' && 
        (cell.toLowerCase().includes('meet.google.com') || 
         cell.toLowerCase().includes('zoom.us') ||
         cell.toLowerCase().includes('teams.microsoft.com') ||
         cell.toLowerCase().includes('interview scheduled') ||
         cell.toLowerCase().includes('meeting link'))
      );
      
      if (hasMeetLink) {
        shortlisted++;
        interviewsScheduled++;
        
        const hasToday = rowData.some(cell => 
          cell && typeof cell === 'string' && cell.includes(today.split(' ')[0])
        );
        if (hasToday) interviewsToday++;
      } else {
        rejected++;
      }

      const timestamp = this.extractTimestamp(rowData);
      if (timestamp && timestamp > weekAgo) {
        weeklyResumes++;
        if (hasMeetLink) weeklyInterviews++;
      }
    });

    return {
      totalResumes,
      interviewsScheduled,
      interviewsToday,
      weeklyResumes,
      weeklyInterviews,
      shortlisted,
      rejected,
      lastUpdated: new Date().toISOString()
    };
  }

  extractTimestamp(rowData) {
    for (const cell of rowData) {
      if (cell && typeof cell === 'string') {
        const date = new Date(cell);
        if (!isNaN(date.getTime()) && date.getFullYear() > 2020) {
          return date;
        }
      }
    }
    return null;
  }

  async cacheAnalytics(userId, analytics) {
    try {
      const existing = await get('SELECT id FROM client_analytics_cache WHERE user_id = ?', [userId]);
      
      if (existing) {
        await run(`
          UPDATE client_analytics_cache SET
            total_resumes = ?,
            interviews_scheduled = ?,
            interviews_today = ?,
            weekly_resumes = ?,
            weekly_interviews = ?,
            last_updated = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `, [
          analytics.totalResumes,
          analytics.interviewsScheduled,
          analytics.interviewsToday,
          analytics.weeklyResumes,
          analytics.weeklyInterviews,
          userId
        ]);
      } else {
        await run(`
          INSERT INTO client_analytics_cache 
          (user_id, total_resumes, interviews_scheduled, interviews_today, weekly_resumes, weekly_interviews, last_updated)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
          userId,
          analytics.totalResumes,
          analytics.interviewsScheduled,
          analytics.interviewsToday,
          analytics.weeklyResumes,
          analytics.weeklyInterviews
        ]);
      }
    } catch (error) {
      console.error('Cache error:', error);
    }
  }

  async getCachedAnalytics(userId) {
    try {
      const cached = await get('SELECT * FROM client_analytics_cache WHERE user_id = ?', [userId]);
      
      if (cached) {
        return {
          totalResumes: cached.total_resumes,
          interviewsScheduled: cached.interviews_scheduled,
          interviewsToday: cached.interviews_today,
          weeklyResumes: cached.weekly_resumes,
          weeklyInterviews: cached.weekly_interviews,
          lastUpdated: cached.last_updated,
          cached: true
        };
      }
    } catch (error) {
      console.error('Cache retrieval error:', error);
    }
    
    return {
      totalResumes: 0,
      interviewsScheduled: 0,
      interviewsToday: 0,
      weeklyResumes: 0,
      weeklyInterviews: 0,
      error: 'No data available'
    };
  }

  async getAllClientsAnalytics() {
    try {
      const clients = await all(`
        SELECT u.id, u.name, u.email, u.google_sheet_url,
               c.total_resumes, c.interviews_scheduled, c.interviews_today,
               c.weekly_resumes, c.weekly_interviews, c.last_updated
        FROM users u
        LEFT JOIN client_analytics_cache c ON u.id = c.user_id
        WHERE u.role = 'client' AND COALESCE(u.status, 'active') != 'deleted'
        ORDER BY u.created_at DESC
      `);
      
      return clients || [];
    } catch (error) {
      console.error('Get all analytics error:', error);
      return [];
    }
  }
}

module.exports = new AnalyticsService();
