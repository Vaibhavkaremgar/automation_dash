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
const DOC_UPLOADER_API = process.env.DOC_UPLOADER_API_URL || 'http://localhost:3001/api'

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

    // Forward request to external doc uploader API
    const response = await axios.get(`${DOC_UPLOADER_API}/documents/activity`, {
      params: {
        limit,
        clientEmail,
      },
      headers: {
        'Authorization': req.headers.authorization,
        'X-Client-Email': clientEmail,
      },
      timeout: 5000,
    })

    res.json(response.data)
  } catch (error) {
    console.error('Error fetching doc activity:', error.message)
    
    // Return mock data if external service is unavailable
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

    const response = await axios.get(`${DOC_UPLOADER_API}/documents/stats`, {
      params: { clientEmail },
      headers: {
        'Authorization': req.headers.authorization,
        'X-Client-Email': clientEmail,
      },
      timeout: 5000,
    })

    res.json(response.data)
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

    // Return redirect URL with authentication
    const redirectUrl = new URL(process.env.DOC_UPLOADER_URL || 'http://localhost:3001')
    redirectUrl.searchParams.append('email', user.email)
    redirectUrl.searchParams.append('token', token)
    redirectUrl.searchParams.append('clientId', user.id)

    res.json({
      redirectUrl: redirectUrl.toString(),
      expiresIn: 3600, // 1 hour
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
    const { page = 1, limit = 20 } = req.query
    const clientEmail = req.user?.email

    if (!clientEmail) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const response = await axios.get(`${DOC_UPLOADER_API}/documents`, {
      params: {
        page,
        limit,
        clientEmail,
      },
      headers: {
        'Authorization': req.headers.authorization,
        'X-Client-Email': clientEmail,
      },
      timeout: 5000,
    })

    res.json(response.data)
  } catch (error) {
    console.error('Error fetching documents:', error.message)
    res.status(500).json({ error: 'Failed to fetch documents' })
  }
})

module.exports = router
