const { google } = require('googleapis');
const axios = require('axios');
const config = require('../config/env');
const { get, run, all } = require('../db/connection');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i+1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) { row.push(cur); cur = ''; continue; }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (cur.length || row.length) { row.push(cur); rows.push(row); row = []; cur=''; }
      continue;
    }
    cur += ch;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

class SheetsService {
  constructor() {
    const disable = process.env.GOOGLE_DISABLE_AUTH === '1'
    const hasCreds = !!(config.google.clientEmail && config.google.privateKey && /BEGIN\s+PRIVATE\s+KEY/.test(config.google.privateKey))
    if (!disable && hasCreds) {
      try {
        this.auth = new google.auth.JWT(
          config.google.clientEmail,
          null,
          config.google.privateKey,
          ['https://www.googleapis.com/auth/spreadsheets']
        );
        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      } catch (e) {
        console.error('Google auth init failed:', e?.message || e);
        this.sheets = null;
        this.lastError = 'Invalid Google credentials (check GOOGLE_PRIVATE_KEY formatting)';
      }
    }
    this.activeJobsTab = 'Active_Jobs';
    this.jobApplicationsTab = 'Job_Applications';
  }

  async createJob(jobData) {
    if (!this.sheets) {
      throw new Error('Google Sheets not configured');
    }
    
    try {
      const spreadsheetId = config.google.spreadsheetId || '1amZkYzhw2lMmIbw0ftFAw8KJ1SX86zJ2rubWDQgs8CE';
      const jobId = `JOB-${Date.now()}`;
      const createdDate = new Date().toISOString();
      
      const values = [[
        jobData.title,
        jobData.department || '',
        jobData.requiredSkills || '',
        jobData.experienceRequired || '',
        jobData.description || '',
        jobData.status || 'open',
        createdDate,
        jobData.createdBy || 'System',
        jobId
      ]];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${this.activeJobsTab}!A:I`,
        valueInputOption: 'RAW',
        resource: { values }
      });

      console.log(`✅ Job created in Google Sheets: ${jobData.title}`);
      return { jobId, success: true };
      
    } catch (error) {
      console.error('❌ Error creating job in Google Sheets:', error);
      throw error;
    }
  }

  async getActiveJobs() {
    if (!this.sheets) {
      return [];
    }
    
    try {
      const spreadsheetId = config.google.spreadsheetId || '1amZkYzhw2lMmIbw0ftFAw8KJ1SX86zJ2rubWDQgs8CE';
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${this.activeJobsTab}!A:I`,
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        return [];
      }

      return rows.slice(1).map((row, index) => ({
        id: row[8] || `job-${index}`,
        title: row[0] || '',
        department: row[1] || '',
        requiredSkills: row[2] || '',
        experienceRequired: row[3] || '',
        description: row[4] || '',
        status: row[5] || 'open',
        createdDate: row[6] || '',
        createdBy: row[7] || '',
        jobId: row[8] || ''
      })).filter(job => job.status === 'open');
      
    } catch (error) {
      console.error('❌ Error fetching active jobs:', error);
      return [];
    }
  }

  async createJobApplication(applicationData) {
    if (!this.sheets) {
      console.warn('Google Sheets not configured, skipping application logging');
      return { applicationId: `APP-${Date.now()}`, success: false, skipped: true };
    }
    
    try {
      const spreadsheetId = config.google.spreadsheetId || '1amZkYzhw2lMmIbw0ftFAw8KJ1SX86zJ2rubWDQgs8CE';
      const applicationId = `APP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const appliedDate = new Date().toISOString();
      
      const values = [[
        applicationId,
        applicationData.jobTitle,
        applicationData.candidateName,
        applicationData.email,
        applicationData.phone || '',
        applicationData.resumeFilename,
        appliedDate,
        applicationData.status || 'applied',
        applicationData.matchScore || '',
        applicationData.notes || ''
      ]];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${this.jobApplicationsTab}!A:J`,
        valueInputOption: 'RAW',
        resource: { values }
      });

      console.log(`✅ Job application created: ${applicationData.candidateName} for ${applicationData.jobTitle}`);
      return { applicationId, success: true };
      
    } catch (error) {
      console.error('❌ Error creating job application:', error.message);
      return { applicationId: `APP-${Date.now()}`, success: false, error: error.message };
    }
  }

  async syncCandidates(userId = null, spreadsheetIdOverride = null, sheetTabOverride = null) {
    const spreadsheetId = spreadsheetIdOverride || config.google.spreadsheetId || '1amZkYzhw2lMmIbw0ftFAw8KJ1SX86zJ2rubWDQgs8CE';
    const sheetTab = sheetTabOverride || config.google.sheetTab || 'output';

    console.log(`Syncing candidates for user ${userId} from sheet ${spreadsheetId}, tab ${sheetTab}`);

    let rows;
    if (this.sheets) {
      try {
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetTab}!A:J`,
        });
        rows = response.data.values;
        console.log(`Got ${rows?.length || 0} rows from Google Sheets API`);
      } catch (e) {
        console.log('Google Sheets API failed, trying CSV fallback:', e.message);
        rows = null;
      }
    }

    if (!rows) {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetTab)}`;
        console.log('Trying CSV fallback URL:', url);
        const resp = await axios.get(url, { timeout: 10000 });
        const csvRows = parseCsv(resp.data);
        rows = csvRows;
        console.log(`Got ${rows?.length || 0} rows from CSV fallback`);
      } catch (e) {
        console.error('CSV fallback failed:', e.message);
        throw new Error('Google Sheets API not configured or public sheet not accessible');
      }
    }

    const targetUserId = userId || 1;
    
    if (!rows || rows.length <= 1) {
      console.log('No data in sheet or only header row');
      const result = await run('DELETE FROM candidates WHERE user_id = ?', [targetUserId]);
      return { imported: 0, updated: 0, deleted: result.changes };
    }
    
    console.log(`Processing ${rows.length - 1} data rows (excluding header)`);
    
    const data = rows.slice(1);
    let imported = 0;
    let updated = 0;
    let deleted = 0;
    
    const existingCandidates = await all('SELECT id, email, sheet_row_id FROM candidates WHERE user_id = ?', [targetUserId]);
    
    const sheetRowIds = new Set();
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowId = `row_${i + 2}`;
      sheetRowIds.add(rowId);
      
      const hasMeetLink = row.some(cell => 
        cell && typeof cell === 'string' && 
        (cell.toLowerCase().includes('meet.google.com') || 
         cell.toLowerCase().includes('zoom.us') ||
         cell.toLowerCase().includes('teams.microsoft.com') ||
         cell.toLowerCase().includes('interview scheduled') ||
         cell.toLowerCase().includes('meeting link'))
      );
      
      const isInProcess = row.some(cell => 
        cell && typeof cell === 'string' && 
        (cell.toLowerCase().includes('calling') || 
         cell.toLowerCase().includes('pending'))
      );
      
      let status;
      if (hasMeetLink) {
        status = 'shortlisted';
      } else if (isInProcess) {
        status = 'in_process';
      } else {
        status = 'shortlisted';
      }
      
      let matchScore = null;
      if (row[3]) {
        const scoreStr = String(row[3]).replace('%', '').trim();
        const parsed = parseInt(scoreStr);
        if (!isNaN(parsed)) {
          matchScore = parsed;
        }
      }
      
      const candidate = {
        name: row[0] || null,
        email: row[1] || null,
        summary: row[2] || null,
        match_score: matchScore,
        resume_text: row[4] || null,
        mobile: row[5] || null,
        interview_date: row[6] || null,
        status: row[7] || status,
        transcript: row[8] || null,
        job_description: row[9] || null,
        matching_skills: row[10] || null,
        missing_skills: null
      };
      
      if (!candidate.email || !candidate.name) {
        console.log(`Skipping row ${i + 2}: missing email or name`);
        continue;
      }
      
      try {
        const existing = existingCandidates.find(c => c.sheet_row_id === rowId);
        
        if (existing) {
          await run(
            `UPDATE candidates SET 
             name = ?, email = ?, mobile = ?, interview_date = ?, summary = ?, 
             job_description = ?, resume_text = ?, transcript = ?, status = ?, 
             match_score = ?, matching_skills = ?, missing_skills = ?,
             updated_at = CURRENT_TIMESTAMP
             WHERE sheet_row_id = ? AND user_id = ?`,
            [
              candidate.name, candidate.email, candidate.mobile, candidate.interview_date,
              candidate.summary, candidate.job_description, candidate.resume_text,
              candidate.transcript, candidate.status, candidate.match_score,
              candidate.matching_skills, candidate.missing_skills, rowId, targetUserId
            ]
          );
          updated++;
        } else {
          const result = await run(
            `INSERT INTO candidates (user_id, name, email, mobile, interview_date, summary, job_description, resume_text, transcript, status, sheet_row_id, match_score, matching_skills, missing_skills)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              targetUserId, candidate.name, candidate.email, candidate.mobile,
              candidate.interview_date, candidate.summary, candidate.job_description,
              candidate.resume_text, candidate.transcript, candidate.status, rowId,
              candidate.match_score, candidate.matching_skills, candidate.missing_skills
            ]
          );
          if (result.changes > 0) imported++;
        }
      } catch (err) {
        console.error('Error syncing row:', err.message);
      }
    }
    
    for (const existing of existingCandidates) {
      if (!sheetRowIds.has(existing.sheet_row_id)) {
        await run('DELETE FROM candidates WHERE id = ?', [existing.id]);
        deleted++;
      }
    }
    
    console.log(`Sync completed: ${imported} imported, ${updated} updated, ${deleted} deleted`);
    return { imported, updated, deleted };
  }
}

module.exports = new SheetsService();
