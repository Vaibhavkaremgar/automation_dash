import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVoiceInterview } from '../../hooks/useVoiceInterview'
import AnimatedCard from '../ui/AnimatedCard'
import AnimatedButton from '../ui/AnimatedButton'

interface VoiceInterviewModalProps {
  isOpen: boolean
  onClose: () => void
  candidate: {
    id: number
    name: string
    email: string
  }
  job: {
    id: number
    title: string
  }
}

export default function VoiceInterviewModal({ 
  isOpen, 
  onClose, 
  candidate, 
  job 
}: VoiceInterviewModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [step, setStep] = useState<'setup' | 'calling' | 'results'>('setup')
  
  const { 
    startInterview, 
    endInterview, 
    interviewStatus, 
    isStarting,
    isEnding 
  } = useVoiceInterview()

  const handleStartInterview = async () => {
    if (!phoneNumber.trim()) return
    
    try {
      await startInterview.mutateAsync({
        candidateId: candidate.id,
        jobId: job.id,
        phoneNumber: phoneNumber.trim()
      })
      setStep('calling')
    } catch (error) {
      console.error('Failed to start interview:', error)
    }
  }

  const handleEndInterview = async () => {
    if (!interviewStatus?.id) return
    
    try {
      await endInterview.mutateAsync(interviewStatus.id)
      setStep('results')
    } catch (error) {
      console.error('Failed to end interview:', error)
    }
  }

  const handleClose = () => {
    setStep('setup')
    setPhoneNumber('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <motion.div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <motion.div 
        className="w-full max-w-md mx-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <AnimatedCard className="p-6 bg-slate-800 border-slate-700">
          <AnimatePresence mode="wait">
            {step === 'setup' && (
              <motion.div
                key="setup"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <span className="text-xl">🎤</span>
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Start Voice Interview</h3>
                    <p className="text-slate-400 text-sm">Professional phone interview</p>
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <div className="text-sm text-slate-300 mb-2">Candidate</div>
                    <div className="font-medium text-white">{candidate.name}</div>
                    <div className="text-xs text-slate-400">{candidate.email}</div>
                  </div>
                  
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <div className="text-sm text-slate-300 mb-2">Position</div>
                    <div className="font-medium text-white">{job.title}</div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-300 mb-2">
                      Candidate Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1234567890"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all text-white"
                    />
                    <div className="text-xs text-slate-500 mt-1">
                      Include country code (e.g., +1 for US)
                    </div>
                  </div>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400">💰</span>
                    <span className="text-blue-300 font-medium">Cost Information</span>
                  </div>
                  <div className="text-sm text-blue-200">
                    Voice interviews are charged at ₹5 per minute. 
                    Typical interviews last 5-10 minutes (₹25-50).
                  </div>
                </div>

                <div className="flex gap-3">
                  <AnimatedButton
                    onClick={handleStartInterview}
                    disabled={!phoneNumber.trim() || isStarting}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                  >
                    {isStarting ? '📞 Calling...' : '🚀 Start Interview'}
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={handleClose}
                    className="flex-1 bg-slate-600 hover:bg-slate-500"
                  >
                    Cancel
                  </AnimatedButton>
                </div>
              </motion.div>
            )}

            {step === 'calling' && (
              <motion.div
                key="calling"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="text-center"
              >
                <motion.div
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    boxShadow: [
                      "0 0 20px rgba(34, 197, 94, 0.3)",
                      "0 0 40px rgba(16, 185, 129, 0.5)",
                      "0 0 20px rgba(34, 197, 94, 0.3)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <span className="text-3xl">📞</span>
                </motion.div>

                <h3 className="text-xl font-semibold text-white mb-2">Interview in Progress</h3>
                <p className="text-slate-400 mb-6">
                  Our interview specialist is now calling {candidate.name}
                </p>

                {interviewStatus && (
                  <div className="space-y-4 mb-6">
                    <div className="bg-slate-700/30 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-300">Status</span>
                        <span className="text-green-400 capitalize">{interviewStatus.status}</span>
                      </div>
                      {interviewStatus.duration > 0 && (
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-300">Duration</span>
                          <span className="text-white">{Math.floor(interviewStatus.duration / 60)}:{(interviewStatus.duration % 60).toString().padStart(2, '0')}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300">Estimated Cost</span>
                        <span className="text-cyan-400">₹{interviewStatus.cost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <AnimatedButton
                    onClick={handleEndInterview}
                    disabled={isEnding}
                    className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500"
                  >
                    {isEnding ? '⏹️ Ending...' : '⏹️ End Interview'}
                  </AnimatedButton>
                  <AnimatedButton
                    onClick={handleClose}
                    className="flex-1 bg-slate-600 hover:bg-slate-500"
                  >
                    Close
                  </AnimatedButton>
                </div>
              </motion.div>
            )}

            {step === 'results' && interviewStatus && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="text-center"
              >
                <motion.div
                  className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <span className="text-3xl">📊</span>
                </motion.div>

                <h3 className="text-xl font-semibold text-white mb-2">Interview Complete</h3>
                <p className="text-slate-400 mb-6">
                  Interview results have been processed
                </p>

                <div className="space-y-4 mb-6">
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-slate-300">Duration</div>
                        <div className="text-white font-medium">{Math.floor(interviewStatus.duration / 60)}:{(interviewStatus.duration % 60).toString().padStart(2, '0')}</div>
                      </div>
                      <div>
                        <div className="text-slate-300">Cost</div>
                        <div className="text-cyan-400 font-medium">₹{interviewStatus.cost.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-slate-300">Score</div>
                        <div className="text-white font-medium">{interviewStatus.score}/100</div>
                      </div>
                      <div>
                        <div className="text-slate-300">Recommendation</div>
                        <div className={`font-medium capitalize ${
                          interviewStatus.recommendation === 'hire' ? 'text-green-400' :
                          interviewStatus.recommendation === 'shortlist' ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {interviewStatus.recommendation}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatedButton
                  onClick={handleClose}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500"
                >
                  ✅ Done
                </AnimatedButton>
              </motion.div>
            )}
          </AnimatePresence>
        </AnimatedCard>
      </motion.div>
    </motion.div>
  )
}