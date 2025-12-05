import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib/api'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, PieChart, Pie, LineChart, Line, Area, AreaChart } from 'recharts'
import { useMemo, useState, useEffect } from 'react'
import AnimatedCard from '../components/ui/AnimatedCard'
import AnimatedButton from '../components/ui/AnimatedButton'
import FloatingParticles from '../components/ui/FloatingParticles'

export default function AnalyticsPage() {
  const [selectedMetric, setSelectedMetric] = useState('overview')
  const [animatedValues, setAnimatedValues] = useState({ candidates: 0, shortlisted: 0, pending: 0, avgScore: 0 })

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
  const analyticsData = useMemo(() => {
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
        avgMatchScore: { value: avgScore, description: `Average from ${candidatesData.length} candidates` },
        responseRate: { value: 0, description: 'No email data' },
        timeToShortlist: { value: 0, description: 'No timing data' },
        successRate: { value: total > 0 ? Math.round((shortlisted / total) * 100) : 0, description: `${shortlisted} of ${total} candidates` }
      },
      wallet: { balance: 0, totalSpent: 0, recentTransactions: [] },
      emails: { sent: 0, failed: 0 },
      trends: { monthly: [] }
    }
  }, [candidatesData, jobsData])

  const isLoading = !candidatesData || !jobsData

  const trendData = useMemo(() => {
    return analyticsData?.trends?.monthly || []
  }, [analyticsData])

  // Safe analytics data with proper fallback
  const safeAnalyticsData = analyticsData || {
    jobs: { total: 0 },
    candidates: { 
      total: 0, 
      shortlisted: 0,
      avgMatchScore: { value: 0, description: 'No data available' },
      responseRate: { value: 0, description: 'No data available' },
      timeToShortlist: { value: 0, description: 'No data available' },
      successRate: { value: 0, description: 'No data available' }
    },
    wallet: { balance: 0, totalSpent: 0, recentTransactions: [] },
    emails: { sent: 0, failed: 0 }
  }

  // Animate numbers when data loads
  useEffect(() => {
    if (safeAnalyticsData && safeAnalyticsData.candidates) {
      const total = safeAnalyticsData.candidates.total || 0;
      const shortlisted = safeAnalyticsData.candidates.shortlisted || 0;
      const targets = {
        candidates: total,
        shortlisted: shortlisted,
        pending: total - shortlisted,
        avgScore: safeAnalyticsData.candidates.avgMatchScore?.value || 0
      }
      
      const duration = 2000
      const steps = 60
      const stepDuration = duration / steps
      
      let step = 0
      const interval = setInterval(() => {
        step++
        const progress = step / steps
        const easeOut = 1 - Math.pow(1 - progress, 3)
        
        setAnimatedValues({
          candidates: Math.floor(targets.candidates * easeOut),
          shortlisted: Math.floor(targets.shortlisted * easeOut),
          pending: Math.floor(targets.pending * easeOut),
          avgScore: Math.floor(targets.avgScore * easeOut)
        })
        
        if (step >= steps) clearInterval(interval)
      }, stepDuration)
      
      return () => clearInterval(interval)
    }
  }, [safeAnalyticsData])

  const pieData = useMemo(() => {
    if (!safeAnalyticsData?.candidates) return [];
    
    const total = safeAnalyticsData.candidates.total || 0;
    const successful = safeAnalyticsData.candidates.shortlisted || 0;
    const inProcess = total - successful;
    
    if (total === 0) return [];
    
    return [
      { name: 'Successful', value: successful, color: '#10b981' },
      { name: 'In Process', value: inProcess, color: '#f59e0b' }
    ].filter(item => item.value > 0);
  }, [safeAnalyticsData])

  if (isLoading) {
    return (
      <motion.div 
        className="flex items-center justify-center h-64"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center gap-3">
          <motion.div 
            className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <span className="text-slate-300">Loading analytics...</span>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="relative">
      <FloatingParticles />
      
      {/* Animated Grid Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
          animate={{
            backgroundPosition: ['0px 0px', '50px 50px', '0px 0px']
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
      
      <motion.div 
        className="relative space-y-8 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
      {/* Header */}
      <motion.div
        className="text-center mb-8"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center"
          animate={{ 
            boxShadow: [
              "0 0 30px rgba(139, 92, 246, 0.4)",
              "0 0 50px rgba(6, 182, 212, 0.5)",
              "0 0 30px rgba(139, 92, 246, 0.4)"
            ],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <span className="text-4xl">📊</span>
        </motion.div>
        <motion.h1 
          className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 mb-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Analytics Dashboard
        </motion.h1>
        <motion.p 
          className="text-slate-400 text-lg"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Real-time insights from your Google Sheets data
        </motion.p>
        <motion.div 
          className="text-xs text-slate-500 mt-2 bg-slate-800/30 rounded-lg px-3 py-1 inline-block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          📈 Live data from Google Sheets • Auto-refreshing every 30s
        </motion.div>
      </motion.div>

      {/* Metric Selector */}
      <motion.div
        className="flex justify-center mb-8"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex bg-slate-800/50 rounded-2xl p-2 backdrop-blur-sm border border-slate-700">
          {[
            { id: 'overview', label: '📈 Overview', icon: '📈' },
            { id: 'candidates', label: '👥 Candidates', icon: '👥' },
            { id: 'trends', label: '📊 Trends', icon: '📊' }
          ].map((metric) => (
            <motion.button
              key={metric.id}
              onClick={() => setSelectedMetric(metric.id)}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                selectedMetric === metric.id
                  ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {metric.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <AnimatedStatCard 
          label="Total Candidates" 
          value={animatedValues.candidates} 
          icon="👥" 
          color="from-blue-500 to-cyan-500"
          delay={0.1}
        />
        <AnimatedStatCard 
          label="Successful" 
          value={animatedValues.shortlisted} 
          icon="✅" 
          color="from-green-500 to-emerald-500"
          delay={0.2}
        />
        <AnimatedStatCard 
          label="In Process" 
          value={animatedValues.pending} 
          icon="⏳" 
          color="from-yellow-500 to-orange-500"
          delay={0.3}
        />
        <AnimatedStatCard 
          label="Avg Match Score" 
          value={`${animatedValues.avgScore}%`} 
          icon="🎯" 
          color="from-purple-500 to-pink-500"
          delay={0.4}
        />
      </motion.div>

      {/* Dynamic Content Based on Selected Metric */}
      <AnimatePresence mode="wait">
        {selectedMetric === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Wallet & Usage Analytics */}
            <AnimatedCard className="p-6">
              <motion.h2 
                className="text-xl font-semibold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                💰 Wallet & Usage Analytics
              </motion.h2>
              <motion.div 
                className="space-y-6"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {/* Wallet Balance */}
                <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-4 border border-green-500/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center"
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      >
                        <span className="text-xl">💰</span>
                      </motion.div>
                      <div>
                        <div className="text-green-300 font-semibold">Current Balance</div>
                        <div className="text-2xl font-bold text-white">
                          ₹{((safeAnalyticsData.wallet?.balance || 0) / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <motion.div
                      className="text-green-400 text-sm"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      Available Credits
                    </motion.div>
                  </div>
                </div>

                {/* Usage Statistics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 rounded-xl p-4 border border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <span className="text-sm">🎤</span>
                      </motion.div>
                      <div>
                        <div className="text-blue-300 text-sm">Voice Calls</div>
                        <div className="text-lg font-bold text-white">
                          0 min
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/20">
                    <div className="flex items-center gap-3">
                      <motion.div
                        className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                        animate={{ rotate: [0, 180, 360] }}
                        transition={{ duration: 4, repeat: Infinity }}
                      >
                        <span className="text-sm">📄</span>
                      </motion.div>
                      <div>
                        <div className="text-purple-300 text-sm">Resumes Processed</div>
                        <div className="text-lg font-bold text-white">
                          {safeAnalyticsData.candidates?.total || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600/30">
                  <div className="text-slate-300 font-medium mb-3">📈 Recent Activity</div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {safeAnalyticsData.wallet?.recentTransactions?.slice(0, 3).map((transaction: any, index: number) => (
                      <motion.div
                        key={index}
                        className="flex items-center justify-between text-sm"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="flex items-center gap-2">
                          <span>
                            {transaction.type === 'recharge' ? '💳' : '💸'}
                          </span>
                          <span className="text-slate-400">{transaction.description}</span>
                        </div>
                        <span className={`font-medium ${
                          transaction.type === 'recharge' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {transaction.type === 'recharge' ? '+' : '-'}₹{(Math.abs(transaction.amount) / 100).toFixed(2)}
                        </span>
                      </motion.div>
                    ))}
                    {(!safeAnalyticsData.wallet?.recentTransactions || safeAnalyticsData.wallet.recentTransactions.length === 0) && (
                      <div className="text-slate-500 text-center py-4">No recent transactions</div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatedCard>

            {/* Pie Chart */}
            <AnimatedCard className="p-6">
              <motion.h2 
                className="text-xl font-semibold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                🎯 Candidate Performance (Real Data)
              </motion.h2>
              <motion.div 
                className="h-80 flex items-center justify-center"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ 
                          background: 'rgba(15, 23, 42, 0.9)', 
                          border: '1px solid #334155', 
                          borderRadius: '12px',
                          backdropFilter: 'blur(10px)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-slate-400">
                    <div className="text-6xl mb-4">📊</div>
                    <div>No candidate data available</div>
                  </div>
                )}
              </motion.div>
            </AnimatedCard>
          </motion.div>
        )}

        {selectedMetric === 'candidates' && (
          <motion.div
            key="candidates"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <CandidateMetrics data={safeAnalyticsData} />
          </motion.div>
        )}

        {selectedMetric === 'trends' && (
          <motion.div
            key="trends"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <TrendAnalysis data={trendData} />
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  )
}

function AnimatedStatCard({ label, value, icon, color, delay }: {
  label: string
  value: number | string
  icon: string
  color: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.6 }}
      whileHover={{ 
        scale: 1.05, 
        y: -5,
        rotateY: 5,
        rotateX: 5
      }}
      style={{ perspective: 1000 }}
    >
      <AnimatedCard className={`p-6 bg-gradient-to-br ${color}/10 relative overflow-hidden`}>
        <motion.div
          className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${color}/20 blur-xl`}
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <div className={`absolute inset-0 bg-gradient-to-br ${color}/5`} />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <motion.div
              className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg relative`}
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 3, repeat: Infinity, delay }}
            >
              <span className="text-xl">{icon}</span>
            </motion.div>
            <motion.div
              className="text-right"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: delay + 0.2 }}
            >
              <motion.div 
                className="text-sm text-slate-400"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {label}
              </motion.div>
              <motion.div 
                className="text-3xl font-bold text-white"
                key={value}
                initial={{ scale: 1.2, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.5,
                  type: "spring",
                  stiffness: 200,
                  damping: 10
                }}
              >
                {value}
              </motion.div>
            </motion.div>
          </div>
          
          {/* Animated progress bar */}
          <div className="relative h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <motion.div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${color} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ delay: delay + 0.5, duration: 1.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </AnimatedCard>
    </motion.div>
  )
}

