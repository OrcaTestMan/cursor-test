import { addDays, isDay, todayKst } from './format'

export type DateRangeMode = 'today' | 'custom' | 'all'

export type DateFilter = {
  q: string
  range: DateRangeMode
  from: string
  to: string
}

export function emptyDateFilter(): DateFilter {
  const today = todayKst()
  return { q: '', range: 'today', from: today, to: today }
}

export function inspectDateFilter(params: URLSearchParams, fallback: DateRangeMode = 'today') {
  const rangeRaw = params.get('range')
  const fromRaw = params.get('from')
  const toRaw = params.get('to')
  const dateRaw = params.get('date')
  const badRange = Boolean(rangeRaw) && rangeRaw !== 'today' && rangeRaw !== 'custom' && rangeRaw !== 'all'
  const badFrom = Boolean(fromRaw) && !isDay(fromRaw)
  const badTo = Boolean(toRaw) && !isDay(toRaw)
  const badDate = Boolean(dateRaw) && !isDay(dateRaw)
  const reversed = Boolean(fromRaw && toRaw && isDay(fromRaw) && isDay(toRaw) && fromRaw > toRaw)
  const customIncomplete = rangeRaw === 'custom' && !(isDay(fromRaw) && isDay(toRaw))
  const filter = parseDateFilter(params, fallback)
  if (!(badRange || badFrom || badTo || badDate || reversed || customIncomplete)) {
    return { filter, notice: null as string | null, patch: null as Record<string, string | null> | null }
  }
  const reasons: string[] = []
  if (badFrom || badTo || badDate) reasons.push('달력에 없는 날짜')
  if (reversed) reasons.push('시작일이 종료일보다 늦은 기간')
  if (badRange) reasons.push('올바르지 않은 기간 값')
  if (customIncomplete && !badFrom && !badTo) reasons.push('비어 있는 직접 지정 기간')
  const label = fallback === 'all' ? '전체기간' : '오늘'
  return {
    filter,
    notice: `잘못된 기간(${reasons.join(', ')})을 ${label}로 바꿨습니다. 검색어는 그대로입니다.`,
    patch: serializeDateFilter(filter),
  }
}

export function parseOptionalInt(value: string) {
  const text = value.trim()
  if (!text) return null
  if (!/^\d+$/.test(text)) return 'invalid' as const
  return Number(text)
}

export function optionalIntError(value: string, label: string) {
  if (parseOptionalInt(value) === 'invalid') return `${label}는 0 이상의 정수만 입력하세요.`
  return null
}

export function integerRangeError(minRaw: string, maxRaw: string, minLabel: string, maxLabel: string) {
  const min = parseOptionalInt(minRaw)
  const max = parseOptionalInt(maxRaw)
  if (min === 'invalid' || max === 'invalid') return `${minLabel}·${maxLabel}는 0 이상의 정수만 입력하세요.`
  if (typeof min === 'number' && typeof max === 'number' && min > max) return `${minLabel}가 ${maxLabel}보다 클 수 없습니다.`
  return null
}

export function inspectIntFilters(
  params: URLSearchParams,
  keys: string[] = [],
  pairs: Array<[string, string]> = [],
) {
  const patch: Record<string, string | null> = {}
  const reasons: string[] = []
  for (const key of keys) {
    const raw = params.get(key)
    if (raw && parseOptionalInt(raw) === 'invalid') {
      patch[key] = null
      reasons.push('올바르지 않은 숫자')
    }
  }
  for (const [minKey, maxKey] of pairs) {
    const min = parseOptionalInt(params.get(minKey) ?? '')
    const max = parseOptionalInt(params.get(maxKey) ?? '')
    if (typeof min === 'number' && typeof max === 'number' && min > max) {
      patch[minKey] = null
      patch[maxKey] = null
      reasons.push('최소값이 최대값보다 큰 범위')
    }
  }
  if (Object.keys(patch).length === 0) {
    return { notice: null as string | null, patch: null as Record<string, string | null> | null }
  }
  return {
    notice: `${[...new Set(reasons)].join(', ')}를 지웠습니다. 검색어는 그대로입니다.`,
    patch,
  }
}

