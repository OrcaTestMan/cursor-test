import type { Category, ContentStatus, InquiryStatus, Match, MatchStatus, Role, UserStatus } from './types'

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

const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function kstParts(iso: string) {
  const parts: Record<string, string> = {}
  for (const part of partsFormat.formatToParts(new Date(iso))) parts[part.type] = part.value
  const hour = parts.hour === '24' ? '00' : parts.hour
  return { year: parts.year, month: parts.month, day: parts.day, hour, minute: parts.minute }
}

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso))
}

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

/** `10/17 21:26` 형태 (한국 시간) */
export function formatShort(iso: string): string {
  const p = kstParts(iso)
  return `${Number(p.month)}/${Number(p.day)} ${p.hour}:${p.minute}`
}

export function formatDate(iso: string): string {
  const p = kstParts(iso)
  return `${p.year}.${p.month}.${p.day}`
}

export function formatDayLabel(day: string): string {
  return dayLabelFormat.format(new Date(`${day}T00:00:00+09:00`))
}

export function todayKst(): string {
  const p = kstParts(new Date().toISOString())
  return `${p.year}-${p.month}-${p.day}`
}

export function isDay(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
}

export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

/** ISO(UTC) → `datetime-local` 입력값(한국 시간) */
export function toKstInput(iso: string): string {
  const p = kstParts(iso)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

/** `datetime-local` 입력값(한국 시간) → ISO(UTC) */
export function fromKstInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const date = new Date(`${value}:00+09:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

export function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR')
}

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: '예정',
  live: '라이브',
  finished: '종료',
  postponed: '연기',
  cancelled: '취소',
}

export const CATEGORY_LABELS: Record<Category, string> = {
  notice: '공지사항',
  free: '자유게시판',
  match: '경기 이야기',
}

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  pending: '승인 대기',
  visible: '노출',
  hidden: '숨김',
}

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  waiting: '답변 대기',
  answered: '답변 완료',
}

export const ROLE_LABELS: Record<Role, string> = {
  user: '일반 회원',
  admin: '관리자',
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: '활성',
  blocked: '차단',
}

export function isCategory(value: string | undefined): value is Category {
  return value === 'notice' || value === 'free' || value === 'match'
}

export function isMatchStatus(value: string | null): value is MatchStatus {
  return value !== null && value in MATCH_STATUS_LABELS
}

export function hasScore(match: Pick<Match, 'homeScore' | 'awayScore'>): boolean {
  return typeof match.homeScore === 'number' && typeof match.awayScore === 'number'
}

export function scoreText(match: Pick<Match, 'homeScore' | 'awayScore'>): string {
  return hasScore(match) ? `${match.homeScore} : ${match.awayScore}` : 'VS'
}

export function toPositiveInt(value: string | null | undefined): number | null {
  if (value === null || value === undefined || !/^\d+$/.test(value)) return null
  const n = Number(value)
  return n > 0 ? n : null
}

export function groupByLeague(matches: Match[]): { league: string; matches: Match[] }[] {
  const groups: { league: string; matches: Match[] }[] = []
  for (const match of matches) {
    const group = groups.find((g) => g.league === match.leagueName)
    if (group) group.matches.push(match)
    else groups.push({ league: match.leagueName, matches: [match] })
  }
  return groups
}

export const PAGE_SIZES = [20, 50, 100] as const

export function toPageSize(value: string | null): number {
  const n = Number(value)
  return n === 50 || n === 100 ? n : 20
}

export function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}
