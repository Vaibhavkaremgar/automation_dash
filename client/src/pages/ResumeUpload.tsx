import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useJobSelection } from '../context/JobSelectionContext'
import AnimatedCard from '../components/ui/AnimatedCard'
import AnimatedButton from '../components/ui/AnimatedButton'

export default function ResumeUploadPage() {
  const navigate = useNavigate()
  const { selectedJob, clearSelection } = useJobSelection()
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      const droppedFile = files[0]
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile)
        setError(null)
      } else {
        setError('Please upload a PDF file only')
      }
    }
  }, [])

  async function onUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Please select a resume file')
      return
    }
    if (!selectedJob) {
      setError('Please select a job first')
      return
    }
    
    setMessage(null)
    setError(null)
    setLoading(true)
    setUploadProgress(0)
    
    try {
      const fd = new FormData()
      fd.append('resume', file)
      fd.append('jobId', selectedJob.id.toString())
      fd.append('jobTitle', selectedJob.title)
      fd.append('jobDescription', selectedJob.description || '')
      fd.append('jobStatus', selectedJob.status)
      // Add department info to description if available
      if (selectedJob.department) {
        const fullDescription = `Department: ${selectedJob.department}\n\n${selectedJob.description || ''}`
        fd.set('jobDescription', fullDescription)
      }
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 15
        })
      }, 200)
      
      const res = await api.post('/api/resumes/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      setMessage(`Resume uploaded successfully for ${selectedJob.title}! Processing candidate data...`)
      setFile(null)
      
      // Clear selection and redirect after successful upload
      setTimeout(() => {
        clearSelection()
        navigate('/candidates')
      }, 3000)
    } catch (err: any) {
      console.error('Upload error:', err)
      let errorMessage = 'Upload failed'
      
      if (err.response?.status === 404) {
        errorMessage = 'Upload endpoint not found. Please check server configuration.'
      } else if (err.response?.status === 504) {
        errorMessage = 'n8n webhook timeout. Please check N8N_WEBHOOK_URL configuration.'
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      setUploadProgress(0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="text-center mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center"
          animate={{ 
            boxShadow: [
              "0 0 25px rgba(6, 182, 212, 0.4)",
              "0 0 40px rgba(59, 130, 246, 0.5)",
              "0 0 25px rgba(6, 182, 212, 0.4)"
            ],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <span className="text-3xl">📄</span>
        </motion.div>
        <motion.h1 
          className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 mb-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Resume Upload
        </motion.h1>
        <motion.p 
          className="text-slate-400"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Upload your resume for AI-powered analysis and job matching
        </motion.p>
      </motion.div>

      {/* Job Selection Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <AnimatePresence mode="wait">
          {selectedJob ? (
            <motion.div
              key="job-selected"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <AnimatedCard className="p-6 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5" />
                <div className="relative flex items-center gap-4">
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg"
                    animate={{ 
                      boxShadow: [
                        "0 0 20px rgba(34, 197, 94, 0.3)",
                        "0 0 30px rgba(16, 185, 129, 0.4)",
                        "0 0 20px rgba(34, 197, 94, 0.3)"
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-xl">🎯</span>
                  </motion.div>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-green-300 mb-1">{selectedJob.title}</div>
                    <div className="text-sm text-green-400 flex items-center gap-2">
                      {selectedJob.department && (
                        <span className="px-2 py-1 bg-green-500/20 rounded-full text-xs">
                          {selectedJob.department}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-green-500/20 rounded-full text-xs capitalize">
                        {selectedJob.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => navigate('/jobs')}
                      className="text-green-400 hover:text-green-300 transition-colors px-3 py-1 rounded-lg bg-green-500/10 text-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Change Job
                    </motion.button>
                    <motion.button
                      onClick={clearSelection}
                      className="text-green-400 hover:text-green-300 transition-colors p-1"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      ✕
                    </motion.button>
                  </div>
                </div>
              </AnimatedCard>
            </motion.div>
          ) : (
            <motion.div
              key="no-job"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <AnimatedCard className="p-6 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-yellow-500/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/5 to-orange-600/5" />
                <div className="relative flex items-center gap-4">
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center"
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-xl">⚠️</span>
                  </motion.div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-yellow-300 mb-1">No Job Selected</div>
                    <div className="text-yellow-400 text-sm">Please select a job position to upload resume for</div>
                  </div>
                  <AnimatedButton
                    onClick={() => navigate('/jobs')}
                    className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500"
                  >
                    Select Job
                  </AnimatedButton>
                </div>
              </AnimatedCard>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <AnimatedCard className="p-6">
          <form onSubmit={onUpload}>
            <motion.div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive 
                  ? 'border-cyan-400 bg-cyan-500/10' 
                  : file 
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-slate-600 bg-slate-800/30 hover:border-slate-500 hover:bg-slate-800/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              whileHover={{ scale: 1.02 }}
              animate={{
                borderColor: dragActive ? '#06b6d4' : file ? '#10b981' : '#475569'
              }}
            >
              <input
                type="file"
                accept="application/pdf"
                onChange={e => {
                  const selectedFile = e.target.files?.[0]
                  if (selectedFile) {
                    if (selectedFile.type === 'application/pdf') {
                      setFile(selectedFile)
                      setError(null)
                    } else {
                      setError('Please upload a PDF file only')
                    }
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div
                    key="file-selected"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-3"
                  >
                    <motion.div
                      className="w-16 h-16 mx-auto bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="text-2xl">📄</span>
                    </motion.div>
                    <div className="text-green-300 font-semibold">{file.name}</div>
                    <div className="text-green-400 text-sm">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document
                    </div>
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        setFile(null)
                      }}
                      className="text-green-400 hover:text-green-300 text-sm underline"
                      whileHover={{ scale: 1.05 }}
                    >
                      Choose different file
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="no-file"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    <motion.div
                      className="w-16 h-16 mx-auto bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-2xl flex items-center justify-center"
                      animate={{ 
                        y: [0, -10, 0],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ duration: 3, repeat: Infinity }}
                    >
                      <span className="text-2xl">📁</span>
                    </motion.div>
                    <div className="space-y-2">
                      <div className="text-slate-300 font-semibold text-lg">
                        {dragActive ? 'Drop your resume here' : 'Drag & drop your resume'}
                      </div>
                      <div className="text-slate-400">
                        or <span className="text-cyan-400 font-medium">click to browse</span>
                      </div>
                      <div className="text-slate-500 text-sm">PDF files only • Max 10MB</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </form>
        </AnimatedCard>
      </motion.div>

      {/* Upload Button & Status */}
      <motion.div
        className="space-y-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {/* Status Messages */}
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/40 rounded-xl text-green-300 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <motion.span 
                  className="text-xl"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ✨
                </motion.span>
                <div>{message}</div>
              </div>
            </motion.div>
          )}
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-4 bg-gradient-to-r from-red-900/30 to-rose-900/30 border border-red-500/40 rounded-xl text-red-300 backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">🚨</span>
                <div>{error}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Progress */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Uploading...</span>
                <span className="text-cyan-400">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Button */}
        <AnimatedButton
          onClick={onUpload}
          disabled={!file || !selectedJob || loading}
          className="w-full py-4 text-lg font-semibold"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-3">
              <motion.div 
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              Processing Resume...
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>🚀</span>
              Upload & Analyze Resume
            </div>
          )}
        </AnimatedButton>
      </motion.div>
      {/* Features Info */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {[
          { icon: '🤖', title: 'AI Analysis', desc: 'Advanced resume parsing and skill extraction' },
          { icon: '🎯', title: 'Job Matching', desc: 'Intelligent matching against job requirements' },
          { icon: '📊', title: 'Instant Results', desc: 'Real-time candidate scoring and insights' }
        ].map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + index * 0.1 }}
          >
            <AnimatedCard className="p-4 text-center bg-slate-800/30 border-slate-700/50">
              <motion.div
                className="text-2xl mb-2"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  delay: index * 0.5
                }}
              >
                {feature.icon}
              </motion.div>
              <div className="font-semibold text-slate-300 mb-1">{feature.title}</div>
              <div className="text-xs text-slate-500">{feature.desc}</div>
            </AnimatedCard>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
