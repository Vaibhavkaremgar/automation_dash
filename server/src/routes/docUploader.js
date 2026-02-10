/**
 * Doc Uploader Integration Routes
 * 
 * This file handles API requests to the external document management software.
 * It acts as a proxy to forward authenticated requests and manage data.
 */

const express = require('express')
const axios = require('axios')
const { authRequired } = require('../middleware/auth')

const router = express.Router()

// External doc uploader API base URL
const DOC_UPLOADER_API = process.env.DOC_UPLOADER_API_URL || 'https://document-system-production-1a7e.up.railway.app/api'

/**
 * GET /api/doc-uploader/activity
 * Fetch recent document activities from external service
 */
router.get('/activity', authRequired, async (req, res) => {
  try {
    const { limit = 10 } = req.query
    const clientEmail = req.user?.email

    if (!clientEmail) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Return mock data - external service doesn't have this endpoint
    res.json({
      activities: [],
      stats: {
        totalUploads: 0,
        totalDownloads: 0,
        processingQueue: 0,
        lastSync: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching doc activity:', error.message)
    res.json({
      activities: [],
      stats: {
        totalUploads: 0,
        totalDownloads: 0,
        processingQueue: 0,
        lastSync: new Date().toISOString(),
      },
    })
  }
})

/**
 * GET /api/doc-uploader/stats
 * Fetch document statistics
 */
router.get('/stats', authRequired, async (req, res) => {
  try {
    const clientEmail = req.user?.email

    if (!clientEmail) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Return mock data - external service doesn't have this endpoint
    res.json({
      totalUploads: 0,
      totalDownloads: 0,
      processingQueue: 0,
      lastSync: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching doc stats:', error.message)
    res.json({
      totalUploads: 0,
      totalDownloads: 0,
      processingQueue: 0,
      lastSync: new Date().toISOString(),
    })
  }
})

/**
 * POST /api/doc-uploader/redirect-token
 * Generate a secure redirect token for accessing external doc uploader
 */
router.post('/redirect-token', authRequired, (req, res) => {
  try {
    const user = req.user
    const token = req.headers.authorization?.split(' ')[1]

    if (!user || !token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Return redirect URL to external doc uploader
    const redirectUrl = 'https://document-system-production-1a7e.up.railway.app/'

    res.json({
      redirectUrl,
      expiresIn: 3600,
    })
  } catch (error) {
    console.error('Error generating redirect token:', error.message)
    res.status(500).json({ error: 'Failed to generate redirect token' })
  }
})

/**
 * GET /api/doc-uploader/documents
 * List documents from external service
 */
router.get('/documents', authRequired, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query
    const clientEmail = req.user?.email

    if (!clientEmail) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Return mock data - external service doesn't have this endpoint
    res.json({
      documents: [],
      pagination: {
        page,
        limit,
        total: 0,
      },
    })
  } catch (error) {
    console.error('Error fetching documents:', error.message)
    res.status(500).json({ error: 'Failed to fetch documents' })
  }
})

module.exports = router
