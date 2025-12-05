import { useState, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import AnimatedCard from '../components/ui/AnimatedCard'
import AnimatedButton from '../components/ui/AnimatedButton'
import InterviewResultsModal from '../components/voice/InterviewResultsModal'
import { EmailModal } from '../components/email/EmailModal'

export default function CandidatesPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [interviewResultsModal, setInterviewResultsModal] = useState<{ candidate: any } | null>(null)
  const [emailModal, setEmailModal] = useState<{ candidateId?: number; candidateIds?: number[] } | null>(null)
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([])

  const isAdmin = user?.role === 'admin'

  const { data, isLoading, error } = useQuery({
    queryKey: ['candidates', isAdmin ? 'admin' : 'client'],
    queryFn: async () => {
      const endpoint = isAdmin ? '/api/admin/candidates' : '/api/candidates'
      const response = await api.get(endpoint)
      return response.data.candidates || []
    },
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: true,
  })

  const syncCandidates = useMutation({
    mutationFn: async () => {
      const endpoint = isAdmin ? '/api/admin/candidates/sync-all' : '/api/candidates/sync'
      const response = await api.post(endpoint)
      return response.data
    },
    onSuccess: () => {
      console.log('Candidates sync successful, invalidating queries...')
      qc.invalidateQueries({ queryKey: ['candidates'] })
      qc.invalidateQueries({ queryKey: ['analytics', 'client'] })
      qc.invalidateQueries({ queryKey: ['analytics-client'] })
      qc.invalidateQueries({ queryKey: ['analytics-client-dashboard'] })
      qc.invalidateQueries({ queryKey: ['analytics-client-page'] })
    },
  })



  const filteredCandidates = useMemo(() => {
    if (!data) return []
    let candidates = data
    
    // Debug: log all unique status values
    const uniqueStatuses = [...new Set(candidates.map((c: any) => c.status))]
    console.log('Unique status values:', uniqueStatuses)
    
    if (filter === 'shortlisted') {
      candidates = candidates.filter((c: any) => 
        c.status?.toLowerCase().includes('shortlist') || 
        c.status?.toLowerCase().includes('selected')
      )
    }

    if (filter === 'pending') {
      candidates = candidates.filter((c: any) => 
        !c.status || 
        c.status === '' || 
        c.status?.toLowerCase().includes('pending') ||
        c.status?.toLowerCase().includes('review') ||
        (!c.status?.toLowerCase().includes('shortlist') && 
         !c.status?.toLowerCase().includes('reject') &&
         !c.status?.toLowerCase().includes('selected'))
      )
    }
    
    if (search) candidates = candidates.filter((c: any) => 
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile?.toLowerCase().includes(search.toLowerCase()) ||
      c.client_name?.toLowerCase().includes(search.toLowerCase())
    )
    
    console.log(`Filter: ${filter}, Found: ${candidates.length} candidates`)
    return candidates
  }, [data, filter, search])

  if (isLoading) return (
    <div className="p-6">
      <div className="card p-6 inline-flex items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent"/> 
        Loading candidates...
      </div>
    </div>
  )

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
        👥 Candidates
      </motion.h1>

      {/* Summary Stats */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {[
          { label: 'Total Candidates', count: data?.length || 0, icon: '👥', color: 'from-blue-600 to-cyan-600', bgColor: 'bg-blue-500/10' },
          { label: 'Shortlisted', count: data?.filter((c: any) => c.status?.toLowerCase().includes('shortlist') || c.status?.toLowerCase().includes('selected')).length || 0, icon: '✅', color: 'from-green-600 to-emerald-600', bgColor: 'bg-green-500/10' },
          { label: 'Under Review', count: data?.filter((c: any) => !c.status || c.status === '' || (!c.status?.toLowerCase().includes('shortlist') && !c.status?.toLowerCase().includes('reject') && !c.status?.toLowerCase().includes('selected'))).length || 0, icon: '⏳', color: 'from-purple-600 to-indigo-600', bgColor: 'bg-purple-500/10' }
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

      <AnimatedCard className="p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3">
            {['all', 'shortlisted', 'pending'].map((filterType, index) => (
              <motion.button 
                key={filterType}
                onClick={() => setFilter(filterType)} 
                className={`px-6 py-3 rounded-xl text-sm font-medium transition-all ${
                  filter === filterType 
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-500/25' 
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 border border-slate-600'
                }`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
              >
                {filterType === 'all' ? '📋 All Candidates' : 
                 filterType === 'shortlisted' ? '✅ Shortlisted' : '⏳ Under Review'}
              </motion.button>
            ))}
          </div>
          
          <div className="flex gap-3 items-center">
            <motion.input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="🔍 Search candidates..." 
              className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all backdrop-blur-sm" 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
              whileFocus={{ scale: 1.02 }}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.3 }}
            >
              <AnimatedButton 
                onClick={() => syncCandidates.mutate()}
                disabled={syncCandidates.isPending}
                className="whitespace-nowrap"
              >
                {syncCandidates.isPending ? '🔄 Syncing...' : '🔄 Sync from Sheets'}
              </AnimatedButton>
            </motion.div>
          </div>
        </div>
      </AnimatedCard>

      {error && (
        <AnimatedCard className="p-6 border-red-700 bg-red-900/20">
          <div className="text-red-400">
            ⚠️ Error loading candidates: {error.message}
          </div>
        </AnimatedCard>
      )}

      <AnimatedCard className="overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full">
            <thead className="bg-slate-800/40 backdrop-blur-sm">
              <tr>
                <th className="text-left p-4 font-medium text-slate-300 text-sm">👤 Candidate</th>
                {isAdmin && <th className="text-left p-4 font-medium text-slate-300 text-sm">🏢 Client</th>}
                <th className="text-left p-4 font-medium text-slate-300 text-sm">📧 Contact</th>
                <th className="text-left p-4 font-medium text-slate-300 text-sm">🎯 Match Score</th>
                <th className="text-left p-4 font-medium text-slate-300 text-sm">📅 Interview</th>
                <th className="text-left p-4 font-medium text-slate-300 text-sm">📊 Status</th>
                <th className="text-left p-4 font-medium text-slate-300 text-sm">🎤 Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredCandidates?.map((candidate: any, index: number) => (
                  <motion.tr 
                    key={candidate.id} 
                    className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ backgroundColor: "rgba(51, 65, 85, 0.3)" }}
                  >
                    <td className="p-4">
                      <motion.div 
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => setSelectedCandidate(candidate)}
                        whileHover={{ x: 3 }}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-600 flex items-center justify-center text-white font-bold shadow-md group-hover:shadow-lg transition-shadow">
                          {candidate.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-white group-hover:text-cyan-300 transition-colors">{candidate.name || 'Unknown'}</div>
                          <div className="text-xs text-slate-500">View profile</div>
                        </div>
                      </motion.div>
                    </td>
                    {isAdmin && (
                      <td className="p-4">
                        <div className="text-slate-300 text-sm">{candidate.client_name || 'Unknown Client'}</div>
                      </td>
                    )}
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="text-slate-300 text-sm truncate max-w-[200px]">{candidate.email || 'No email'}</div>
                        <div className="text-slate-500 text-xs">{candidate.mobile || 'No phone'}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      {candidate.match_score ? (
                        <div className="flex items-center gap-2">
                          <div className={`text-lg font-bold ${
                            parseInt(candidate.match_score) >= 80 ? 'text-green-400' :
                            parseInt(candidate.match_score) >= 60 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {candidate.match_score}%
                          </div>
                          <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                parseInt(candidate.match_score) >= 80 ? 'bg-green-500' :
                                parseInt(candidate.match_score) >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${candidate.match_score}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">N/A</span>
                      )}
                    </td>
                    <td className="p-4">
                      {candidate.interview_date ? (
                        <div className="flex items-center gap-1">
                          <span className="text-cyan-400 text-sm">📅</span>
                          <span className="text-slate-300 text-sm">{candidate.interview_date}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">Not set</span>
                      )}
                    </td>
                    <td className="p-4">
                      <motion.span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          candidate.status?.toLowerCase().includes('shortlist') || candidate.status?.toLowerCase().includes('selected') ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          candidate.status?.toLowerCase().includes('reject') ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        {candidate.status?.toLowerCase().includes('shortlist') || candidate.status?.toLowerCase().includes('selected') ? '✅ Shortlisted' :
                         candidate.status?.toLowerCase().includes('reject') ? '❌ Rejected' : '⏳ Review'}
                      </motion.span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={() => setEmailModal({ candidateId: candidate.id })}
                          className="text-green-400 hover:text-green-300 transition-colors p-2 rounded-lg hover:bg-green-500/10"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Send Email"
                        >
                          📧
                        </motion.button>
                        <motion.button
                          onClick={() => setInterviewResultsModal({ 
                            candidate: {
                              id: candidate.id,
                              name: candidate.name,
                              email: candidate.email
                            }
                          })}
                          className="text-blue-400 hover:text-blue-300 transition-colors p-2 rounded-lg hover:bg-blue-500/10"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="View Interview Results"
                        >
                          📊
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          
          {filteredCandidates?.length === 0 && (
            <motion.div 
              className="text-center py-16 text-slate-400"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {data?.length === 0 ? (
                <div>
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
                    🤖
                  </motion.div>
                  <div className="text-xl mb-3 text-cyan-300">No candidates in the system</div>
                  <div className="text-sm mb-4">Sync from Google Sheets to load candidate data</div>
                  <AnimatedButton onClick={() => syncCandidates.mutate()} disabled={syncCandidates.isPending}>
                    {syncCandidates.isPending ? '🔄 Syncing...' : '🔄 Sync Now'}
                  </AnimatedButton>
                </div>
              ) : (
                <div>
                  <motion.div 
                    className="text-6xl mb-6"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity
                    }}
                  >
                    🔍
                  </motion.div>
                  <div className="text-xl text-cyan-300">No candidates match your search</div>
                  <div className="text-sm mt-2">Try adjusting your filters or search terms</div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </AnimatedCard>

      {/* Candidate Details Modal */}
      <AnimatePresence>
        {selectedCandidate && (
          <motion.div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCandidate(null)}
          >
            <motion.div 
              className="bg-slate-800/95 backdrop-blur-md rounded-2xl p-8 w-full max-w-2xl border border-slate-700/50 shadow-2xl"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {selectedCandidate.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-1">{selectedCandidate.name || 'Unknown Candidate'}</h3>
                    <div className="text-slate-400 text-sm">Candidate Profile</div>
                  </div>
                </div>
                <motion.button
                  onClick={() => setSelectedCandidate(null)}
                  className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  ✕
                </motion.button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30">
                    <div className="text-xs font-medium text-cyan-400 mb-2 flex items-center gap-2">
                      <span>📧</span> Email
                    </div>
                    <div className="text-white">{selectedCandidate.email || 'Not provided'}</div>
                  </div>
                  <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30">
                    <div className="text-xs font-medium text-cyan-400 mb-2 flex items-center gap-2">
                      <span>📱</span> Phone
                    </div>
                    <div className="text-white">{selectedCandidate.mobile || 'Not provided'}</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30">
                    <div className="text-xs font-medium text-cyan-400 mb-2 flex items-center gap-2">
                      <span>📅</span> Interview
                    </div>
                    <div className="text-white">{selectedCandidate.interview_date || 'Not scheduled'}</div>
                  </div>
                  <div className="bg-slate-700/20 rounded-lg p-4 border border-slate-600/30">
                    <div className="text-xs font-medium text-cyan-400 mb-2 flex items-center gap-2">
                      <span>📊</span> Status
                    </div>
                    <motion.span 
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedCandidate.status?.toLowerCase().includes('shortlist') || selectedCandidate.status?.toLowerCase().includes('selected') ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        selectedCandidate.status?.toLowerCase().includes('reject') ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}
                      whileHover={{ scale: 1.05 }}
                    >
                      {selectedCandidate.status?.toLowerCase().includes('shortlist') || selectedCandidate.status?.toLowerCase().includes('selected') ? '✅ Shortlisted' :
                       selectedCandidate.status?.toLowerCase().includes('reject') ? '❌ Rejected' : '⏳ Under Review'}
                    </motion.span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-700/30">
                <AnimatedButton 
                  onClick={() => setSelectedCandidate(null)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 py-2"
                >
                  Close Profile
                </AnimatedButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interview Results Modal */}
      <InterviewResultsModal
        isOpen={!!interviewResultsModal}
        onClose={() => setInterviewResultsModal(null)}
        candidate={interviewResultsModal?.candidate || { id: 0, name: '', email: '' }}
      />

      {/* Email Modal */}
      <EmailModal
        isOpen={!!emailModal}
        onClose={() => setEmailModal(null)}
        candidateId={emailModal?.candidateId}
        candidateIds={emailModal?.candidateIds}
      />
    </motion.div>
  )
}