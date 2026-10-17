import { useSearchParams } from 'react-router'
import MatchList from '../components/MatchList'
import { Empty, ErrorBox, Loading } from '../components/StatusViews'
import { useApi } from '../lib/api'
import { addDays, formatDayLabel, isDay, todayKst, toPositiveInt } from '../lib/format'
import type { League, Match } from '../lib/types'

export default function MatchesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = todayKst()
  const dateParam = searchParams.get('date')
  const date = isDay(dateParam) ? dateParam : today
  const leagueId = toPositiveInt(searchParams.get('leagueId'))

  const leagues = useApi<League[]>('/leagues')
  const query = new URLSearchParams({ date })
  if (leagueId !== null) query.set('leagueId', String(leagueId))
  const matches = useApi<Match[]>(`/matches?${query.toString()}`)

  const update = (nextDate: string, nextLeagueId: number | null) => {
    const next = new URLSearchParams({ date: nextDate })
    if (nextLeagueId !== null) next.set('leagueId', String(nextLeagueId))
    setSearchParams(next)
  }

  const buttonClass = 'rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-100'

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">경기 일정</h1>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass} onClick={() => update(addDays(date, -1), leagueId)}>
          이전 날
        </button>
        <button type="button" className={buttonClass} onClick={() => update(today, leagueId)}>
          오늘
        </button>
        <button type="button" className={buttonClass} onClick={() => update(addDays(date, 1), leagueId)}>
          다음 날
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            if (isDay(e.target.value)) update(e.target.value, leagueId)
          }}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
          aria-label="날짜 선택"
        />
        <select
          value={leagueId ?? ''}
          onChange={(e) => update(date, toPositiveInt(e.target.value))}
          className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
          aria-label="리그 선택"
          disabled={!leagues.data}
        >
          <option value="">전체</option>
          {leagues.data?.map((league) => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </select>
      </div>
      {leagues.loading && <p className="text-xs text-gray-500">리그 목록을 불러오는 중...</p>}
      {leagues.error && <ErrorBox message={`리그 목록을 불러오지 못했습니다.\n${leagues.error}`} onRetry={leagues.reload} />}

      <h2 className="text-sm font-semibold text-gray-700">{formatDayLabel(date)}</h2>
      {matches.loading && <Loading />}
      {matches.error && <ErrorBox message={matches.error} onRetry={matches.reload} />}
      {matches.data &&
        (matches.data.length === 0 ? (
          <Empty text="이 날짜에 경기가 없습니다." />
        ) : (
          <MatchList matches={matches.data} />
        ))}
    </div>
  )
}
