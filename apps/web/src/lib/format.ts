import type { Category, Match, MatchStatus } from './types'

const TIME_ZONE = 'Asia/Seoul'

const dateTimeFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const timeFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dayLabelFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})

const isoDayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso))
}

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

export function formatDayLabel(day: string): string {
  return dayLabelFormat.format(new Date(`${day}T00:00:00+09:00`))
}

export function todayKst(): string {
  return isoDayFormat.format(new Date())
}

export function isDay(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

export const STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: '예정',
  live: '진행 중',
  finished: '종료',
  postponed: '연기',
  cancelled: '취소',
}

export const CATEGORY_LABELS: Record<Category, string> = {
  free: '자유',
  match: '경기 이야기',
}

export function scoreText(match: Pick<Match, 'homeScore' | 'awayScore'>): string {
  return typeof match.homeScore === 'number' && typeof match.awayScore === 'number'
    ? `${match.homeScore} : ${match.awayScore}`
    : 'vs'
}

export function toPositiveInt(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null
  const n = Number(value)
  return n > 0 ? n : null
}
