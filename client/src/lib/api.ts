import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const api = axios.create({ baseURL })

// Token helpers (persist across refresh)
const TOKEN_KEY = 'hirehero_token'
export function getToken() { return localStorage.getItem(TOKEN_KEY) }
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

// Offline store (in-memory per tab)
let OFFLINE_USER: any = null
let OFFLINE_WALLET_CENTS = 0
let OFFLINE_JOBS: any[] = []
let OFFLINE_TX: any[] = []

function ok(config: any, data: any, status = 200) {
  return Promise.resolve({ data, status, statusText: 'OK', headers: {}, config })
}

function pathOf(url?: string) {
  if (!url) return ''
  try {
    if (url.startsWith('http')) return new URL(url).pathname
    return url
  } catch {
    return url
  }
}

async function offlineHandler(err: any) {
  const cfg = err.config || {}
  const method = (cfg.method || 'get').toLowerCase()
  const path = pathOf(cfg.url)

  // Auth
  if (method === 'post' && path === '/api/auth/login') {
    const body = typeof cfg.data === 'string' ? JSON.parse(cfg.data) : (cfg.data || {})
    const email = body.email || 'user@example.com'
    const role = email.includes('admin') ? 'admin' : 'client'
    OFFLINE_USER = { id: 1, email, name: role === 'admin' ? 'Admin' : 'Client', role, balance: OFFLINE_WALLET_CENTS }
    setToken('offline-token')
    return ok(cfg, { token: 'offline-token', user: OFFLINE_USER })
  }

  if (method === 'get' && path === '/api/auth/me') {
    if (!OFFLINE_USER)
      return Promise.reject({ response: { status: 401, data: { error: 'Unauthorized' } } })
    return ok(cfg, OFFLINE_USER)
  }

  // Wallet
  if (method === 'get' && path === '/api/wallet') {
    return ok(cfg, {
      id: 1,
      user_id: 1,
      balance_cents: OFFLINE_WALLET_CENTS,
      updated_at: new Date().toISOString(),
      balance_dollars: (OFFLINE_WALLET_CENTS / 100).toFixed(2),
      is_low_balance: OFFLINE_WALLET_CENTS < 1000
    })
  }

  if (method === 'get' && path.startsWith('/api/wallet/transactions')) {
    return ok(cfg, { transactions: OFFLINE_TX })
  }

  // Analytics
  if (method === 'get' && path === '/api/analytics/client') {
    return ok(cfg, {
      my_jobs_count: OFFLINE_JOBS.length,
      my_candidates_count: 0,
      candidates_by_status: []
    })
  }

  if (method === 'get' && path === '/api/analytics/admin') {
    return ok(cfg, {
      total_clients: 1,
      total_revenue_cents: 0,
      total_candidates: 0,
      total_jobs: OFFLINE_JOBS.length
    })
  }

  // Jobs
  if (method === 'get' && path === '/api/jobs') {
    return ok(cfg, { jobs: OFFLINE_JOBS })
  }

  if (method === 'post' && path === '/api/jobs') {
    const body = typeof cfg.data === 'string' ? JSON.parse(cfg.data) : (cfg.data || {})
    const job = {
      id: Date.now(),
      user_id: 1,
      title: body.title || '',
      description: body.description || '',
      department: body.department || 'Other',
      status: body.status || 'open',
      starred: 0,
      archived: 0,
      requirements: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    OFFLINE_JOBS.unshift(job)
    return ok(cfg, { success: true, job }, 201)
  }

  if (method === 'put' && path.startsWith('/api/jobs/')) {
    const id = parseInt(path.split('/').pop() || '0', 10)
    const idx = OFFLINE_JOBS.findIndex(j => j.id === id)
    if (idx >= 0) {
      const body = typeof cfg.data === 'string' ? JSON.parse(cfg.data) : (cfg.data || {})
      OFFLINE_JOBS[idx] = { ...OFFLINE_JOBS[idx], ...body, updated_at: new Date().toISOString() }
      return ok(cfg, { success: true, job: OFFLINE_JOBS[idx] })
    }
  }

  if (method === 'delete' && path.startsWith('/api/jobs/')) {
    const id = parseInt(path.split('/').pop() || '0', 10)
    OFFLINE_JOBS = OFFLINE_JOBS.filter(j => j.id !== id)
    return ok(cfg, { success: true })
  }

  if (method === 'post' && path.endsWith('/archive')) {
    const id = parseInt(path.split('/')[3] || '0', 10)
    const idx = OFFLINE_JOBS.findIndex(j => j.id === id)
    if (idx >= 0) {
      OFFLINE_JOBS[idx].status = 'archived'
      OFFLINE_JOBS[idx].updated_at = new Date().toISOString()
      return ok(cfg, { success: true })
    }
  }

  if (method === 'post' && path === '/api/jobs/upload') {
    // Simulate PDF upload and job creation
    const job = {
      id: Date.now(),
      user_id: 1,
      title: 'Job from PDF',
      description: 'This job was created from a PDF upload (offline mode)',
      department: 'Other',
      status: 'open',
      starred: 0,
      archived: 0,
      requirements: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    OFFLINE_JOBS.unshift(job)
    return ok(cfg, { success: true, job, text: 'Extracted PDF text (offline mode)' })
  }

  // Fallback
  return Promise.reject(err)
}

// Attach interceptors
api.interceptors.request.use((cfg) => {
  const token = getToken()
  if (token) {
    cfg.headers = cfg.headers || {}
    cfg.headers.Authorization = `Bearer ${token}`
  }
  return cfg
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Handle network errors and offline mode
    if (!err.response && !navigator.onLine) {
      console.warn('App is offline, using offline handler')
      return offlineHandler(err)
    }
    
    // Handle server errors
    if (err.response?.status === 500) {
      console.error('Server error:', err.response.data)
    }
    
    // Handle auth errors
    if (err.response?.status === 401) {
      const message = err.response?.data?.message || '';
      const code = err.response?.data?.code || '';
      
      // Session invalidated (too many devices)
      if (code === 'SESSION_INVALIDATED' || message.includes('too many sessions')) {
        console.warn('Session invalidated due to concurrent login limit')
        setToken(null)
        if (window.location.pathname !== '/login') {
          // Show toast/alert before redirect
          alert('You have been logged out because your account is being used on too many devices.');
          window.location.href = '/login'
        }
        return Promise.reject(err);
      }
      
      // Regular auth failure
      console.warn('Authentication failed, clearing token')
      setToken(null)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    
    // Handle IP restriction errors
    if (err.response?.status === 403) {
      const message = err.response?.data?.message || '';
      
      if (message.includes('company network')) {
        console.warn('Access denied: IP not in allowlist')
        // Redirect to access denied page
        if (window.location.pathname !== '/access-denied') {
          window.location.href = '/access-denied'
        }
        return Promise.reject(err);
      }
    }
    
    return Promise.reject(err)
  }
)

export default api
