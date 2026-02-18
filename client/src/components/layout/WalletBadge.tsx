import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

export default function WalletBadge() {
  const { data } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await api.get('/api/wallet')
      return res.data
    },
    staleTime: 30_000,
  })

  const balance = data?.balance_cents ? (data.balance_cents / 100).toFixed(0) : '0'
  const isLow = data?.is_low_balance || data?.isLowBalance

  return (
    <div className={`px-3 py-1 text-sm rounded-full border transition-colors pointer-events-none ${isLow ? 'border-red-400/50 text-red-300 bg-red-500/10' : 'border-emerald-400/50 text-emerald-300 bg-emerald-500/10'}`}>
      Balance: ₹{balance}
    </div>
  )
}
