import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api, setToken as persistToken, getToken } from '../lib/api'

export type User = {
  id: number
  email: string
  name: string | null
  role: 'admin' | 'client'
  client_type?: 'hr' | 'insurance'
  balance?: number
  isLowBalance?: boolean
  mustChangePassword?: boolean
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (email: string, password: string, forceLogin?: boolean) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) { setLoading(false); return }
    api.get('/api/auth/me')
      .then(res => setUser(res.data))
      .catch(err => {
        console.error('Auth check failed:', err)
        persistToken(null)
      })
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string, forceLogin = false) {
    try {
      const res = await api.post('/api/auth/login', { email, password, forceLogin })
      persistToken(res.data.token)
      setUser(res.data.user)
    } catch (err) {
      console.error('Login failed:', err)
      throw err
    }
  }

  async function logout() {
    persistToken(null)
    setUser(null)
    try {
      await api.post('/api/auth/logout')
    } catch (err) {
      console.error('Logout API call failed:', err)
    }
    window.location.href = '/login'
  }

  async function refreshMe() {
    try {
      const res = await api.get('/api/auth/me')
      setUser(res.data)
    } catch (err) {
      console.error('Refresh user failed:', err)
      persistToken(null)
      setUser(null)
    }
  }

  const value = useMemo(() => ({ user, loading, login, logout, refreshMe }), [user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
