import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Link } from 'react-router-dom'

export default function LowBalanceBanner() {
  const { data } = useQuery({
    queryKey: ['wallet','banner'],
    queryFn: async () => (await api.get('/api/wallet')).data,
    staleTime: 15000,
  })

  if (!data?.is_low_balance && !data?.isLowBalance) return null

  return (
    <div className="px-4 sm:px-6 py-2 bg-gradient-to-r from-amber-500/20 to-red-500/20 border-b border-red-500/30 text-sm text-amber-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div>
          Low balance: ₹{data?.balance_cents ? (data.balance_cents/100).toFixed(0) : '0'} — some actions may be limited.
        </div>
        <Link to="/wallet" className="underline hover:no-underline">Add Money</Link>
      </div>
    </div>
  )
}
