const express = require('express');
const { authRequired } = require('../middleware/auth');
const sheetsService = require('../services/sheets');

const router = express.Router();

router.use(authRequired);

// Create job application in Google Sheets
router.post('/create', async (req, res, next) => {
  try {
    const {
      jobTitle,
      candidateName,
      email,
      phone,
      resumeFilename,
      status = 'applied',
      matchScore = '',
      notes = ''
    } = req.body;

    if (!jobTitle || !candidateName || !email) {
      return res.status(400).json({ 
        error: 'Job title, candidate name, and email are required' 
      });
    }

    try {
      const result = await sheetsService.createJobApplication({
        jobTitle,
        candidateName,
        email,
        phone,
        resumeFilename,
        status,
        matchScore,
        notes
      });

      res.status(201).json({
        message: 'Application created successfully',
        applicationId: result.applicationId
      });
    } catch (sheetsError) {
      console.error('Google Sheets error:', sheetsError.message);
      // Return success even if sheets fails - don't block the upload
      res.status(201).json({
        message: 'Application logged (Sheets unavailable)',
        warning: 'Google Sheets logging failed but upload will continue'
      });
    }

  } catch (error) {
    console.error('Error creating job application:', error);
    res.status(500).json({ 
      error: 'Failed to create job application' 
    });
  }
});

// Log auto-submitted applications (from email workflow)
router.post('/auto-submit', async (req, res, next) => {
  try {
    const applicationData = req.body;
    
    // Log the application attempt
    console.log('Auto-application received:', {
      status: applicationData.status,
      candidateName: applicationData.candidateName,
      jobTitle: applicationData.jobTitle || applicationData.requestedJob,
      timestamp: new Date().toISOString()
    });

    // If it's a successful match, create in sheets
    if (applicationData.status === 'matched') {
      try {
        await sheetsService.createJobApplication({
          jobTitle: applicationData.jobTitle,
          candidateName: applicationData.candidateName,
          email: applicationData.candidateEmail,
          phone: applicationData.mobileNumber,
          resumeFilename: applicationData.resumeFilename,
          status: 'applied',
          matchScore: applicationData.matchScore + '%',
          notes: `Auto-application via email. Match confidence: ${applicationData.matchConfidence}`
        });
      } catch (sheetsError) {
        console.error('Error logging to sheets:', sheetsError);
      }
    }

    res.json({ 
      message: 'Application logged successfully',
      status: applicationData.status 
    });

  } catch (error) {
    console.error('Error logging auto-application:', error);
    res.status(500).json({ 
      error: 'Failed to log application' 
    });
  }
});

module.exports = router;