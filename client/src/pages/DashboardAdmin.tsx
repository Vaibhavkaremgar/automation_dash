import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { api } from '../lib/api'
import AnimatedCard from '../components/ui/AnimatedCard'
// import StaggeredList from '../components/ui/StaggeredList'
import ClientDetailModal from '../components/ClientDetailModal'

export default function DashboardAdmin() {
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string } | null>(null)
  
  const { data, isLoading } = useQuery({
    queryKey: ['analytics','admin'],
    queryFn: async () => (await api.get('/api/analytics/admin')).data,
  })

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['client-analytics','all'],
    queryFn: async () => (await api.get('/api/client-analytics/all')).data,
    staleTime: 30000,
    refetchInterval: 60000, // Auto-refresh every minute
  })

  if (isLoading) return (
    <div className="p-6">
      <div className="card p-6 inline-flex items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent"/> 
        Loading dashboard...
      </div>
    </div>
  )

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.h1 
        className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Admin Dashboard
      </motion.h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Clients" value={data?.total_clients ?? 0} icon="👥" />
        <StatCard label="Revenue ($)" value={((data?.total_revenue_cents ?? 0)/100).toFixed(2) as any} icon="💰" />
        <StatCard label="Candidates" value={data?.total_candidates ?? 0} icon="📋" />
        <StatCard label="Jobs" value={data?.total_jobs ?? 0} icon="💼" />
      </div>

      <motion.div 
        className="space-y-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          Client Insights
        </h2>
        {clientsLoading ? (
          <motion.div 
            className="card p-6 flex items-center gap-2"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent"/> 
            Loading client analytics...
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clientsData?.clients?.map((client: any) => (
              <ClientTile 
                key={client.id} 
                client={client} 
                onClick={() => setSelectedClient({ id: client.id, name: client.name })}
              />
            )) || []}
          </div>
        )}
      </motion.div>

      <ClientDetailModal
        isOpen={!!selectedClient}
        onClose={() => setSelectedClient(null)}
        clientId={selectedClient?.id || 0}
        clientName={selectedClient?.name || ''}
      />
    </motion.div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: string }) {
  return (
    <AnimatedCard className="p-6 group cursor-pointer" hover={false}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">{label}</div>
          <div className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            {value}
          </div>
        </div>
        <div className="text-3xl opacity-60 group-hover:opacity-100 transition-opacity">
          {icon}
        </div>
      </div>
    </AnimatedCard>
  )
}

function ClientTile({ client, onClick }: { client: any; onClick: () => void }) {
  return (
    <motion.div
      className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-xl p-6 group cursor-pointer overflow-hidden relative hover:scale-105 transition-all duration-300 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-400/10"
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Gradient overlay on hover */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        initial={false}
      />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <motion.h3 
            className="font-semibold text-lg text-white group-hover:text-cyan-300 transition-colors"
            whileHover={{ x: 5 }}
          >
            {client.name}
          </motion.h3>
          <div className="flex items-center gap-2">
            {client.hasSheet ? (
              <motion.div 
                className="w-3 h-3 rounded-full bg-green-400 shadow-lg shadow-green-400/50"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                title="Google Sheets connected" 
              />
            ) : (
              <div 
                className="w-3 h-3 rounded-full bg-yellow-400 shadow-lg shadow-yellow-400/50"
                title="No Google Sheets connected"
              />
            )}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              className="text-center p-3 rounded-lg bg-slate-700/50 group-hover:bg-slate-600/50 transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-xs text-slate-400 mb-1">Total Candidates</div>
              <div className="text-xl font-bold text-cyan-400">{client.totalCandidates}</div>
            </motion.div>
            <motion.div 
              className="text-center p-3 rounded-lg bg-slate-700/50 group-hover:bg-slate-600/50 transition-colors"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-xs text-slate-400 mb-1">Shortlisted</div>
              <div className="text-xl font-bold text-green-400">{client.shortlisted}</div>
            </motion.div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xs text-slate-400">Rejected</div>
              <div className="font-semibold text-red-400">{client.rejected}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-slate-400">Sheet Status</div>
              <div className={`font-semibold text-xs ${client.hasSheet ? 'text-green-400' : 'text-yellow-400'}`}>
                {client.hasSheet ? '✓ Connected' : '⚠ Not Set'}
              </div>
            </div>
          </div>
          
          <motion.div 
            className="text-xs text-slate-500 text-center pt-2 border-t border-slate-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Click for details • Last sync: {client.lastSync ? new Date(client.lastSync).toLocaleDateString() : 'Never'}
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}