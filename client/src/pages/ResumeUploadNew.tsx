import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { api } from '../lib/api'
import AnimatedCard from '../components/ui/AnimatedCard'
import AnimatedButton from '../components/ui/AnimatedButton'
import toast from 'react-hot-toast'

interface Job {
  id: number
  title: string
  department: string
  description: string
  status: string
  requirements?: string
}

export default function ResumeUploadPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  
  const [selectedJobId, setSelectedJobId] = useState('')
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [candidatePhone, setCandidatePhone] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedZip, setUploadedZip] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadMode, setUploadMode] = useState<'single' | 'bulk'>('single')

  // Fetch jobs from database (faster than Google Sheets)
  const { data: activeJobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/jobs')
        return (response.data.jobs as Job[]).filter(job => job.status === 'open')
      } catch (err) {
        console.error('Failed to fetch jobs:', err)
        return []
      }
    },
  })

  const selectedJob = activeJobs.find(job => job.id === Number(selectedJobId))

  // Parse resume to extract candidate details
  const parseResume = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('resume', file)
      
      const response = await api.post('/api/resume-parser/parse', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      if (response.data.success) {
        const { candidateInfo } = response.data
        if (candidateInfo.name) setCandidateName(candidateInfo.name)
        if (candidateInfo.email) setCandidateEmail(candidateInfo.email)
        if (candidateInfo.phone) setCandidatePhone(candidateInfo.phone)
      }
    } catch (error) {
      console.error('Error parsing resume:', error)
      // Fallback to filename extraction
      const nameFromFile = file.name.replace(/\.(pdf|doc|docx)$/i, '').replace(/[_-]/g, ' ')
      if (!candidateName && nameFromFile.length > 3) {
        setCandidateName(nameFromFile)
      }
    }
  }

  // File upload with dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setUploadedFile(file)
      // Parse resume to auto-fill details
      parseResume(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  })

  // Bulk ZIP upload
  const onDropZip = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setUploadedZip(file)
    }
  }, [])

  const { getRootProps: getZipRootProps, getInputProps: getZipInputProps, isDragActive: isZipDragActive } = useDropzone({
    onDrop: onDropZip,
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip']
    },
    maxFiles: 1
  })

  // Submit bulk ZIP
  const submitBulkUpload = useMutation({
    mutationFn: async () => {
      if (!selectedJob || !uploadedZip) {
        throw new Error('Please select a job and upload a ZIP file')
      }

      setIsProcessing(true)
      
      const formData = new FormData()
      formData.append('zipFile', uploadedZip)
      formData.append('userId', '9')

      const response = await api.post('/api/resumes/upload-bulk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      })
      
      return response.data
    },
    onSuccess: () => {
      setIsProcessing(false)
      toast.success('✅ Bulk upload successful!')
      
      setSelectedJobId('')
      setUploadedZip(null)
      
      qc.invalidateQueries({ queryKey: ['candidates'] })
      qc.invalidateQueries({ queryKey: ['analytics-client'] })
      
      setTimeout(() => navigate('/candidates'), 1500)
    },
    onError: (error: any) => {
      setIsProcessing(false)
      const errorMsg = error?.response?.data?.error || error?.message || 'Bulk upload failed'
      toast.error(`❌ ${errorMsg}`)
      console.error('Bulk upload failed:', error)
    }
  })

  // Submit application
  const submitApplication = useMutation({
    mutationFn: async () => {
      if (!selectedJob || !uploadedFile) {
        throw new Error('Please select a job and upload a resume')
      }

      setIsProcessing(true)
      
      const formData = new FormData()
      formData.set('resume', uploadedFile)
      formData.set('jobId', selectedJob.id.toString())
      formData.set('jobTitle', selectedJob.title)
      formData.set('jobDescription', selectedJob.description)
      formData.set('candidateName', candidateName)
      formData.set('candidateEmail', candidateEmail)
      formData.set('candidatePhone', candidatePhone)
      formData.set('userId', 'manual-upload')

      // Log to Google Sheets only if candidate details are provided
      if (candidateName && candidateEmail) {
        try {
          await api.post('/api/applications/create', {
            jobTitle: selectedJob.title,
            candidateName,
            email: candidateEmail,
            phone: candidatePhone,
            resumeFilename: uploadedFile.name,
            status: 'applied',
            notes: 'Manual upload from dashboard'
          })
        } catch (error) {
          console.error('Error logging to Google Sheets:', error)
        }
      }

      // Then send to n8n workflow
      const response = await api.post('/api/resumes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      return response.data
    },
    onSuccess: (data) => {
      setIsProcessing(false)
      
      if (data.warning) {
        toast.success(`✅ Resume uploaded! ${data.warning}`, { duration: 5000 })
      } else {
        toast.success('✅ Application submitted successfully! Resume sent to n8n for processing.')
      }
      
      // Reset form
      setSelectedJobId('')
      setCandidateName('')
      setCandidateEmail('')
      setCandidatePhone('')
      setUploadedFile(null)
      
      // Invalidate queries
      qc.invalidateQueries({ queryKey: ['candidates'] })
      qc.invalidateQueries({ queryKey: ['analytics-client'] })
      
      // Navigate to candidates page after delay
      setTimeout(() => navigate('/candidates'), 1500)
    },
    onError: (error: any) => {
      setIsProcessing(false)
      const errorMsg = error?.response?.data?.error || error?.message || 'Upload failed'
      toast.error(`❌ ${errorMsg}`)
      console.error('Upload failed:', error)
    }
  })

  return (
    <motion.div 
      className="max-w-2xl mx-auto space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h1 
        className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        📄 Upload Candidate Resume
      </motion.h1>

      <AnimatedCard className="p-8">
        <div className="space-y-6">
          {/* Job Selection */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Job Position *
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm text-white"
            >
              <option value="">Choose a job position...</option>
              {activeJobs.map((job) => (
                <option key={job.id} value={String(job.id)}>
                  {job.title} - {job.department}
                </option>
              ))}
            </select>
            {selectedJob && (
              <motion.div 
                className="mt-2 p-3 bg-slate-800/50 rounded-lg text-sm text-slate-400"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ delay: 0.2 }}
              >
                <div><strong>Department:</strong> {selectedJob.department}</div>
                <div><strong>Requirements:</strong> {selectedJob.requirements || 'Not specified'}</div>
              </motion.div>
            )}
          </motion.div>

          {/* Upload Mode Toggle */}
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex gap-2"
          >
            <button
              onClick={() => { setUploadMode('single'); setUploadedZip(null); }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                uploadMode === 'single'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              📄 Single Resume
            </button>
            <button
              onClick={() => { setUploadMode('bulk'); setUploadedFile(null); setCandidateName(''); setCandidateEmail(''); setCandidatePhone(''); }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                uploadMode === 'bulk'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              📦 Bulk Upload (ZIP)
            </button>
          </motion.div>

          {/* File Upload */}
          {uploadMode === 'single' && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Upload Resume * (PDF, DOC, DOCX)
            </label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isDragActive 
                  ? 'border-cyan-400 bg-cyan-400/10' 
                  : uploadedFile
                  ? 'border-green-400 bg-green-400/10'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <input {...getInputProps()} />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {uploadedFile ? (
                  <div className="text-green-400">
                    <div className="text-2xl mb-2">✅</div>
                    <div className="font-medium">{uploadedFile.name}</div>
                    <div className="text-sm text-slate-400 mt-1">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400">
                    <div className="text-3xl mb-2">📎</div>
                    <div className="font-medium">
                      {isDragActive ? 'Drop the file here...' : 'Click or drag file here'}
                    </div>
                    <div className="text-sm mt-1">PDF, DOC, DOCX up to 10MB</div>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
          )}

          {/* Bulk ZIP Upload */}
          {uploadMode === 'bulk' && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Upload ZIP File * (containing multiple resumes)
            </label>
            <div
              {...getZipRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isZipDragActive 
                  ? 'border-cyan-400 bg-cyan-400/10' 
                  : uploadedZip
                  ? 'border-green-400 bg-green-400/10'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <input {...getZipInputProps()} />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {uploadedZip ? (
                  <div className="text-green-400">
                    <div className="text-2xl mb-2">✅</div>
                    <div className="font-medium">{uploadedZip.name}</div>
                    <div className="text-sm text-slate-400 mt-1">
                      {(uploadedZip.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400">
                    <div className="text-3xl mb-2">📦</div>
                    <div className="font-medium">
                      {isZipDragActive ? 'Drop the ZIP file here...' : 'Click or drag ZIP file here'}
                    </div>
                    <div className="text-sm mt-1">ZIP file containing PDF/DOC/DOCX resumes</div>
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
          )}

          {/* Candidate Details */}
          <AnimatePresence>
            {uploadMode === 'single' && uploadedFile && (
              <motion.div
                className="space-y-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700/50"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="text-sm font-medium text-slate-300 mb-3">
                  ✨ Auto-filled from resume content
                </div>
                
                <motion.div
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <label className="block text-sm text-slate-400 mb-1">Candidate Name</label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Enter candidate name"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm text-white"
                  />
                </motion.div>

                <motion.div
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <label className="block text-sm text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm text-white"
                  />
                </motion.div>

                <motion.div
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <label className="block text-sm text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={candidatePhone}
                    onChange={(e) => setCandidatePhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm text-white"
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <motion.div 
            className="flex gap-4 pt-4"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <AnimatedButton
              onClick={() => navigate('/jobs')}
              className="flex-1 bg-slate-600 hover:bg-slate-500"
            >
              ← Back
            </AnimatedButton>
            {uploadMode === 'single' ? (
              <AnimatedButton
                onClick={() => submitApplication.mutate()}
                disabled={!selectedJobId || !uploadedFile || isProcessing}
                className="flex-1"
              >
                {isProcessing ? '⚡ Processing...' : '🚀 Process Application'}
              </AnimatedButton>
            ) : (
              <AnimatedButton
                onClick={() => submitBulkUpload.mutate()}
                disabled={!selectedJobId || !uploadedZip || isProcessing}
                className="flex-1"
              >
                {isProcessing ? '⚡ Processing...' : '📦 Process Bulk Upload'}
              </AnimatedButton>
            )}
          </motion.div>

          {/* Processing Status */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                className="text-center p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="text-blue-400 font-medium">
                  🔄 Processing application...
                </div>
                <div className="text-sm text-blue-300 mt-1">
                  Analyzing resume and matching with job requirements
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AnimatedCard>
    </motion.div>
  )
}