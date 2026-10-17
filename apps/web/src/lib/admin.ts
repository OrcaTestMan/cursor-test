import { useOutletContext } from 'react-router'

export type AdminOutletContext = { refreshCounts: () => void }

export function useAdminContext(): AdminOutletContext {
  return useOutletContext<AdminOutletContext>()
}
