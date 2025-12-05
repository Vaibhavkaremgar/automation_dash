const express = require('express');
const { authRequired } = require('../middleware/auth');
const { get, run, all } = require('../db/connection');
const axios = require('axios');
const config = require('../config/env');

const router = express.Router();

router.use(authRequired);

router.get('/', async (req, res, next) => {
  try {
    const result = await all('SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    const jobs = result;
    
    let activeJobs = [];
    try {
      const sheetsService = require('../services/sheets');
      activeJobs = await sheetsService.getActiveJobs();
    } catch (error) {
      console.error('Error fetching jobs from sheets:', error);
    }
    
    res.json({ jobs, activeJobs });
  } catch (error) {
    next(error);
  }
});

router.get('/active', async (req, res, next) => {
  try {
    const sheetsService = require('../services/sheets');
    const activeJobs = await sheetsService.getActiveJobs();
    res.json({ jobs: activeJobs });
  } catch (error) {
    console.error('Error fetching active jobs:', error);
    res.status(500).json({ error: 'Failed to fetch active jobs' });
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { title, description, requirements, department, requiredSkills, experienceRequired } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }

    const result = await pool.query(
      'INSERT INTO jobs (user_id, title, description, requirements, department) VALUES (?, ?, ?, ?, ?) RETURNING *',
      [req.user.id, title, description || null, requirements || null, department || null]
    );
    const job = result[0];
    
    try {
      const sheetsService = require('../services/sheets');
      await sheetsService.createJob({
        title,
        department,
        description,
        requiredSkills,
        experienceRequired,
        status: 'open',
        createdBy: req.user.email || req.user.name || 'User'
      });
    } catch (sheetsError) {
      console.error('Error creating job in Google Sheets:', sheetsError);
    }
    
    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const { title, description, requirements, status, department } = req.body;

    const checkResult = await pool.query('SELECT * FROM jobs WHERE id = ? AND user_id = ?', [jobId, req.user.id]);
    const job = checkResult.rows[0];
    if (!job) return res.status(404).json({ error: 'Job not found' });

    await pool.query(
      'UPDATE jobs SET title = ?, description = ?, requirements = ?, status = ?, department = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [
        title !== undefined ? title : job.title,
        description !== undefined ? description : job.description,
        requirements !== undefined ? requirements : job.requirements,
        status !== undefined ? status : job.status,
        department !== undefined ? department : job.department,
        jobId,
      ]
    );

    const updatedResult = await pool.query('SELECT * FROM jobs WHERE id = ?', [jobId]);
    const updated = updatedResult.rows[0];

    if (config.n8n && config.n8n.webhookUrl) {
      try {
        await axios.post(
          config.n8n.webhookUrl,
          {
            action: 'set_jd',
            userId: req.user.id,
            job: {
              id: updated.id,
              title: updated.title,
              description: updated.description,
              requirements: updated.requirements,
            },
          },
          { timeout: 5000 }
        );
      } catch (webhookErr) {
        console.warn('⚠️ n8n webhook failed:', webhookErr.message);
      }
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/select', async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.id, 10);

    const job = await get('SELECT * FROM jobs WHERE id = ? AND user_id = ?', [jobId, req.user.id]);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (config.n8n && config.n8n.webhookUrl) {
      try {
        await axios.post(
          config.n8n.webhookUrl,
          {
            action: 'set_jd',
            userId: req.user.id,
            job: {
              id: job.id,
              title: job.title,
              description: job.description,
              requirements: job.requirements,
            },
          },
          { timeout: 5000 }
        );
        return res.json({ message: 'JD sent to workflow' });
      } catch (e) {
        console.warn('⚠️ Workflow webhook failed:', e.message);
        return res.status(200).json({ message: 'Workflow placeholder: JD queued locally', jobId: job.id });
      }
    } else {
      return res.json({ message: 'Workflow placeholder: JD would be sent', jobId: job.id });
    }
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const result = await all('DELETE FROM jobs WHERE id = ? AND user_id = ?', [jobId, req.user.id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
