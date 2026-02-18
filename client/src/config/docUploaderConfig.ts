/**
 * External Doc Uploader Integration Configuration
 * 
 * This file configures the connection to the external document management software.
 * Update these values based on your deployment environment.
 */

export const DOC_UPLOADER_CONFIG = {
  // Main URL of the external doc uploader application
  // Example: 'https://docs.yourdomain.com' or 'http://localhost:3001'
  APP_URL: process.env.REACT_APP_DOC_UPLOADER_URL || 'http://localhost:3001',

  // API endpoint for fetching document activity
  // The page will append query parameters like ?limit=10
  API_ENDPOINT: process.env.REACT_APP_DOC_API_URL || 'http://localhost:3001/api',

  // Refresh interval for syncing latest updates (in milliseconds)
  SYNC_INTERVAL: 30000, // 30 seconds

  // Maximum number of recent activities to display
  MAX_ACTIVITIES: 10,

  // Authentication headers configuration
  AUTH_HEADERS: {
    'Content-Type': 'application/json',
    // Token will be added dynamically from localStorage
  },

  // API endpoints structure
  ENDPOINTS: {
    // Fetch recent document activities
    // GET /api/documents/activity?limit=10
    ACTIVITY: '/documents/activity',

    // Fetch document statistics
    // GET /api/documents/stats
    STATS: '/documents/stats',

    // Upload document
    // POST /api/documents/upload
    UPLOAD: '/documents/upload',

    // Download document
    // GET /api/documents/:id/download
    DOWNLOAD: '/documents/:id/download',

    // Get document details
    // GET /api/documents/:id
    DOCUMENT: '/documents/:id',

    // List all documents
    // GET /api/documents?page=1&limit=20
    LIST: '/documents',
  },

  // Query parameters to send with API requests
  DEFAULT_PARAMS: {
    limit: 10,
    sort: 'timestamp',
    order: 'desc',
  },

  // Redirect parameters when opening external app
  REDIRECT_PARAMS: {
    // These will be automatically added:
    // - email: user's email
    // - token: JWT token from localStorage
    // - returnUrl: optional return URL after operation
  },
}

/**
 * Helper function to build API URL
 */
export const buildApiUrl = (endpoint: string, params?: Record<string, any>) => {
  const url = new URL(`${DOC_UPLOADER_CONFIG.API_ENDPOINT}${endpoint}`)
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })
  }
  
  return url.toString()
}

/**
 * Helper function to build redirect URL to external app
 */
export const buildRedirectUrl = (email: string, token: string, returnUrl?: string) => {
  const url = new URL(DOC_UPLOADER_CONFIG.APP_URL)
  url.searchParams.append('email', email)
  url.searchParams.append('token', token)
  
  if (returnUrl) {
    url.searchParams.append('returnUrl', returnUrl)
  }
  
  return url.toString()
}

/**
 * Helper function to get auth headers
 */
export const getAuthHeaders = (token: string) => {
  return {
    ...DOC_UPLOADER_CONFIG.AUTH_HEADERS,
    'Authorization': `Bearer ${token}`,
  }
}
