import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

interface EmailModalProps {
  isOpen: boolean
  onClose: () => void
  candidateId?: number
  candidateIds?: number[]
  jobId?: number
}

export function EmailModal({ isOpen, onClose, candidateId, candidateIds, jobId }: EmailModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const queryClient = useQueryClient()

  const { data: templates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => api.get('/api/email/templates').then(res => res.data.templates)
  })

  const sendEmail = useMutation({
    mutationFn: async (data: any) => {
      if (candidateIds?.length) {
        return api.post('/api/email/bulk-send', data)
      } else {
        return api.post('/api/email/send', data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-history'] })
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      onClose()
    }
  })

  const handleSend = () => {
    if (!selectedTemplate) return

    const payload = {
      templateType: selectedTemplate,
      jobId
    }

    if (candidateIds?.length) {
      sendEmail.mutate({ ...payload, candidateIds })
    } else if (candidateId) {
      sendEmail.mutate({ ...payload, candidateId })
    }
  }

  if (!isOpen) return null

  const isBulk = (candidateIds?.length ?? 0) > 0
  const count = isBulk ? (candidateIds?.length ?? 0) : 1

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 border border-slate-700"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">📧</span>
            <div>
              <h3 className="text-xl font-semibold text-cyan-300">
                Send Email
              </h3>
              <p className="text-sm text-slate-400">
                {isBulk ? `${count} candidates selected` : 'Send to candidate'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Template
              </label>
              <select 
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm text-white"
              >
                <option value="">Select template...</option>
                {templates?.map((template: any) => (
                  <option key={template.type} value={template.type}>
                    {template.name} - {template.subject}
                  </option>
                ))}
              </select>
            </div>

            {selectedTemplate && (
              <motion.div 
                className="p-4 bg-slate-900/30 rounded-lg border border-slate-700"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <p className="text-sm text-slate-400">
                  📋 Template: <span className="text-cyan-400 capitalize">{selectedTemplate}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Personalized email will be sent to {isBulk ? 'each candidate' : 'the candidate'}
                </p>
              </motion.div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <motion.button 
              onClick={handleSend}
              disabled={!selectedTemplate || sendEmail.isPending}
              className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-600 text-white px-4 py-3 rounded-lg font-medium transition-all disabled:cursor-not-allowed"
              whileHover={{ scale: selectedTemplate ? 1.02 : 1 }}
              whileTap={{ scale: selectedTemplate ? 0.98 : 1 }}
            >
              {sendEmail.isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                `📧 Send ${isBulk ? `to ${count} candidates` : 'Email'}`
              )}
            </motion.button>
            <motion.button 
              onClick={onClose}
              className="flex-1 bg-slate-600 hover:bg-slate-500 text-white px-4 py-3 rounded-lg font-medium transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              ❌ Cancel
            </motion.button>
          </div>

          {sendEmail.error && (
            <motion.div 
              className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className="text-red-300 text-sm">
                ❌ {(sendEmail.error as any)?.response?.data?.error || 'Failed to send email'}
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}