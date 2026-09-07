import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api'
import { AuthContext } from './context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('growfi_token')))

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem('growfi_token')) {
      setUser(null)
      return null
    }
    const { data } = await api.get('/api/auth/me')
    setUser(data.data.user)
    return data.data.user
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('growfi_token')) return
    void Promise.resolve().then(refreshUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [refreshUser])

  const value = useMemo(() => ({
    user,
    loading,
    refreshUser,
    async login(credentials) {
      const { data } = await api.post('/api/auth/login', credentials)
      localStorage.setItem('growfi_token', data.data.token)
      setUser(data.data.user)
    },
    async register(credentials) {
      const { data } = await api.post('/api/auth/register', credentials)
      localStorage.setItem('growfi_token', data.data.token)
      setUser(data.data.user)
    },
    async logout() {
      try { await api.post('/api/auth/logout') } finally {
        localStorage.removeItem('growfi_token')
        setUser(null)
      }
    },
  }), [loading, refreshUser, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
