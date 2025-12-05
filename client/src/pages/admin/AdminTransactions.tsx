import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

export default function AdminTransactionsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin','transactions'],
    queryFn: async () => (await api.get('/api/admin/transactions')).data.transactions as any[],
  })

  if (isLoading) return <div className="p-6"><div className="card p-6 inline-flex items-center gap-2"><div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent"/> Loading</div></div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">All Transactions</h1>
      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/60">
            <tr>
              <th className="text-left p-2">Date</th>
              <th className="text-left p-2">User ID</th>
              <th className="text-left p-2">Wallet</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Amount ($)</th>
              <th className="text-left p-2">Meta</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((t:any) => (
              <tr key={t.id} className="border-t border-slate-800/60">
                <td className="p-2">{new Date(t.created_at).toLocaleString()}</td>
                <td className="p-2">{t.user_id}</td>
                <td className="p-2"><a className="text-indigo-400 hover:underline" href="/admin/users">Open</a></td>
                <td className="p-2 capitalize">{t.type}</td>
                <td className="p-2">{(t.amount_cents/100).toFixed(2)}</td>
                <td className="p-2 text-xs text-slate-400">{t.metadata}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
