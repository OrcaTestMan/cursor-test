import { createContext, useContext } from 'react'
import type { User } from './types'

export type SignupInput = { username: string; nickname: string; password: string }

export type AuthValue = {
  user: User | null
  loading: boolean
  unreadCount: number
  login: (username: string, password: string) => Promise<User>
  signup: (input: SignupInput) => Promise<User>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  refreshUnread: () => void
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider 안에서만 쓸 수 있습니다.')
  return value
}
