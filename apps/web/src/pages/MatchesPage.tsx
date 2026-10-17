import { useSearchParams } from 'react-router'
import { IconCalendar, IconChevronLeft, IconChevronRight } from '../components/icons'
import { MatchRow } from '../components/matches'
import { EmptyState, ErrorBox, Loading, PageHeader, SegmentedTabs, type TabItem } from '../components/ui'
import { buildQuery, useApi } from '../lib/api'
import { addDays, formatDayLabel, groupByLeague, isDay, isMatchStatus, MATCH_STATUS_LABELS, todayKst, toPositiveInt } from '../lib/format'
import { btnSecondary, inputCls } from '../lib/styles'
import type { League, Match, MatchStatus } from '../lib/types'

type StatusTab = MatchStatus | 'all'

const STATUS_TABS: TabItem<StatusTab>[] = [
  { value: 'all', label: '전체' },
  ...(Object.keys(MATCH_STATUS_LABELS) as MatchStatus[]).map((s) => ({ value: s, label: MATCH_STATUS_LABELS[s] })),
]

export default function MatchesPage() {
  const [params, setParams] = useSearchParams()
  const today = todayKst()
  const dateParam = params.get('date')
  const date = isDay(dateParam) ? dateParam : today
  const leagueId = toPositiveInt(params.get('leagueId'))
  const statusParam = params.get('status')
  const status: StatusTab = isMatchStatus(statusParam) ? statusParam : 'all'

  const leagues = useApi<League[]>('/leagues')
  const matches = useApi<Match[]>(
    `/matches${buildQuery({ date, leagueId, status: status === 'all' ? null : status })}`,
  )

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    setParams(next, { replace: true })
  }

  const chip = (active: boolean) =>
    `h-8 rounded-full border px-3 text-xs font-semibold transition-colors ${
      active ? 'border-accent/50 bg-accent-soft text-accent' : 'border-edge bg-card text-dim hover:text-fg'
    }`

  return (
    <div>
      <PageHeader icon={<IconCalendar size={20} />} title="경기 일정" subtitle={formatDayLabel(date)} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => update({ date: addDays(date, -1) })} className={btnSecondary} aria-label="전날">
          <IconChevronLeft /> 전날
        </button>
        <button
          type="button"
          onClick={() => update({ date: null })}
          className={`${btnSecondary} ${date === today ? 'border-accent/50 text-accent' : ''}`}
        >
          오늘
        </button>
        <button type="button" onClick={() => update({ date: addDays(date, 1) })} className={btnSecondary} aria-label="다음날">
          다음날 <IconChevronRight />
        </button>
        <input
          type="date"
          aria-label="날짜 선택"
          value={date}
          onChange={(e) => update({ date: isDay(e.target.value) ? e.target.value : null })}
          className={`${inputCls} w-40!`}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className={chip(leagueId === null)} onClick={() => update({ leagueId: null })}>
          전체 리그
        </button>
        {leagues.data?.map((league) => (
          <button
            key={league.id}
            type="button"
            className={chip(leagueId === league.id)}
            onClick={() => update({ leagueId: String(league.id) })}
          >
            {league.name}
          </button>
        ))}
        {leagues.error && <span className="self-center text-xs text-danger">리그를 불러오지 못했습니다.</span>}
      </div>

      <div className="mb-5">
        <SegmentedTabs items={STATUS_TABS} value={status} onChange={(v) => update({ status: v === 'all' ? null : v })} />
      </div>

      {matches.loading ? (
        <Loading />
      ) : matches.error ? (
        <ErrorBox message={matches.error} onRetry={matches.reload} />
      ) : !matches.data || matches.data.length === 0 ? (
        <EmptyState
          icon={<IconCalendar size={20} />}
          title="조건에 맞는 경기가 없습니다"
          description="다른 날짜나 리그를 선택해 보세요."
        />
      ) : (
        <div className="space-y-4">
          {groupByLeague(matches.data).map((group) => (
            <section key={group.league} className="overflow-hidden rounded-xl border border-edge bg-card">
              <h2 className="border-b border-edge bg-panel px-4 py-2.5 text-sm font-bold">
                {group.league}
                <span className="ml-2 text-xs font-normal text-dim">{group.matches.length}경기</span>
              </h2>
              {group.matches.map((m) => (
                <MatchRow key={m.id} match={m} />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
