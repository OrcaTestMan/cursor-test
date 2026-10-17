import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiFetch } from '../lib/api'
import { AuthContext, type AuthValue, type SignupInput } from '../lib/auth'
import type { MessageList, User } from '../lib/types'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadVersion, setUnreadVersion] = useState(0)

  const refresh = useCallback(async () => {
    try {
      setUser(await apiFetch<User>('/auth/me'))
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    apiFetch<User>('/auth/me')
      .then(
        (me) => {
          if (!cancelled) setUser(me)
        },
        () => {
          if (!cancelled) setUser(null)
        },
      )
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const userId = user?.id ?? null
  useEffect(() => {
    if (userId === null) return
    let cancelled = false
    apiFetch<MessageList>('/messages?page=1&pageSize=20').then(
      (data) => {
        if (!cancelled) setUnreadCount(data.unreadCount)
      },
      () => {
        if (!cancelled) setUnreadCount(0)
      },
    )
    return () => {
      cancelled = true
    }
  }, [userId, unreadVersion])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      unreadCount: user ? unreadCount : 0,
      login: async (username, password) => {
        const next = await apiFetch<User>('/auth/login', { method: 'POST', body: { username, password } })
        setUser(next)
        return next
      },
      signup: async (input: SignupInput) => {
        const next = await apiFetch<User>('/auth/signup', { method: 'POST', body: input })
        setUser(next)
        return next
      },
      logout: async () => {
        try {
          await apiFetch<void>('/auth/logout', { method: 'POST' })
        } finally {
          setUser(null)
          setUnreadCount(0)
        }
      },
      refresh,
      refreshUnread: () => setUnreadVersion((v) => v + 1),
    }),
    [user, loading, unreadCount, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
