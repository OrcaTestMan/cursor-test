import { useMemo, type ReactNode } from 'react'
import { useApi } from '../lib/api'
import { SettingsContext, withSettingsDefaults, type SettingsValue } from '../lib/settings'
import type { PublicSettings } from '../lib/types'

export default function SettingsProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, reload } = useApi<PublicSettings>('/settings/public')

  const value = useMemo<SettingsValue>(
    () => ({ settings: withSettingsDefaults(data), loading, error: error ?? null, reload }),
    [data, loading, error, reload],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
