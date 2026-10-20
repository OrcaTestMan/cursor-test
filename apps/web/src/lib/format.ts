import type {
  Category,
  ContentStatus,
  InquiryStatus,
  Match,
  MatchStatus,
  NotificationType,
  PredictionPick,
  ReportReason,
  Role,
  SearchType,
  UserStatus,
} from './types'

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
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, date] = value.split('-').map(Number)
  const utc = new Date(Date.UTC(year, month - 1, date))
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === date
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
  humor: '유머',
  review: '직관·후기',
  news: '뉴스·소식',
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
  deleted: '탈퇴',
}

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  abuse: '욕설·비방',
  obscene: '음란',
  spam: '광고·도배',
  privacy: '개인정보 노출',
  etc: '기타',
}

export const PICK_LABELS: Record<PredictionPick, string> = {
  home: '홈 승',
  draw: '무승부',
  away: '원정 승',
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  comment: '댓글',
  reply: '답글',
  inquiry_answer: '문의 답변',
  message: '쪽지',
  report_result: '신고 결과',
  mention: '멘션',
  subscribe: '구독',
  follow: '팔로우',
}

export const PREDICTION_RESULT_LABELS: Record<'hit' | 'miss' | 'pending', string> = {
  hit: '적중',
  miss: '미적중',
  pending: '대기',
}

export const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  title: '제목',
  title_body: '제목+내용',
  author: '글쓴이',
}

export function isSearchType(value: string | null): value is SearchType {
  return value === 'title' || value === 'title_body' || value === 'author'
}

/** `방금 전`, `5분 전`, `3시간 전`, `2일 전`, 그보다 오래되면 날짜 */
export function formatRelative(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}시간 전`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day}일 전`
  return formatDate(iso)
}

/** 승률 0~1 → `.625`, 1이면 `1.000` */
export function formatWinRate(rate: number): string {
  const text = rate.toFixed(3)
  return text.startsWith('0') ? text.slice(1) : text
}

/** 금칙어 오류 메시지(`... 포함되어 있습니다: "단어"`)에서 단어를 꺼낸다 */
export function forbiddenWordOf(message: string): string | null {
  const found = /사용할 수 없는 단어가 포함되어 있습니다: "(.+)"/.exec(message)
  return found ? found[1] : null
}

/** 띄어쓰기와 대소문자를 무시하고 단어가 들어 있는지 본다 (서버 금칙어 규칙과 같음) */
export function containsWord(text: string, word: string): boolean {
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase()
  const w = norm(word)
  return w.length > 0 && norm(text).includes(w)
}

/** 비율 계산. 합이 0이면 0 */
export function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

export function isCategory(value: string | undefined): value is Category {
  return value !== undefined && value in CATEGORY_LABELS
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

export function safeAdminNext(value: string | null): string {
  const next = safeNext(value)
  return next.startsWith('/admin') && !next.startsWith('/admin/login') ? next : '/admin'
}
