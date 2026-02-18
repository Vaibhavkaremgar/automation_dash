import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

interface ClientDetailModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: number
  clientName: string
}

export default function ClientDetailModal({ isOpen, onClose, clientId, clientName }: ClientDetailModalProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['client-analytics', clientId],
    queryFn: async () => (await api.get(`/api/client-analytics/client/${clientId}`)).data,
    enabled: isOpen,
    refetchInterval: 30000 // Auto-refresh every 30 seconds
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          <motion.div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div>
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                  {clientName}
                </h2>
                <p className="text-slate-400 text-sm mt-1">Client Analytics Dashboard</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                    <span className="text-slate-300">Loading analytics...</span>
                  </div>
                </div>
              ) : data?.error ? (
                <div className="text-center py-12">
                  <div className="text-red-400 mb-2">⚠️ Error loading data</div>
                  <div className="text-slate-400 text-sm">{data.error}</div>
                  {!data.sheetConnected && (
                    <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                      <div className="text-yellow-400 text-sm">
                        💡 No Google Sheets URL configured for this client
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Overview Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <MetricCard
                      title="Total Candidates"
                      value={data?.totalCandidates || 0}
                      icon="👥"
                      color="from-blue-500 to-cyan-500"
                    />
                    <MetricCard
                      title="Shortlisted"
                      value={data?.shortlisted || 0}
                      icon="✅"
                      color="from-green-500 to-emerald-500"
                    />
                    <MetricCard
                      title="Rejected"
                      value={data?.rejected || 0}
                      icon="❌"
                      color="from-red-500 to-pink-500"
                    />
                  </div>

                  {/* Today's Activity */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MetricCard
                      title="Interviews Today"
                      value={data?.interviewsToday || 0}
                      icon="🎤"
                      color="from-orange-500 to-yellow-500"
                    />
                    <MetricCard
                      title="New Applications"
                      value={data?.newApplicationsToday || 0}
                      icon="📝"
                      color="from-teal-500 to-cyan-500"
                    />
                    <MetricCard
                      title="Sheet Status"
                      value={data?.sheetConnected ? "Connected" : "Not Set"}
                      icon={data?.sheetConnected ? "🔗" : "⚠️"}
                      color={data?.sheetConnected ? "from-green-500 to-emerald-500" : "from-yellow-500 to-orange-500"}
                    />
                  </div>

                  {/* Charts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Status Distribution */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        📊 Status Distribution
                      </h3>
                      <div className="space-y-3">
                        <StatusBar
                          label="Shortlisted"
                          value={data?.shortlisted || 0}
                          total={data?.totalCandidates || 1}
                          color="bg-green-500"
                        />
                        <StatusBar
                          label="Rejected"
                          value={data?.rejected || 0}
                          total={data?.totalCandidates || 1}
                          color="bg-red-500"
                        />
                        <StatusBar
                          label="Pending Review"
                          value={(data?.totalCandidates || 0) - (data?.shortlisted || 0) - (data?.rejected || 0)}
                          total={data?.totalCandidates || 1}
                          color="bg-yellow-500"
                        />
                      </div>
                    </div>

                    {/* Top Skills */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        🎯 Top Skills
                      </h3>
                      <div className="space-y-2">
                        {data?.topSkills?.slice(0, 5).map((skill: any) => (
                          <div key={skill.skill} className="flex items-center justify-between">
                            <span className="text-slate-300 text-sm">{skill.skill}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                                  style={{ width: `${(skill.count / (data?.totalCandidates || 1)) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-400 w-8">{skill.count}</span>
                            </div>
                          </div>
                        )) || (
                          <div className="text-slate-400 text-sm text-center py-4">No skills data available</div>
                        )}
                      </div>
                    </div>
                  </div>



                  {/* Recent Activity & Quick Stats */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Activity */}
                    <div className="lg:col-span-2 bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        ⚡ Recent Activity
                      </h3>
                      <div className="space-y-3 max-h-64 overflow-auto">
                        {data?.recentActivity?.map((activity: any, _: number) => (
                          <motion.div 
                            key={_} 
                            className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: _ * 0.1 }}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                activity.status === 'shortlisted' ? 'bg-green-400' : 
                                activity.status === 'rejected' ? 'bg-red-400' : 'bg-yellow-400'
                              }`} />
                              <span className="text-white font-medium">{activity.name}</span>
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(activity.updatedAt).toLocaleDateString()}
                            </span>
                          </motion.div>
                        )) || (
                          <div className="text-slate-400 text-sm text-center py-8">No recent activity</div>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        📈 Quick Stats
                      </h3>
                      <div className="space-y-4">
                        <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                          <div className="text-2xl font-bold text-cyan-400">
                            {data?.totalCandidates ? Math.round((data.shortlisted / data.totalCandidates) * 100) : 0}%
                          </div>
                          <div className="text-xs text-slate-400">Success Rate</div>
                        </div>
                        <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                          <div className="text-2xl font-bold text-green-400">
                            {data?.interviewsToday || 0}
                          </div>
                          <div className="text-xs text-slate-400">Interviews Today</div>
                        </div>
                        <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                          <div className="text-2xl font-bold text-purple-400">
                            {data?.candidates?.filter((c: any) => c.transcript && c.transcript !== 'No transcript available').length || 0}
                          </div>
                          <div className="text-xs text-slate-400">With Transcripts</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function MetricCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-slate-400 text-xs mb-1">{title}</div>
          <div className={`text-2xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
            {value}
          </div>
        </div>
        <div className="text-2xl opacity-60">{icon}</div>
      </div>
    </div>
  )
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">{value} ({percentage.toFixed(1)}%)</span>
      </div>
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}