import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import AnimatedCard from '../components/ui/AnimatedCard'
import AnimatedButton from '../components/ui/AnimatedButton'

export default function EmailHistoryPage() {
  const [page, setPage] = useState(1)
  const limit = 20
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['email-history', page],
    queryFn: async () => {
      const response = await api.get(`/api/email/history?page=${page}&limit=${limit}`)
      return response.data
    },
  })



  if (isLoading) return (
    <div className="p-6">
      <div className="card p-6 inline-flex items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent"/> 
        Loading email history...
      </div>
    </div>
  )

  const totalEmails = data?.emails?.length || 0
  const selectionEmails = data?.emails?.filter((e: any) => e.email_type === 'selection').length || 0
  const rejectionEmails = data?.emails?.filter((e: any) => e.email_type === 'rejection').length || 0

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.h1 
        className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        📧 Email History
      </motion.h1>

      {/* Email Stats */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {[
          { label: 'Total Emails', count: totalEmails, icon: '📧', color: 'from-blue-600 to-cyan-600', bgColor: 'bg-blue-500/10' },
          { label: 'Selection Emails', count: selectionEmails, icon: '✅', color: 'from-green-600 to-emerald-600', bgColor: 'bg-green-500/10' },
          { label: 'Rejection Emails', count: rejectionEmails, icon: '❌', color: 'from-red-600 to-pink-600', bgColor: 'bg-red-500/10' }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            whileHover={{ y: -5, scale: 1.02 }}
          >
            <AnimatedCard className={`p-4 relative overflow-hidden border-0 ${stat.bgColor} backdrop-blur-sm`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center text-xl shadow-lg`}>
                  {stat.icon}
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stat.count}</div>
                  <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
                </div>
              </div>
              <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-r ${stat.color} opacity-10 rounded-bl-full`} />
            </AnimatedCard>
          </motion.div>
        ))}
      </motion.div>

      {error && (
        <AnimatedCard className="p-6 border-red-700 bg-red-900/20">
          <div className="text-red-400">
            ⚠️ Error loading email history: {error.message}
          </div>
        </AnimatedCard>
      )}



      <AnimatedCard className="overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-800/40 backdrop-blur-sm">
              <tr>
                <th className="text-left p-4 font-medium text-slate-300 text-sm">👤 Recipient</th>
                <th className="text-left p-4 font-medium text-slate-300 text-sm">📝 Email Type</th>
                <th className="text-left p-4 font-medium text-slate-300 text-sm">💼 Job</th>
                <th className="text-left p-4 font-medium text-slate-300 text-sm">📅 Sent</th>
                <th className="text-left p-4 font-medium text-slate-300 text-sm">📧 Email</th>
              </tr>
            </thead>
            <tbody>
              {data?.emails?.map((email: any, index: number) => (
                <motion.tr 
                  key={email.id} 
                  className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-600 flex items-center justify-center text-white text-sm font-bold">
                        {email.candidate_name?.charAt(0)?.toUpperCase() || email.recipient_email?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-white font-medium">{email.candidate_name || 'Unknown'}</div>
                        <div className="text-slate-400 text-sm">{email.recipient_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        email.email_type === 'selection' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : email.email_type === 'rejection'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {email.email_type === 'selection' ? '✅ Selection' : email.email_type === 'rejection' ? '❌ Rejection' : '📧 Custom'}
                      </span>
                    </div>
                    {email.meet_link && (
                      <a 
                        href={email.meet_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 mt-1"
                      >
                        🔗 Meeting Link
                      </a>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="text-slate-300 font-medium">{email.job_title || 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-slate-300">
                      {new Date(email.sent_at).toLocaleDateString()}
                    </div>
                    <div className="text-slate-500 text-sm">
                      {new Date(email.sent_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-slate-400 text-sm">{email.candidate_email}</div>
                  </td>
                </motion.tr>
              ))}
              {data?.emails?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-400">
                    <motion.div 
                      className="text-6xl mb-6"
                      animate={{ 
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                    >
                      📧
                    </motion.div>
                    <div className="text-xl text-cyan-300">No emails sent yet</div>
                    <div className="text-sm mt-2">Email history will appear here once you start sending emails to candidates</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </AnimatedCard>

      {/* Pagination */}
      {data?.pagination && data.pagination.pages > 1 && (
        <AnimatedCard className="p-4">
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-slate-300">
              Page {page} of {data.pagination.pages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
              disabled={page === data.pagination.pages}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors"
            >
              Next
            </button>
          </div>
        </AnimatedCard>
      )}
    </motion.div>
  )
}