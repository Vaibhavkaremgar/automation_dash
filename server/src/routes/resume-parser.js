const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file upload
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

router.use(authRequired);

// Enhanced text extraction function
async function extractTextFromBuffer(buffer, mimetype) {
  try {
    if (mimetype === 'application/pdf') {
      const data = await pdf(buffer);
      return data.text;
    }
    
    // For DOC/DOCX, basic text extraction
    const text = buffer.toString('utf8');
    // Clean up binary data and extract readable text
    return text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ');
  } catch (error) {
    console.error('Error extracting text:', error);
    // Fallback to basic string conversion
    return buffer.toString('utf8').replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').replace(/\s+/g, ' ');
  }
}

// Extract candidate info from resume text
function parseResumeText(text) {
  const result = {
    name: '',
    email: '',
    phone: ''
  };

  // Extract email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    result.email = emailMatch[0];
  }

  // Extract phone number
  const phonePatterns = [
    /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    /(\+\d{1,3}[-.\s]?)?\d{10}/,
    /(\+91[-.\s]?)?\d{10}/
  ];
  
  for (const pattern of phonePatterns) {
    const phoneMatch = text.match(pattern);
    if (phoneMatch) {
      result.phone = phoneMatch[0].replace(/[-.\s()]/g, '');
      break;
    }
  }

  // Extract name (look for common patterns)
  const namePatterns = [
    /Name[:\s]+([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
    /^([A-Z][a-z]+\s+[A-Z][a-z]+)/m,
    /Resume of ([A-Z][a-z]+\s+[A-Z][a-z]+)/i
  ];

  for (const pattern of namePatterns) {
    const nameMatch = text.match(pattern);
    if (nameMatch) {
      result.name = nameMatch[1].trim();
      break;
    }
  }

  // If no name found, try to extract from first line
  if (!result.name) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    for (const line of lines.slice(0, 5)) {
      const cleanLine = line.trim();
      if (cleanLine.length > 3 && cleanLine.length < 50 && 
          /^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(cleanLine)) {
        result.name = cleanLine;
        break;
      }
    }
  }

  return result;
}

// Parse resume endpoint
router.post('/parse', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    
    // Extract text from file
    const text = await extractTextFromBuffer(buffer, req.file.mimetype);
    
    // Parse candidate information
    const candidateInfo = parseResumeText(text);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      candidateInfo
    });

  } catch (error) {
    console.error('Error parsing resume:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to parse resume',
      details: error.message 
    });
  }
});

module.exports = router;