export function parseDateFilter(params: URLSearchParams, fallback: DateRangeMode = 'today'): DateFilter {
  const today = todayKst()
  const q = (params.get('q') ?? '').trim()
  const rangeParam = params.get('range')
  const fromParam = params.get('from')
  const toParam = params.get('to')
  const dateParam = params.get('date')
  let range: DateRangeMode = fallback
  let from = isDay(fromParam) ? fromParam : ''
  let to = isDay(toParam) ? toParam : ''
  if (rangeParam === 'all' || rangeParam === 'custom' || rangeParam === 'today') {
    range = rangeParam
  } else if (from || to || isDay(dateParam)) {
    range = 'custom'
  }
  if (!from && !to && isDay(dateParam)) {
    from = dateParam
    to = dateParam
  }
  if (range === 'today') {
    return { q, range, from: today, to: today }
  }
  if (range === 'all') {
    return { q, range, from: today, to: today }
  }
  if (!from && to) from = to
  if (!to && from) to = from
  if (!from || !to || from > to) {
    if (fallback === 'all') return { q, range: 'all', from: today, to: today }
    return { q, range: 'today', from: today, to: today }
  }
  return { q, range: 'custom', from, to }
}

export function serializeDateFilter(filter: DateFilter): Record<string, string | null> {
  const q = filter.q.trim() || null
  if (filter.range === 'all') return { q, range: 'all', from: null, to: null, date: null }
  if (filter.range === 'today') return { q, range: 'today', from: null, to: null, date: null }
  return { q, range: 'custom', from: filter.from, to: filter.to, date: null }
}

export function dateFilterQuery(filter: DateFilter): Record<string, string | null> {
  const q = filter.q.trim() || null
  if (filter.range === 'all') return { q, range: 'all', from: null, to: null }
  if (filter.range === 'today') return { q, range: 'today', from: null, to: null }
  return { q, range: 'custom', from: filter.from, to: filter.to }
}

export function dateFiltersEqual(a: DateFilter, b: DateFilter) {
  return a.q === b.q && a.range === b.range && (a.range !== 'custom' || (a.from === b.from && a.to === b.to))
}

export type QuickRange = 'today' | 'yesterday' | 'week' | 'd7' | 'd30' | 'month' | 'all'

export function weekStartKst(day = todayKst()) {
  const [year, month, date] = day.split('-').map(Number)
  const weekday = new Date(Date.UTC(year, month - 1, date)).getUTCDay()
  return addDays(day, -((weekday + 6) % 7))
}

export function applyQuickRange(kind: QuickRange, q = ''): DateFilter {
  const today = todayKst()
  if (kind === 'all') return { q, range: 'all', from: today, to: today }
  if (kind === 'today') return { q, range: 'today', from: today, to: today }
  if (kind === 'yesterday') {
    const day = addDays(today, -1)
    return { q, range: 'custom', from: day, to: day }
  }
  if (kind === 'week') return { q, range: 'custom', from: weekStartKst(today), to: today }
  if (kind === 'd7') return { q, range: 'custom', from: addDays(today, -6), to: today }
  if (kind === 'd30') return { q, range: 'custom', from: addDays(today, -29), to: today }
  const month = `${today.slice(0, 8)}01`
  return { q, range: 'custom', from: month, to: today }
}

export function quickRangeOf(filter: DateFilter): QuickRange | null {
  if (filter.range === 'all') return 'all'
  if (filter.range === 'today') return 'today'
  const today = todayKst()
  if (filter.from === addDays(today, -1) && filter.to === addDays(today, -1)) return 'yesterday'
  if (filter.from === weekStartKst(today) && filter.to === today) return 'week'
  if (filter.from === addDays(today, -6) && filter.to === today) return 'd7'
  if (filter.from === addDays(today, -29) && filter.to === today) return 'd30'
  if (filter.from === `${today.slice(0, 8)}01` && filter.to === today) return 'month'
  return null
}

export function formatRangeLabel(filter: DateFilter) {
  if (filter.range === 'all') return '전체기간'
  if (filter.range === 'today') return `${dotDate(todayKst())} ~ ${dotDate(todayKst())}`
  return `${dotDate(filter.from)} ~ ${dotDate(filter.to)}`
}

function dotDate(day: string) {
  return day.replaceAll('-', '.')
}

export function resultCountText(total: number, page: number, pageSize: number, unit: string) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)
  return `검색 결과 ${total.toLocaleString('ko-KR')}${unit} 중 ${start.toLocaleString('ko-KR')}–${end.toLocaleString('ko-KR')}${unit} 표시`
}

export function withToday(filter: DateFilter): DateFilter {
  const empty = emptyDateFilter()
  return { q: filter.q, range: 'today', from: empty.from, to: empty.to }
}

export function withAllPeriod(filter: DateFilter): DateFilter {
  const empty = emptyDateFilter()
  return { q: filter.q, range: 'all', from: empty.from, to: empty.to }
}

export function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => !!value))].sort((a, b) => a.localeCompare(b, 'ko'))
}

export function asPaged<T>(data: PagedLike<T> | T[] | undefined): { items: T[]; total: number } | null {
  if (!data) return null
  if (Array.isArray(data)) return { items: data, total: data.length }
  return { items: data.items, total: data.total }
}

type PagedLike<T> = { items: T[]; total: number }
