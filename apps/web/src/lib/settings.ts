import { createContext, useContext } from 'react'
import type { PublicSettings } from './types'

export const DEFAULT_SETTINGS: PublicSettings = {
  siteName: '스포츠 커뮤니티',
  noticeBanner: '',
  signupEnabled: true,
  postApprovalRequired: false,
  bestThreshold: 5,
  freeTags: [],
  matchTags: [],
  humorTags: [],
  reviewTags: [],
  newsTags: [],
}

export function withSettingsDefaults(value?: Partial<PublicSettings> | null): PublicSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...value,
    noticeBanner: value?.noticeBanner ?? DEFAULT_SETTINGS.noticeBanner,
    freeTags: value?.freeTags ?? DEFAULT_SETTINGS.freeTags,
    matchTags: value?.matchTags ?? DEFAULT_SETTINGS.matchTags,
    humorTags: value?.humorTags ?? DEFAULT_SETTINGS.humorTags,
    reviewTags: value?.reviewTags ?? DEFAULT_SETTINGS.reviewTags,
    newsTags: value?.newsTags ?? DEFAULT_SETTINGS.newsTags,
    bestThreshold: value?.bestThreshold ?? DEFAULT_SETTINGS.bestThreshold,
  }
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
