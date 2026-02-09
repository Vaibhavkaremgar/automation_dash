import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { FileText, ExternalLink, Download, Upload, Clock, AlertCircle } from 'lucide-react'

interface DocActivity {
  id: string
  fileName: string
  type: 'upload' | 'download'
  timestamp: string
  status: 'completed' | 'processing' | 'failed'
  fileSize?: string
  uploadedBy?: string
}

interface DocStats {
  totalUploads: number
  totalDownloads: number
  processingQueue: number
  lastSync: string
}

export default function DocUploader() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<DocActivity[]>([])
  const [stats, setStats] = useState<DocStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // External doc uploader software URL - configure this
  const DOC_UPLOADER_URL = process.env.REACT_APP_DOC_UPLOADER_URL || 'http://localhost:3001'
  const DOC_API_URL = process.env.REACT_APP_DOC_API_URL || 'http://localhost:3001/api'

  useEffect(() => {
    fetchDocActivity()
    const interval = setInterval(fetchDocActivity, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchDocActivity = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      // Fetch recent activities from external doc uploader API
      const response = await fetch(`${DOC_API_URL}/documents/activity?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Client-Email': user?.email || '',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch document activity')
      }

      const data = await response.json()
      setActivities(data.activities || [])
      setStats(data.stats || null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document activity')
      console.error('Error fetching doc activity:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRedirectToDocUploader = () => {
    const clientEmail = user?.email || ''
    const token = localStorage.getItem('token')
    
    // Redirect to external doc uploader with auth token
    const redirectUrl = `${DOC_UPLOADER_URL}?email=${encodeURIComponent(clientEmail)}&token=${token}`
    window.open(redirectUrl, '_blank')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400'
      case 'processing':
        return 'text-yellow-400'
      case 'failed':
        return 'text-red-400'
      default:
        return 'text-slate-400'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10'
      case 'processing':
        return 'bg-yellow-500/10'
      case 'failed':
        return 'bg-red-500/10'
      default:
        return 'bg-slate-500/10'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-indigo-400" />
              <h1 className="text-3xl font-bold text-white">Document Management</h1>
            </div>
            <button
              onClick={handleRedirectToDocUploader}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Doc Uploader
            </button>
          </div>
          <p className="text-slate-400">Manage and track your document uploads and downloads</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Uploads</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.totalUploads}</p>
                </div>
                <Upload className="w-8 h-8 text-blue-400 opacity-50" />
              </div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Downloads</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.totalDownloads}</p>
                </div>
                <Download className="w-8 h-8 text-green-400 opacity-50" />
              </div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Processing Queue</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.processingQueue}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400 opacity-50" />
              </div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div>
                <p className="text-slate-400 text-sm">Last Sync</p>
                <p className="text-sm font-mono text-indigo-300 mt-1">{new Date(stats.lastSync).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin">
                <div className="w-8 h-8 border-4 border-slate-600 border-t-indigo-400 rounded-full"></div>
              </div>
              <p className="text-slate-400 mt-3">Loading document activity...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-50" />
              <p className="text-slate-400">No document activity yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {activities.map((activity) => (
                <div key={activity.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-2 rounded-lg ${getStatusBg(activity.status)}`}>
                        {activity.type === 'upload' ? (
                          <Upload className="w-5 h-5 text-blue-400" />
                        ) : (
                          <Download className="w-5 h-5 text-green-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{activity.fileName}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                          <span className="capitalize">{activity.type}</span>
                          {activity.fileSize && <span>• {activity.fileSize}</span>}
                          {activity.uploadedBy && <span>• by {activity.uploadedBy}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium capitalize ${getStatusColor(activity.status)}`}>
                        {activity.status}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Integration Info */}
        <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
          <p className="text-indigo-300 text-sm">
            <strong>💡 Tip:</strong> Click "Open Doc Uploader" to access the full document management interface. Your recent activity will sync automatically every 30 seconds.
          </p>
        </div>
      </div>
    </div>
  )
}