function CandidateMetrics({ data }: { data: any }) {
  const metrics = [
    { 
      label: 'Average Match Score', 
      value: data?.candidates?.avgMatchScore?.value ? `${data.candidates.avgMatchScore.value}%` : '0%', 
      icon: '🎯', 
      description: data?.candidates?.avgMatchScore?.description || 'No match scores available'
    },
    { 
      label: 'Response Rate', 
      value: data?.candidates?.responseRate?.value ? `${data.candidates.responseRate.value}%` : '0%', 
      icon: '📧', 
      description: data?.candidates?.responseRate?.description || 'No email data available'
    },
    { 
      label: 'Time to Shortlist', 
      value: data?.candidates?.timeToShortlist?.value ? `${data.candidates.timeToShortlist.value} days` : '0 days', 
      icon: '⏱️', 
      description: data?.candidates?.timeToShortlist?.description || 'No shortlisting data available'
    },
    { 
      label: 'Success Rate', 
      value: data?.candidates?.successRate?.value ? `${data.candidates.successRate.value}%` : '0%', 
      icon: '🏆', 
      description: data?.candidates?.successRate?.description || 'No success data available'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <AnimatedCard className="p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <span className="text-2xl">{metric.icon}</span>
                </motion.div>
                <div>
                  <div className="text-slate-300 text-sm">{metric.label}</div>
                  <div className="text-2xl font-bold text-white">{metric.value}</div>
                  <div className="text-xs text-slate-500 mt-1" title={metric.description}>
                    {metric.description}
                  </div>
                </div>
              </div>
              <motion.div
                className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Real Data
              </motion.div>
            </div>
          </AnimatedCard>
        </motion.div>
      ))}
    </div>
  )
}

