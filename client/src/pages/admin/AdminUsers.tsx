import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['admin','users'],
    queryFn: async () => (await api.get('/api/admin/users')).data.users as any[],
  })

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [googleSheetUrl, setGoogleSheetUrl] = useState('')
  const [clientType, setClientType] = useState('hr')
  const [statusEdits, setStatusEdits] = useState<Record<number, string>>({})
  const [tempPassword, setTempPassword] = useState('')
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const createUser = useMutation({
    mutationFn: async () => {
      console.log('Creating user with:', { email, name, google_sheet_url: googleSheetUrl })
      const response = await api.post('/api/admin/users', { 
        email, 
        name, 
        google_sheet_url: googleSheetUrl,
        client_type: clientType
      })
      return response.data
    },
    onSuccess: (data) => { 
      console.log('User created successfully:', data)
      setTempPassword(data.tempPassword)
      setEmail('')
      setName('')
      setGoogleSheetUrl('')
      setClientType('hr')
      qc.invalidateQueries({ queryKey: ['admin','users'] })
    },
    onError: (error: any) => {
      console.error('Create user error:', error)
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error'
      alert(`Failed to create user: ${errorMsg}`)
    }
  })

  const updateUser = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => 
      (await api.patch(`/api/admin/users/${id}`, { status })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin','users'] }),
  })

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-white">Client Management</h1>

      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Create New Client</h2>
        <div className="space-y-4">
          <div>
            <input 
              type="email"
              placeholder="Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
            {email && !emailValid && (
              <p className="text-red-400 text-sm mt-1">Enter a valid email</p>
            )}
          </div>
          <div>
            <input 
              placeholder="Client Name *" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            />
            {!name.trim() && (
              <p className="text-yellow-400 text-sm mt-1">Client name is required</p>
            )}
          </div>
          <input 
            placeholder="Google Sheets URL (optional) - https://docs.google.com/spreadsheets/d/..." 
            value={googleSheetUrl} 
            onChange={e => setGoogleSheetUrl(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
          />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Client Type</label>
            <select 
              value={clientType} 
              onChange={e => setClientType(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
            >
              <option value="hr">HR Agency</option>
              <option value="insurance">Insurance Agency</option>
            </select>
          </div>
          <button 
            onClick={() => {
              if (!email.trim()) {
                alert('Email is required')
                return
              }
              if (!name.trim()) {
                alert('Client name is required')
                return
              }
              createUser.mutate()
            }} 
            disabled={!emailValid || !name.trim() || createUser.isPending}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
          >
            {createUser.isPending ? 'Creating...' : 'Create Client'}
          </button>
        </div>
        
        {tempPassword && (
          <div className="mt-4 bg-green-900/20 border border-green-700 rounded p-4">
            <h3 className="font-semibold text-green-300">Client Created Successfully!</h3>
            <p className="text-green-200 mt-1">
              Temporary Password: <code className="bg-green-800 px-2 py-1 rounded">{tempPassword}</code>
            </p>
            <p className="text-green-300 text-sm mt-2">Share this password with the client. They must change it on first login.</p>
            <button 
              onClick={() => setTempPassword('')} 
              className="text-green-400 hover:underline text-sm mt-2"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-700">
            <tr>
              <th className="text-left p-3 text-white">Email</th>
              <th className="text-left p-3 text-white">Name</th>
              <th className="text-left p-3 text-white">Type</th>
              <th className="text-left p-3 text-white">Balance</th>
              <th className="text-left p-3 text-white">Sheets</th>
              <th className="text-left p-3 text-white">Status</th>
              <th className="text-left p-3 text-white">Actions</th>
              <th className="text-left p-3 text-white">Recharge</th>
            </tr>
          </thead>
          <tbody>
            {data?.map(user => (
              <tr key={user.id} className="border-t border-slate-700">
                <td className="p-3 text-white">{user.email}</td>
                <td className="p-3 text-gray-300">{user.name || '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.client_type === 'insurance' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {user.client_type === 'insurance' ? '🛡️ Insurance' : '💼 HR'}
                  </span>
                </td>
                <td className="p-3 text-gray-300">₹{(user.balance_cents/100).toFixed(2)}</td>
                <td className="p-3 text-gray-300">
                  {user.google_sheet_url ? (
                    <span className="text-green-400 text-xs">✓ Connected</span>
                  ) : (
                    <span className="text-yellow-400 text-xs">⚠ Not Set</span>
                  )}
                </td>
                <td className="p-3">
                  <select 
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-white" 
                    value={statusEdits[user.id] ?? user.status ?? 'open'}
                    onChange={e => setStatusEdits(prev => ({ ...prev, [user.id]: e.target.value }))}
                  >
                    <option value="open">Open</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>
                <td className="p-3 space-x-2">
                  <button 
                    onClick={() => updateUser.mutate({ id: user.id, status: statusEdits[user.id] ?? user.status ?? 'open' })}
                    className="text-blue-400 hover:underline"
                  >
                    Save
                  </button>
                  <button 
                    onClick={async () => {
                      if (!confirm('Permanently delete this client and all their data?')) return
                      try {
                        await api.delete(`/api/admin/users/${user.id}`)
                        qc.invalidateQueries({ queryKey: ['admin','users'] })
                      } catch(e: any) {
                        alert(e?.response?.data?.message || 'Delete failed')
                      }
                    }}
                    className="text-red-400 hover:underline"
                  >
                    Delete
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min={1} 
                      step={1} 
                      placeholder="₹" 
                      className="bg-slate-700 border border-slate-600 rounded px-2 py-1 w-20 text-white" 
                      id={`amt_${user.id}`} 
                    />
                    <button 
                      className="text-green-400 hover:underline" 
                      onClick={async () => {
                        const el = document.getElementById(`amt_${user.id}`) as HTMLInputElement
                        const amount = parseFloat(el.value || '0')
                        if (!amount || amount <= 0) return alert('Enter amount')
                        try {
                          await api.post(`/api/admin/users/${user.id}/recharge`, { amount_cents: Math.round(amount * 100) })
                          el.value = ''
                          qc.invalidateQueries({ queryKey: ['admin','users'] })
                          alert('Recharged')
                        } catch(e: any) {
                          alert(e?.response?.data?.message || 'Recharge failed')
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}