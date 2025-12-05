import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [warningMessage, setWarningMessage] = useState('')
  const navigate = useNavigate()
  const location = useLocation() as any

  async function onSubmit(e: React.FormEvent, forceLogin = false) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password, forceLogin)
      const dest = location.state?.from?.pathname || '/'
      navigate(dest, { replace: true })
    } catch (err: any) {
      if (err?.response?.status === 409 && err?.response?.data?.requiresConfirmation) {
        setWarningMessage(err.response.data.message)
        setShowWarning(true)
        setLoading(false)
        return
      }
      const apiErr = err?.response?.data?.error
      const netErr = err?.message && !err?.response ? 'API unavailable. Please ensure the backend is running at ' + (import.meta.env.VITE_API_URL || 'http://localhost:5000') : null
      setError(apiErr || netErr || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  function handleForceLogin(e: React.FormEvent) {
    setShowWarning(false)
    onSubmit(e, true)
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div className="app-bg" />
      <div className="grid-overlay" />
      <form onSubmit={onSubmit} className="w-full max-w-md card p-6 space-y-4 relative z-10">
        <h1 className="text-xl font-semibold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Dashboard Login</h1>
        {error && <div className="text-sm text-red-400">{error}</div>}
        {showWarning && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 space-y-3">
            <p className="text-sm text-yellow-200">{warningMessage}</p>
            <div className="flex gap-2">
              <Button type="button" onClick={handleForceLogin} className="flex-1 bg-yellow-600 hover:bg-yellow-700">
                Continue
              </Button>
              <Button type="button" onClick={() => setShowWarning(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}
        <div className="space-y-1">
          <label className="block text-sm text-slate-300">Email</label>
          <Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <label className="block text-sm text-slate-300">Password</label>
          <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
        <p className="text-xs text-slate-400 text-center">Use your admin or client credentials</p>
      </form>
    </div>
  )
}
