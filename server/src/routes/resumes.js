const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { authRequired } = require('../middleware/auth');
const config = require('../config/env');

const router = express.Router();

// Configure multer for memory storage and PDF validation
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSizeMB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'));
    }
  },
});

// Configure multer for ZIP files
const uploadZip = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for ZIP
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files allowed'));
    }
  },
});

// Test route to verify endpoint is working
router.get('/test', (req, res) => {
  res.json({ message: 'Resumes endpoint is working', timestamp: new Date().toISOString() });
});

// Test upload endpoint (without auth for debugging)
router.post('/test-upload', upload.single('resume'), (req, res) => {
  console.log('Test upload received');
  console.log('File:', req.file?.originalname);
  console.log('Body:', req.body);
  
  res.json({
    message: 'Test upload successful',
    file: req.file ? {
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    } : null,
    body: req.body
  });
});

/**
 * @route POST /api/resumes/upload
 * @desc Upload resume and forward to n8n workflow (now includes JD info)
 * @access Protected
 */
router.post('/upload', authRequired, upload.single('resume'), async (req, res, next) => {
  console.log('📄 Resume upload request received');
  console.log('User:', req.user?.id);
  console.log('File:', req.file?.originalname);
  console.log('Body:', req.body);
  
  try {
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ error: 'Resume file is required.' });
    }

    const {
      jobId,
      jobTitle,
      jobDescription,
      jobStatus,
    } = req.body;

    console.log('Job data:', { jobId, jobTitle, jobDescription, jobStatus });

    const webhookUrl = config.n8n.webhookUrl;
    const authHeader = config.n8n.authHeader;

    console.log('Webhook URL:', webhookUrl);

    // Handle missing webhook URL
    if (!webhookUrl) {
      console.log('❌ Webhook URL not configured');
      return res.json({
        message: 'Resume accepted but webhook is not configured. Please set N8N_WEBHOOK_URL.',
        filename: req.file.originalname,
        jobData: { jobTitle, jobDescription, jobStatus }
      });
    }

    // Prepare form data for n8n
    console.log('📤 Preparing form data for n8n');
    const form = new FormData();
    
    try {
      form.append('resume', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });

      // Basic details
      form.append('userId', String(req.user.id));
      if (jobId) form.append('jobId', String(jobId));
      if (jobTitle) form.append('jobTitle', String(jobTitle));
      if (jobDescription) form.append('jobDescription', String(jobDescription));
      if (jobStatus) form.append('jobStatus', String(jobStatus));

      console.log('📋 Form data prepared');

      // Prepare headers
      const headers = { ...form.getHeaders() };
      if (authHeader) headers['Authorization'] = authHeader;

      console.log('🚀 Sending to n8n webhook:', webhookUrl);
      
      const response = await axios.post(webhookUrl, form, {
        headers,
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log('✅ n8n webhook success:', response.status);

      // Log success (simplified for now)
      console.log('📊 Usage logged for user:', req.user.id);

      return res.json({
        message: '✅ Resume uploaded and sent to n8n successfully!',
        filename: req.file.originalname,
        sentData: { jobId, jobTitle, jobDescription, jobStatus },
        webhookStatus: response.status,
        webhookResponse: response.data,
      });
    } catch (webhookError) {
      console.error('❌ n8n Webhook Error:', webhookError.message);
      console.error('Error details:', webhookError.response?.data || webhookError.code);
      
      // Return success anyway - don't block the upload
      return res.json({
        message: '✅ Resume uploaded successfully (n8n webhook failed but file received)',
        filename: req.file.originalname,
        sentData: { jobId, jobTitle, jobDescription, jobStatus },
        warning: 'n8n webhook unreachable - check webhook URL and ensure n8n is running',
        webhookError: webhookError.message
      });
    }
  } catch (error) {
    console.error('❌ Resume Upload Error:', error);
    console.error('Stack trace:', error.stack);
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred during upload',
    });
  }
});

/**
 * @route POST /api/resumes/upload-bulk
 * @desc Upload ZIP file directly to n8n webhook
 * @access Protected
 */
router.post('/upload-bulk', authRequired, uploadZip.single('zipFile'), async (req, res, next) => {
  console.log('📦 Bulk resume upload request received');
  console.log('User:', req.user?.id);
  console.log('File:', req.file?.originalname);
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'ZIP file is required.' });
    }

    const webhookUrl = config.n8n.bulkWebhookUrl || config.n8n.webhookUrl;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'n8n webhook not configured. Set N8N_WEBHOOK_URL in .env file.' });
    }

    console.log('🚀 Sending ZIP to n8n webhook:', webhookUrl);
    console.log('   (Using bulk webhook:', config.n8n.bulkWebhookUrl ? 'YES' : 'NO - using default)');

    const form = new FormData();
    form.append('data', req.file.buffer, {
      filename: req.file.originalname,
      contentType: 'application/zip'
    });
    form.append('userId', String(req.user.id));
    form.append('bulkUpload', 'true');

    try {
      const response = await axios.post(webhookUrl, form, {
        headers: form.getHeaders(),
        timeout: 60000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      console.log('✅ n8n webhook success:', response.status);
      return res.json({
        success: true,
        message: 'Bulk resumes uploaded successfully',
        data: response.data
      });
    } catch (webhookError) {
      console.error('❌ Webhook Error:', webhookError.message);
      console.error('Status:', webhookError.response?.status);
      console.error('URL:', webhookUrl);
      
      if (webhookError.response?.status === 404) {
        return res.status(400).json({
          error: 'n8n webhook not found (404)',
          message: 'The webhook URL is incorrect or the n8n workflow is not active.',
          webhookUrl: webhookUrl,
          suggestion: 'Check: 1) n8n workflow is active, 2) webhook URL is correct, 3) workflow accepts bulk uploads'
        });
      }
      
      throw webhookError;
    }
  } catch (error) {
    console.error('❌ Bulk Upload Error:', error.message);
    return res.status(500).json({
      error: 'Bulk upload failed',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});



// Manual trigger endpoint for testing n8n workflow
router.post('/trigger-workflow', authRequired, upload.single('resume'), async (req, res) => {
  console.log('🔧 Manual workflow trigger');
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Resume file is required' });
    }

    const webhookUrl = config.n8n.webhookUrl;
    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL not configured' });
    }

    const form = new FormData();
    form.append('resume', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    form.append('userId', String(req.user.id));
    form.append('jobTitle', req.body.jobTitle || 'Test Job');
    form.append('jobDescription', req.body.jobDescription || 'Test Description');
    form.append('manualTrigger', 'true');

    // Try production webhook first, then test webhook
    const urls = [
      webhookUrl,
      webhookUrl.replace('/webhook/', '/webhook-test/')
    ];

    let lastError;
    for (const url of urls) {
      try {
        console.log('Trying:', url);
        const response = await axios.post(url, form, {
          headers: form.getHeaders(),
          timeout: 30000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });
        
        return res.json({
          success: true,
          message: 'Workflow triggered successfully',
          webhookUrl: url,
          response: response.data
        });
      } catch (err) {
        lastError = err;
        console.log('Failed:', url, err.message);
      }
    }

    throw lastError;
  } catch (error) {
    console.error('Trigger error:', error.message);
    return res.status(500).json({
      error: 'Failed to trigger workflow',
      message: error.message
    });
  }
});

// Health check for resumes endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    endpoint: '/api/resumes',
    webhookConfigured: !!config.n8n.webhookUrl,
    webhookUrl: config.n8n.webhookUrl ? 'configured' : 'not configured'
  });
});

module.exports = router;
