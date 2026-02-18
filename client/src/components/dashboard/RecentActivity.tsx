import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api'
import AnimatedCard from '../ui/AnimatedCard'

export default function RecentActivity() {
  const { data: tx, isLoading: txLoading } = useQuery({
    queryKey: ['wallet','tx','recent'],
    queryFn: async () => (await api.get('/api/wallet/transactions?limit=5')).data.transactions as any[],
  })
  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ['candidates','recent'],
    queryFn: async () => (await api.get('/api/candidates')).data.candidates?.slice(0,5) as any[],
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <motion.div
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <span className="text-sm">🔄</span>
        </motion.div>
        <h2 className="text-xl font-semibold text-cyan-300">Recent Activity</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <span className="text-xs">💳</span>
            </motion.div>
            <h3 className="font-semibold text-green-300">Transactions</h3>
          </div>
          
          {txLoading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <motion.div 
                className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-sm">Loading transactions...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {tx?.map((t, index) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-green-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {t.type === 'recharge' ? '⚡' : '🔄'}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-white capitalize">{t.type}</div>
                        <div className="text-xs text-slate-400">
                          {new Date(t.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <motion.div 
                      className={`font-semibold ${
                        t.type === 'recharge' ? 'text-green-400' : 'text-orange-400'
                      }`}
                      whileHover={{ scale: 1.1 }}
                    >
                      {t.type === 'recharge' ? '+' : '-'}₹{(t.amount_cents/100).toFixed(0)}
                    </motion.div>
                  </motion.div>
                )) || (
                  <div className="text-center py-8 text-slate-500">
                    <span className="text-2xl block mb-2">💳</span>
                    <span className="text-sm">No transactions yet</span>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </AnimatedCard>

        <AnimatedCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
              animate={{ 
                y: [0, -2, 0],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-xs">🤖</span>
            </motion.div>
            <h3 className="font-semibold text-blue-300">Recent Candidates</h3>
          </div>
          
          {candidatesLoading ? (
            <div className="flex items-center gap-2 text-slate-400">
              <motion.div 
                className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-sm">Analyzing candidates...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {candidates?.map((c, index) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">👥</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white truncate">
                          {c.name || c.email || 'Unknown'}
                        </div>
                        <div className="text-xs text-slate-400">
                          AI Score: {c.match_score || 'Processing...'}
                        </div>
                      </div>
                    </div>
                    <motion.span 
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        c.status === 'shortlisted' ? 'bg-green-900/50 text-green-300' :
                        c.status === 'rejected' ? 'bg-red-900/50 text-red-300' :
                        'bg-yellow-900/50 text-yellow-300'
                      }`}
                      whileHover={{ scale: 1.05 }}
                    >
                      {c.status === 'shortlisted' ? '✨ Selected' :
                       c.status === 'rejected' ? '❌ Filtered' :
                       '🔄 Processing'}
                    </motion.span>
                  </motion.div>
                )) || (
                  <div className="text-center py-8 text-slate-500">
                    <span className="text-2xl block mb-2">🤖</span>
                    <span className="text-sm">No candidates processed</span>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}
        </AnimatedCard>
      </div>
    </div>
  )
}