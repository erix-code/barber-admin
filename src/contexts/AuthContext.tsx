import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, TOKEN_KEY } from '@/lib/api'
import type { LoginPayload, User } from '@/types/api'

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isAuthLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_KEY = 'barber_admin_user'

function readStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() =>
    localStorage.getItem(TOKEN_KEY) ? readStoredUser() : null,
  )
  const [isAuthLoading, setIsAuthLoading] = useState(false)

  const persist = useCallback((nextUser: User | null, token: string | null) => {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }, [])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const { data } = await api.post<{ user: User; token: string }>('/login', payload)
      persist(data.user, data.token)
    },
    [persist],
  )

  const logout = useCallback(async () => {
    try {
      await api.post('/logout')
    } catch {
      // token ya inválido: ignorar
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    setIsAuthLoading(true)
    try {
      const { data } = await api.get<{ user: User }>('/user')
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      setUser(data.user)
    } finally {
      setIsAuthLoading(false)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(localStorage.getItem(TOKEN_KEY)),
      isAuthLoading,
      login,
      logout,
      refreshUser,
    }),
    [user, isAuthLoading, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
