import { useState, type FormEvent, type ReactNode } from 'react'
import { Empty, ErrorBox, Loading } from '../components/StatusViews'
import { apiFetch, errorMessage, useApi } from '../lib/api'
import { STATUS_LABELS, formatDateTime, formatTime, isDay, todayKst, toPositiveInt } from '../lib/format'
import type { League, Match, MatchStatus } from '../lib/types'

const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm'
const buttonClass = 'rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50'
const STATUSES = Object.keys(STATUS_LABELS) as MatchStatus[]

type LeaguesState = {
  data?: League[]
  error?: string
  loading: boolean
  reload: () => void
}

export default function AdminPage() {
  const leagues = useApi<League[]>('/leagues')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">관리</h1>
        <p className="mt-1 text-sm text-gray-500">로그인과 권한은 아직 없는 뼈대 화면입니다.</p>
      </div>
      <LeagueSection leagues={leagues} />
      <MatchCreateSection leagues={leagues} />
      <ResultSection />
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-gray-700">{label}</span>
      {children}
    </label>
  )
}

function LeagueSection({ leagues }: { leagues: LeaguesState }) {
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setDone(null)
    if (!name.trim()) return setError('리그 이름을 입력해 주세요.')
    if (name.length > 50) return setError('리그 이름은 50자 이하로 입력해 주세요.')
    if (!sport.trim()) return setError('종목을 입력해 주세요.')
    if (sport.length > 20) return setError('종목은 20자 이하로 입력해 주세요.')
    setSubmitting(true)
    setError(null)
    try {
      const league = await apiFetch<League>('/leagues', {
        method: 'POST',
        body: { name: name.trim(), sport: sport.trim() },
      })
      setDone(`'${league.name}' 리그를 등록했습니다.`)
      setName('')
      setSport('')
      leagues.reload()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Section title="리그 등록">
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="리그 이름">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} className={inputClass} />
        </Field>
        <Field label="종목">
          <input
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            maxLength={20}
            placeholder="예: 축구"
            className={inputClass}
          />
        </Field>
        <button type="submit" disabled={submitting} className={buttonClass}>
          {submitting ? '등록 중...' : '리그 등록'}
        </button>
      </form>
      {error && <ErrorBox message={error} />}
      {done && <p className="text-sm text-green-700">{done}</p>}

      <h3 className="pt-2 text-sm font-semibold text-gray-700">현재 리그</h3>
      {leagues.loading && <Loading />}
      {leagues.error && <ErrorBox message={leagues.error} onRetry={leagues.reload} />}
      {leagues.data &&
        (leagues.data.length === 0 ? (
          <Empty text="등록된 리그가 없습니다." />
        ) : (
          <ul className="divide-y divide-gray-100 rounded border border-gray-100 text-sm">
            {leagues.data.map((league) => (
              <li key={league.id} className="flex justify-between px-3 py-2">
                <span>{league.name}</span>
                <span className="text-gray-500">{league.sport}</span>
              </li>
            ))}
          </ul>
        ))}
    </Section>
  )
}

