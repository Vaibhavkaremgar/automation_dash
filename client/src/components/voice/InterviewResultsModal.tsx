import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import AnimatedCard from '../ui/AnimatedCard'
import AnimatedButton from '../ui/AnimatedButton'

interface InterviewResultsModalProps {
  isOpen: boolean
  onClose: () => void
  candidate: {
    id: number
    name: string
    email: string
  }
}

export default function InterviewResultsModal({ 
  isOpen, 
  onClose, 
  candidate 
}: InterviewResultsModalProps) {
  const [callId, setCallId] = useState('')

  // Get interview history for this candidate
  const { data: interviews } = useQuery({
    queryKey: ['voice-interviews'],
    queryFn: async () => {
      const response = await api.get('/api/voice/interviews')
      return response.data.data || []
    },
    enabled: isOpen
  })

  const candidateInterviews = interviews?.filter((interview: any) => 
    interview.candidateName === candidate.name
  ) || []

  const handleSyncInterview = async () => {
    if (!callId.trim()) return
    
    try {
      await api.post('/api/voice/sync-interview', {
        candidateId: candidate.id,
        jobId: 1, // Default job ID
        callId: callId.trim()
      })
      
      // Refresh interviews list
      // queryClient.invalidateQueries(['voice-interviews'])
      setCallId('')
      alert('Interview data synced successfully!')
    } catch (error) {
      console.error('Failed to sync interview:', error)
      alert('Failed to sync interview data')
    }
  }

  if (!isOpen) return null

  return (
    <motion.div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className="w-full max-w-2xl mx-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <AnimatedCard className="p-6 bg-slate-800 border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              >
                <span className="text-xl">📊</span>
              </motion.div>
              <div>
                <h3 className="text-xl font-semibold text-white">Interview Results</h3>
                <p className="text-slate-400 text-sm">{candidate.name}</p>
              </div>
            </div>
            <motion.button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ✕
            </motion.button>
          </div>

          {/* Sync New Interview */}
          <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
            <h4 className="text-white font-medium mb-3">Sync Interview Data</h4>
            <div className="flex gap-3">
              <input
                type="text"
                value={callId}
                onChange={(e) => setCallId(e.target.value)}
                placeholder="Enter Call ID from workflow"
                className="flex-1 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
              />
              <AnimatedButton
                onClick={handleSyncInterview}
                disabled={!callId.trim()}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
              >
                🔄 Sync
              </AnimatedButton>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Get the Call ID from your workflow system and paste it here to sync interview results
            </div>
          </div>

          {/* Interview History */}
          <div className="space-y-4">
            <h4 className="text-white font-medium">Interview History</h4>
            
            {candidateInterviews.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-4xl mb-3">🎤</div>
                <div className="text-lg">No interviews found</div>
                <div className="text-sm">Sync interview data using the Call ID above</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {candidateInterviews.map((interview: any, index: number) => (
                  <motion.div
                    key={interview.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="text-white font-medium">{interview.jobTitle}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(interview.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <motion.span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          interview.recommendation === 'hire' ? 'bg-green-500/20 text-green-400' :
                          interview.recommendation === 'shortlist' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        {interview.recommendation?.toUpperCase() || 'PENDING'}
                      </motion.span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-slate-400">Duration</div>
                        <div className="text-white">
                          {Math.floor(interview.duration / 60)}:{(interview.duration % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400">Score</div>
                        <div className="text-white">{interview.score}/100</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Cost</div>
                        <div className="text-cyan-400">₹{interview.cost.toFixed(2)}</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700/30">
            <AnimatedButton 
              onClick={onClose}
              className="w-full bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400"
            >
              Close
            </AnimatedButton>
          </div>
        </AnimatedCard>
      </motion.div>
    </motion.div>
  )
}