import { createContext, useContext } from 'react'
import type { PublicSettings } from './types'

export const DEFAULT_SETTINGS: PublicSettings = {
  siteName: '스포츠 커뮤니티',
  noticeBanner: '',
  signupEnabled: true,
  postApprovalRequired: false,
}

export type SettingsValue = {
  settings: PublicSettings
  loading: boolean
  error: string | null
  reload: () => void
}

export const SettingsContext = createContext<SettingsValue | null>(null)

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext)
  if (!value) throw new Error('SettingsProvider 안에서만 쓸 수 있습니다.')
  return value
}