function MatchCreateSection({ leagues }: { leagues: LeaguesState }) {
  const [leagueId, setLeagueId] = useState('')
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [kickoff, setKickoff] = useState('')
  const [venue, setVenue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setDone(null)
    const league = toPositiveInt(leagueId)
    if (league === null) return setError('리그를 선택해 주세요.')
    if (!homeTeam.trim() || !awayTeam.trim()) return setError('홈 팀과 원정 팀을 입력해 주세요.')
    if (homeTeam.length > 50 || awayTeam.length > 50) return setError('팀 이름은 50자 이하로 입력해 주세요.')
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(kickoff)) return setError('경기 시작 시각을 입력해 주세요.')
    if (venue.length > 100) return setError('장소는 100자 이하로 입력해 주세요.')
    setSubmitting(true)
    setError(null)
    try {
      const match = await apiFetch<Match>('/matches', {
        method: 'POST',
        body: {
          leagueId: league,
          homeTeam: homeTeam.trim(),
          awayTeam: awayTeam.trim(),
          kickoffAt: `${kickoff}:00+09:00`,
          ...(venue.trim() ? { venue: venue.trim() } : {}),
        },
      })
      setDone(`${match.homeTeam} vs ${match.awayTeam} (${formatDateTime(match.kickoffAt)}) 경기를 등록했습니다.`)
      setHomeTeam('')
      setAwayTeam('')
      setVenue('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Section title="경기 등록">
      {leagues.loading && <Loading text="리그 목록을 불러오는 중..." />}
      {leagues.error && <ErrorBox message={leagues.error} onRetry={leagues.reload} />}
      {leagues.data && leagues.data.length === 0 && <Empty text="먼저 리그를 등록해 주세요." />}
      {leagues.data && leagues.data.length > 0 && (
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <Field label="리그">
            <select value={leagueId} onChange={(e) => setLeagueId(e.target.value)} className={inputClass}>
              <option value="">선택</option>
              {leagues.data.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="시작 시각 (한국 시간)">
            <input
              type="datetime-local"
              value={kickoff}
              onChange={(e) => setKickoff(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="홈 팀">
            <input value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} maxLength={50} className={inputClass} />
          </Field>
          <Field label="원정 팀">
            <input value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} maxLength={50} className={inputClass} />
          </Field>
          <Field label="장소 (선택)">
            <input value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={100} className={inputClass} />
          </Field>
          <div className="flex items-end">
            <button type="submit" disabled={submitting} className={`${buttonClass} w-full`}>
              {submitting ? '등록 중...' : '경기 등록'}
            </button>
          </div>
        </form>
      )}
      {error && <ErrorBox message={error} />}
      {done && <p className="text-sm text-green-700">{done}</p>}
    </Section>
  )
}

function ResultSection() {
  const [date, setDate] = useState(todayKst())
  const matches = useApi<Match[]>(`/matches?date=${date}`)

  return (
    <Section title="경기 결과 입력">
      <Field label="날짜">
        <input
          type="date"
          value={date}
          onChange={(e) => {
            if (isDay(e.target.value)) setDate(e.target.value)
          }}
          className={`${inputClass} sm:w-48`}
        />
      </Field>
      {matches.loading && <Loading />}
      {matches.error && <ErrorBox message={matches.error} onRetry={matches.reload} />}
      {matches.data &&
        (matches.data.length === 0 ? (
          <Empty text="이 날짜에 경기가 없습니다." />
        ) : (
          <ul className="divide-y divide-gray-100 rounded border border-gray-100">
            {matches.data.map((match) => (
              <ResultRow key={match.id} initial={match} />
            ))}
          </ul>
        ))}
    </Section>
  )
}

function parseScore(value: string): number | null | 'invalid' {
  if (value.trim() === '') return null
  if (!/^\d+$/.test(value.trim())) return 'invalid'
  const n = Number(value)
  return n <= 999 ? n : 'invalid'
}

function ResultRow({ initial }: { initial: Match }) {
  const [match, setMatch] = useState(initial)
  const [status, setStatus] = useState<MatchStatus>(initial.status)
  const [home, setHome] = useState(initial.homeScore?.toString() ?? '')
  const [away, setAway] = useState(initial.awayScore?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaved(false)
    const homeScore = parseScore(home)
    const awayScore = parseScore(away)
    if (homeScore === 'invalid' || awayScore === 'invalid') return setError('점수는 0~999 사이 정수로 입력해 주세요.')
    setSaving(true)
    setError(null)
    try {
      const updated = await apiFetch<Match>(`/matches/${match.id}`, {
        method: 'PATCH',
        body: {
          status,
          ...(homeScore === null ? {} : { homeScore }),
          ...(awayScore === null ? {} : { awayScore }),
        },
      })
      setMatch(updated)
      setStatus(updated.status)
      setHome(updated.homeScore?.toString() ?? '')
      setAway(updated.awayScore?.toString() ?? '')
      setSaved(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const scoreInputClass = 'w-16 rounded border border-gray-300 px-2 py-1.5 text-center text-sm'

  return (
    <li className="space-y-2 px-3 py-3 text-sm">
      <div className="flex flex-wrap gap-x-3 text-gray-700">
        <span className="font-mono text-gray-500">{formatTime(match.kickoffAt)}</span>
        <span className="text-xs text-gray-500">{match.leagueName}</span>
        <span className="font-medium">
          {match.homeTeam} vs {match.awayTeam}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => {
            const next = STATUSES.find((s) => s === e.target.value)
            if (next) setStatus(next)
          }}
          className="rounded border border-gray-300 px-2 py-1.5 text-sm"
          aria-label="상태"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          max={999}
          value={home}
          onChange={(e) => setHome(e.target.value)}
          className={scoreInputClass}
          aria-label="홈 점수"
        />
        <span>:</span>
        <input
          type="number"
          min={0}
          max={999}
          value={away}
          onChange={(e) => setAway(e.target.value)}
          className={scoreInputClass}
          aria-label="원정 점수"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
        {saved && <span className="text-xs text-green-700">저장했습니다.</span>}
      </div>
      {error && <ErrorBox message={error} />}
    </li>
  )
}
