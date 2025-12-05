const express = require('express');
const { authRequired } = require('../middleware/auth');
const voiceService = require('../services/voiceService');

const router = express.Router();

// All voice routes require authentication
router.use(authRequired);

/**
 * @route POST /api/voice/sync-interview
 * @desc Sync interview data from external workflow
 * @access Protected
 */
router.post('/sync-interview', async (req, res, next) => {
  try {
    const { candidateId, jobId, callId } = req.body;
    const userId = req.user.id;

    if (!candidateId || !jobId || !callId) {
      return res.status(400).json({ 
        error: 'Missing required fields: candidateId, jobId, callId' 
      });
    }

    // Sync data from voice platform
    const interviewData = await voiceService.syncInterviewData(callId);
    
    if (!interviewData) {
      return res.status(404).json({ error: 'Interview data not found' });
    }

    // Store in database
    const interviewId = await voiceService.storeInterviewData(
      candidateId,
      jobId,
      userId,
      callId,
      interviewData
    );

    res.json({
      success: true,
      message: 'Interview data synced successfully',
      data: {
        interviewId,
        ...interviewData
      }
    });

  } catch (error) {
    console.error('Sync interview error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to sync interview data' 
    });
  }
});

/**
 * @route GET /api/voice/interview/:id/status
 * @desc Get interview status and details
 * @access Protected
 */
router.get('/interview/:id/status', async (req, res, next) => {
  try {
    const interviewId = req.params.id;
    const userId = req.user.id;

    const interview = await voiceService.getInterviewStatus(interviewId);
    
    // Verify user owns this interview
    if (interview.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      data: {
        id: interview.id,
        status: interview.status,
        duration: interview.duration_seconds,
        cost: interview.cost_cents ? interview.cost_cents / 100 : 0,
        score: interview.overall_score,
        recommendation: interview.recommendation,
        startTime: interview.start_time,
        endTime: interview.end_time
      }
    });

  } catch (error) {
    console.error('Get interview status error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get interview status' 
    });
  }
});

/**
 * @route POST /api/voice/refresh-data/:callId
 * @desc Refresh interview data from voice platform
 * @access Protected
 */
router.post('/refresh-data/:callId', async (req, res, next) => {
  try {
    const callId = req.params.callId;
    const userId = req.user.id;

    // Sync latest data from voice platform
    const interviewData = await voiceService.syncInterviewData(callId);
    
    if (!interviewData) {
      return res.status(404).json({ error: 'Interview data not found' });
    }

    res.json({
      success: true,
      message: 'Interview data refreshed',
      data: interviewData
    });

  } catch (error) {
    console.error('Refresh data error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to refresh interview data' 
    });
  }
});

/**
 * @route GET /api/voice/interviews
 * @desc Get user's interview history
 * @access Protected
 */
router.get('/interviews', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const interviews = await voiceService.getUserInterviews(userId, limit);

    res.json({
      success: true,
      data: interviews.map(interview => ({
        id: interview.id,
        candidateName: interview.candidate_name,
        jobTitle: interview.job_title,
        status: interview.status,
        duration: interview.duration_seconds,
        cost: interview.cost_cents ? interview.cost_cents / 100 : 0,
        score: interview.overall_score,
        recommendation: interview.recommendation,
        createdAt: interview.created_at
      }))
    });

  } catch (error) {
    console.error('Get interviews error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get interview history' 
    });
  }
});

/**
 * @route GET /api/voice/interview/:id/transcript
 * @desc Get interview transcript
 * @access Protected
 */
router.get('/interview/:id/transcript', async (req, res, next) => {
  try {
    const interviewId = req.params.id;
    const userId = req.user.id;

    const interview = await voiceService.getInterviewStatus(interviewId);
    
    // Verify user owns this interview
    if (interview.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      data: {
        transcript: interview.transcript || 'Transcript not available',
        analysis: interview.ai_analysis ? JSON.parse(interview.ai_analysis) : null
      }
    });

  } catch (error) {
    console.error('Get transcript error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get transcript' 
    });
  }
});

module.exports = router;