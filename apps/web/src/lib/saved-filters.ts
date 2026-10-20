import type { DateRangeMode } from './list-query'

export type SavedFilter = {
  id: string
  name: string
  page: string
  relative: boolean
  createdAt: number
  params: Record<string, string>
}

function storageKey(userId: number, page: string) {
  return `saved-filters:${userId}:${page}`
}

export function loadSavedFilters(userId: number, page: string): SavedFilter[] {
  try {
    const raw = localStorage.getItem(storageKey(userId, page))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as SavedFilter[]) : []
  } catch {
    return []
  }
}

export function saveFilter(userId: number, page: string, name: string, params: Record<string, string>, relative: boolean) {
  const items = loadSavedFilters(userId, page)
  const next: SavedFilter = {
    id: `${Date.now()}`,
    name,
    page,
    relative,
    createdAt: Date.now(),
    params,
  }
  const saved = [next, ...items].slice(0, 20)
  localStorage.setItem(storageKey(userId, page), JSON.stringify(saved))
  return saved
}

export function removeSavedFilter(userId: number, page: string, id: string) {
  const saved = loadSavedFilters(userId, page).filter((item) => item.id !== id)
  localStorage.setItem(storageKey(userId, page), JSON.stringify(saved))
  return saved
}

export function paramsFromSearch(search: string): Record<string, string> {
  const params = new URLSearchParams(search)
  const out: Record<string, string> = {}
  params.forEach((value, key) => {
    if (key !== 'page') out[key] = value
  })
  return out
}

export function isRelativeRange(range: DateRangeMode | string | null) {
  return range === 'today' || range === 'all' || !range
}
