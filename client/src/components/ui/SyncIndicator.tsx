import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

export default function SyncIndicator() {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['analytics-client'],
    queryFn: async () => {
      const response = await api.get('/api/analytics/client')
      return response.data
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: false
  })

  return (
    <AnimatePresence>
      {(isLoading || isFetching) && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 z-50"
        >
          <div className="bg-slate-800/90 backdrop-blur-sm border border-cyan-500/30 rounded-lg px-4 py-2 flex items-center gap-3 shadow-lg">
            <motion.div
              className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span className="text-cyan-300 text-sm font-medium">
              Syncing from Google Sheets...
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}