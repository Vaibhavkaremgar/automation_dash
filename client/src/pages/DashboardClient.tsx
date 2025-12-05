import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import QuickActions from '../components/dashboard/QuickActions'
import RecentActivity from '../components/dashboard/RecentActivity'
import AnimatedCard from '../components/ui/AnimatedCard'

export default function DashboardClient() {
  // Get candidates and jobs data directly
  const { data: candidatesData } = useQuery({
    queryKey: ['candidates'],
    queryFn: async () => {
      const response = await api.get('/api/candidates')
      return response.data.candidates || []
    },
    refetchInterval: 5000
  })

  const { data: jobsData } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await api.get('/api/jobs')
      return response.data.jobs || []
    },
    refetchInterval: 5000
  })

  // Calculate analytics from candidates data
  const data = useMemo(() => {
    if (!candidatesData || !jobsData) return null
    
    const total = candidatesData.length
    const shortlisted = candidatesData.filter(c => 
      c.status?.toLowerCase().includes('shortlist') ||
      c.status?.toLowerCase().includes('selected')
    ).length
    
    const avgScore = candidatesData.length > 0 
      ? Math.round(candidatesData.reduce((sum, c) => sum + (c.match_score || 0), 0) / candidatesData.length)
      : 0

    return {
      jobs: { total: jobsData.length },
      candidates: {
        total,
        shortlisted,
        avgMatchScore: { value: avgScore }
      }
    }
  }, [candidatesData, jobsData])

  const isLoading = !candidatesData || !jobsData
  const error = null



  // Chart data from real analytics
  const chartData = useMemo(() => {
    const jobs = data?.jobs?.total ?? 0
    const candidates = data?.candidates?.total ?? 0
    const shortlisted = data?.candidates?.shortlisted ?? 0
    const pending = candidates - shortlisted

    return [
      { label: 'Jobs', value: jobs },
      { label: 'Candidates', value: candidates },
      { label: 'Successful', value: shortlisted },
      { label: 'In Process', value: pending },
    ]
  }, [data])

  if (isLoading)
    return (
      <motion.div 
        className="p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <AnimatedCard className="p-6 inline-flex items-center gap-3">
          <motion.div 
            className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <span className="text-cyan-300">🤖 Loading dashboard...</span>
        </AnimatedCard>
      </motion.div>
    )

  if (error) {
    return (
      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.h1 
          className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          🤖 Dashboard
        </motion.h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Jobs" value={0} icon="🎯" color="indigo" />
          <StatCard label="Candidates" value={0} icon="👥" color="blue" />
          <StatCard label="Successful" value={0} icon="✨" color="green" />
          <StatCard label="Match Score" value="0%" icon="📈" color="purple" />
        </div>
        <div className="mt-4 text-center text-red-400">
          🔄 Unable to load data from Google Sheets. Please check your sheet configuration.
        </div>
        <AnimatedCard className="p-4 text-red-400 border-red-500/30">
          🚨 Connection lost. Please refresh to reconnect.
        </AnimatedCard>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        className="flex items-center gap-4"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center"
          animate={{ 
            boxShadow: [
              "0 0 20px rgba(59, 130, 246, 0.3)",
              "0 0 30px rgba(6, 182, 212, 0.4)",
              "0 0 20px rgba(59, 130, 246, 0.3)"
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-2xl">🤖</span>
        </motion.div>
        <div>
          <motion.h1 
            className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Dashboard
          </motion.h1>
          <motion.p 
            className="text-slate-400 text-sm"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Real data from Google Sheets • Live candidate metrics
          </motion.p>
        </div>
      </motion.div>

      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <StatCard label="Active Jobs" value={data?.jobs?.total ?? 0} icon="🎯" color="indigo" />
        <StatCard label="Total Candidates" value={data?.candidates?.total ?? 0} icon="👥" color="blue" />
        <StatCard label="Successful" value={data?.candidates?.shortlisted ?? 0} icon="✨" color="green" />
        <StatCard label="Avg Match Score" value={`${data?.candidates?.avgMatchScore?.value ?? 0}%`} icon="📈" color="purple" />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <QuickActions />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <AnimatedCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <span className="text-sm">📊</span>
            </motion.div>
            <h2 className="font-semibold text-lg text-cyan-300">Performance Overview</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ 
                    background: 'rgba(15, 23, 42, 0.9)', 
                    border: '1px solid rgba(6, 182, 212, 0.3)', 
                    borderRadius: '12px',
                    backdropFilter: 'blur(10px)'
                  }}
                  cursor={{ fill: 'rgba(6, 182, 212, 0.1)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((_: any, index: number) => {
                    const colors = ['#6366f1', '#3b82f6', '#10b981', '#8b5cf6']
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnimatedCard>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1.1 }}
      >
        <RecentActivity />
      </motion.div>
    </motion.div>
  )
}

function StatCard({ label, value, icon, color = 'blue' }: { 
  label: string; 
  value: number | string; 
  icon: string;
  color?: 'indigo' | 'blue' | 'green' | 'purple';
}) {
  const colorClasses = {
    indigo: 'from-indigo-500 to-purple-500 shadow-indigo-500/20',
    blue: 'from-blue-500 to-cyan-500 shadow-blue-500/20',
    green: 'from-green-500 to-emerald-500 shadow-green-500/20',
    purple: 'from-purple-500 to-pink-500 shadow-purple-500/20'
  }

  return (
    <AnimatedCard className="p-6 group cursor-pointer" hover={false}>
      <motion.div
        className="flex items-center justify-between"
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div className="flex-1">
          <div className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors mb-2">{label}</div>
          <motion.div 
            className="text-3xl font-bold text-white"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            {value}
          </motion.div>
        </div>
        <motion.div 
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}
          animate={{ 
            y: [0, -4, 0],
            boxShadow: [
              `0 4px 20px ${colorClasses[color].includes('indigo') ? 'rgba(99, 102, 241, 0.2)' : 
                           colorClasses[color].includes('blue') ? 'rgba(59, 130, 246, 0.2)' :
                           colorClasses[color].includes('green') ? 'rgba(16, 185, 129, 0.2)' :
                           'rgba(139, 92, 246, 0.2)'}`,
              `0 8px 25px ${colorClasses[color].includes('indigo') ? 'rgba(99, 102, 241, 0.3)' : 
                           colorClasses[color].includes('blue') ? 'rgba(59, 130, 246, 0.3)' :
                           colorClasses[color].includes('green') ? 'rgba(16, 185, 129, 0.3)' :
                           'rgba(139, 92, 246, 0.3)'}`,
              `0 4px 20px ${colorClasses[color].includes('indigo') ? 'rgba(99, 102, 241, 0.2)' : 
                           colorClasses[color].includes('blue') ? 'rgba(59, 130, 246, 0.2)' :
                           colorClasses[color].includes('green') ? 'rgba(16, 185, 129, 0.2)' :
                           'rgba(139, 92, 246, 0.2)'}`
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-xl">{icon}</span>
        </motion.div>
      </motion.div>
    </AnimatedCard>
  )
}
