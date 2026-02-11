import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { FileText, ExternalLink } from 'lucide-react'

export default function DocUploader() {
  const { user } = useAuth()
  const DOC_UPLOADER_URL = 'https://document-system-production-1a7e.up.railway.app/'

  const handleRedirectToDocUploader = () => {
    window.open(DOC_UPLOADER_URL, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-full mx-auto h-full">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-indigo-400" />
              <h1 className="text-3xl font-bold text-white">Document Management</h1>
            </div>
            <button
              onClick={handleRedirectToDocUploader}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Window
            </button>
          </div>
        </div>

        {/* Embedded Doc Uploader */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 150px)' }}>
          <iframe
            src={DOC_UPLOADER_URL}
            className="w-full h-full border-0"
            title="Document Uploader"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-downloads"
          />
        </div>
      </div>
    </div>
  )
}
