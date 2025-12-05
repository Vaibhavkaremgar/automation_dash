import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { api } from '../../lib/api'

export default function DataSyncStatus() {
  const { data: debugData } = useQuery({
    queryKey: ['debug-data'],
    queryFn: async () => {
      const response = await api.get('/api/debug/data-check')
      return response.data
    },
    refetchInterval: 5000,
    retry: false
  })

  if (!debugData) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 z-50 bg-slate-800/90 backdrop-blur-sm border border-slate-600 rounded-lg p-3 text-xs"
    >
      <div className="text-cyan-400 font-medium mb-1">Data Status</div>
      <div className="space-y-1 text-slate-300">
        <div>User ID: {debugData.userId}</div>
        <div>Candidates: {debugData.candidates?.count || 0}</div>
        <div>Jobs: {debugData.jobs?.count || 0}</div>
      </div>
    </motion.div>
  )
}