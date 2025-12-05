const express = require('express');
const { authRequired } = require('../middleware/auth');
const { get, run, all } = require('../db/connection');
const emailService = require('../services/emailService');
const emailSheetsService = require('../services/emailSheetsService');

const router = express.Router();

router.post('/log', async (req, res, next) => {
  try {
    const { user_id, candidate_name, email_type, sent_date, email, meet_link, job_title } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'email required' });
    }
    
    const result = await run(
      'INSERT INTO email_logs (user_id, candidate_email, candidate_name, email_type, sent_at, meet_link, job_title) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id || null, email, candidate_name || 'Unknown', email_type || 'custom', sent_date || new Date().toISOString(), meet_link, job_title]
    );
    
    res.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Email log error:', error);
    res.status(500).json({ error: 'Failed to log email' });
  }
});

router.post('/log-sent', async (req, res, next) => {
  try {
    const { candidate_email, candidate_name, email_type, gmail_message_id } = req.body;
    
    if (!candidate_email || !candidate_name) {
      return res.status(400).json({ error: 'Missing required fields: candidate_email, candidate_name' });
    }
    
    const cleanEmail = candidate_email.replace('mailto:', '');
    
    const result = await run(
      'INSERT INTO email_logs (user_id, candidate_email, candidate_name, email_type, gmail_message_id, sent_at) VALUES (?, ?, ?, ?, ?, ?)',
      [1, cleanEmail, candidate_name, email_type, gmail_message_id, new Date().toISOString()]
    );
    
    res.json({ success: true, id: result.id });
  } catch (error) {
    next(error);
  }
});

router.use(authRequired);

router.post('/sync-workflow', async (req, res, next) => {
  try {
    const syncResult = await emailSheetsService.syncEmailsFromSheets();
    const syncStats = await emailSheetsService.syncEmailsToDatabase(syncResult.emails || []);
    
    const messages = []
    if (syncStats.imported > 0) messages.push(`${syncStats.imported} added`)
    if (syncStats.updated > 0) messages.push(`${syncStats.updated} updated`)
    if (syncStats.deleted > 0) messages.push(`${syncStats.deleted} deleted`)
    
    const message = messages.length > 0 
      ? `Sync complete: ${messages.join(', ')}` 
      : 'No changes needed - already in sync'
    
    res.json({
      success: true,
      message,
      ...syncStats
    });
  } catch (error) {
    console.error('Email sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync workflow emails' });
  }
});

router.get('/templates', (req, res) => {
  try {
    const templates = emailService.getTemplates();
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const { candidateId, emailType, limit = 100 } = req.query;
    
    let query = 'SELECT * FROM email_logs WHERE (user_id = ? OR user_id IS NULL)';
    const params = [req.user.id];
    
    if (candidateId) {
      query += ' AND candidate_id = ?';
      params.push(parseInt(candidateId, 10));
    }
    
    if (emailType) {
      query += ' AND email_type = ?';
      params.push(emailType);
    }
    
    query += ' ORDER BY sent_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));
    
    const emails = await all(query, params);
    res.json({ emails, total: emails.length });
  } catch (error) {
    next(error);
  }
});

router.post('/send', async (req, res, next) => {
  try {
    const { candidateId, templateType, jobId } = req.body;

    if (!candidateId || !templateType) {
      return res.status(400).json({ error: 'Candidate ID and template type are required' });
    }

    const candidate = await get('SELECT * FROM candidates WHERE id = ? AND user_id = ?', [candidateId, req.user.id]);
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    let job = null;
    if (jobId) {
      job = await get('SELECT * FROM jobs WHERE id = ? AND user_id = ?', [jobId, req.user.id]);
    }

    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);

    const variables = {
      candidateName: candidate.name,
      jobTitle: job?.title || 'Position',
      companyName: user?.company_name || 'Our Company'
    };

    await emailService.sendEmail({
      to: candidate.email,
      templateType,
      variables,
      userId: req.user.id,
      candidateId: candidate.id,
      jobId: job?.id
    });

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

router.post('/bulk-send', async (req, res, next) => {
  try {
    const { candidateIds, templateType, jobId } = req.body;

    if (!candidateIds?.length || !templateType) {
      return res.status(400).json({ error: 'Candidate IDs and template type are required' });
    }

    const results = [];
    
    for (const candidateId of candidateIds) {
      try {
        const candidate = await get('SELECT * FROM candidates WHERE id = ? AND user_id = ?', [candidateId, req.user.id]);
        
        if (!candidate) {
          results.push({ candidateId, status: 'failed', error: 'Candidate not found' });
          continue;
        }

        let job = null;
        if (jobId) {
          job = await get('SELECT * FROM jobs WHERE id = ? AND user_id = ?', [jobId, req.user.id]);
        }

        const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);

        const variables = {
          candidateName: candidate.name,
          jobTitle: job?.title || 'Position',
          companyName: user?.company_name || 'Our Company'
        };

        await emailService.sendEmail({
          to: candidate.email,
          templateType,
          variables,
          userId: req.user.id,
          candidateId: candidate.id,
          jobId: job?.id
        });

        results.push({ candidateId, status: 'sent' });
      } catch (error) {
        results.push({ candidateId, status: 'failed', error: error.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