function TrendAnalysis({ data }: { data: any[] }) {
  const hasData = data && data.length > 0;
  const totalCandidates = hasData ? data.reduce((sum, month) => sum + month.candidates, 0) : 0;
  const totalEmails = hasData ? data.reduce((sum, month) => sum + month.emails, 0) : 0;
  const totalShortlisted = hasData ? data.reduce((sum, month) => sum + (month.shortlisted || 0), 0) : 0;

  return (
    <AnimatedCard className="p-6">
      <motion.h2 
        className="text-xl font-semibold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        📈 6-Month Trend Analysis
      </motion.h2>
      <motion.p 
        className="text-sm text-slate-400 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Real data: {totalCandidates} candidates, {totalEmails} emails, {totalShortlisted} shortlisted over 6 months
      </motion.p>
      
      {hasData ? (
        <motion.div 
          className="h-80"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ 
                  background: 'rgba(15, 23, 42, 0.9)', 
                  border: '1px solid #334155', 
                  borderRadius: '12px',
                  backdropFilter: 'blur(10px)'
                }}
              />
              <Area
                type="monotone"
                dataKey="candidates"
                stroke="#06b6d4"
                fill="url(#candidatesGradient)"
                strokeWidth={3}
                name="Candidates"
              />
              <Area
                type="monotone"
                dataKey="emails"
                stroke="#8b5cf6"
                fill="url(#emailsGradient)"
                strokeWidth={3}
                name="Emails"
              />
              <Area
                type="monotone"
                dataKey="shortlisted"
                stroke="#10b981"
                fill="url(#shortlistedGradient)"
                strokeWidth={3}
                name="Shortlisted"
              />
              <defs>
                <linearGradient id="candidatesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="emailsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="shortlistedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      ) : (
        <motion.div 
          className="h-80 flex items-center justify-center text-slate-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-center">
            <div className="text-6xl mb-4">📈</div>
            <div className="text-lg">No trend data available yet</div>
            <div className="text-sm mt-2">Add candidates and send emails to see trends</div>
          </div>
        </motion.div>
      )}
    </AnimatedCard>
  )
}