import { useEffect, useState } from 'react'
import { FilterChoice, ListFilterBar, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../components/filters'
import { IconTrophy } from '../components/icons'
import { EmptyState, ErrorBox, Loading, PageHeader } from '../components/ui'
import { useApi } from '../lib/api'
import { formatNumber, formatWinRate, toPositiveInt } from '../lib/format'
import { emptyDateFilter, serializeDateFilter, uniqueSorted, withToday } from '../lib/list-query'
import { useQueryState } from '../lib/params'
import { chipCls, tdCls, thCls, trCls } from '../lib/styles'
import { useTitle } from '../lib/title'
import type { League, Standings } from '../lib/types'

export default function StandingsPage() {
  useTitle('순위')
  const query = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(query, 'all')
  const sport = query.get('sport')
  const leagueId = toPositiveInt(query.get('leagueId'))
  const leagues = useApi<League[]>('/leagues')
  const sports = uniqueSorted((leagues.data ?? []).map((item) => item.sport))
  const visibleLeagues = sport ? (leagues.data ?? []).filter((item) => item.sport === sport) : (leagues.data ?? [])
  const selectedId = leagueId ?? visibleLeagues[0]?.id ?? null
  const standings = useApi<Standings>(selectedId ? `/leagues/${selectedId}/standings` : null)
  const [extraSport, setExtraSport] = useState(sport)

  useEffect(() => {
    setExtraSport(sport)
  }, [sport])

  const apply = (dates = draft, nextSport = extraSport) => {
    const league = (leagues.data ?? []).find((item) => item.id === selectedId)
    const keepLeague = league && (!nextSport || league.sport === nextSport)
    query.update({ ...serializeDateFilter(dates), sport: nextSport || null, leagueId: keepLeague ? selectedId : null })
  }
  const reset = () => {
    const dates = { ...emptyDateFilter(), range: 'all' as const }
    setDraft(dates)
    setExtraSport('')
    query.update({ ...serializeDateFilter(dates), sport: null, leagueId: null }, { replace: true })
  }
  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates)))]
  if (sport) chips.push({ key: 'sport', label: `종목: ${sport}`, onRemove: () => apply(appliedDates, '') })

  return (
    <div>
      <PageHeader icon={<IconTrophy size={20} />} title="순위" subtitle="종료된 경기를 기준으로 리그 순위를 보여 줍니다." />
      <ListFilterBar
        dateLabel="경기일 기준"
        searchPlaceholder="팀 이름 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        chips={chips}
        basic={
          <FilterChoice
            label="종목"
            value={extraSport}
            onChange={setExtraSport}
            items={[{ value: '', label: '전체 종목' }, ...sports.map((item) => ({ value: item, label: item }))]}
          />
        }
      />

      {leagues.loading && !leagues.data ? (
        <Loading />
      ) : leagues.error && !leagues.data ? (
        <ErrorBox message={leagues.error} onRetry={leagues.reload} />
      ) : !leagues.data || leagues.data.length === 0 ? (
        <EmptyState icon={<IconTrophy size={20} />} title="등록된 리그가 없습니다" description="리그가 등록되면 순위를 볼 수 있습니다." />
      ) : (
        <>
          <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="리그">
            {leagues.data.map((league) => (
              <button
                key={league.id}
                type="button"
                className={chipCls(selectedId === league.id)}
                onClick={() => query.update({ leagueId: league.id })}
              >
                {league.name}
              </button>
            ))}
          </div>
          {leagues.error && <p className="mb-3 text-xs text-danger">{leagues.error}</p>}
          {standings.loading ? (
            <Loading />
          ) : standings.error || !standings.data ? (
            <ErrorBox message={standings.error ?? '순위를 불러오지 못했습니다.'} onRetry={standings.reload} />
          ) : standings.data.rows.length === 0 ? (
            <EmptyState
              icon={<IconTrophy size={20} />}
              title="아직 순위가 없습니다"
              description="종료된 경기가 쌓이면 순위가 표시됩니다."
            />
          ) : (
            <StandingsTable data={standings.data} />
          )}
        </>
      )}
    </div>
  )
}

function StandingsTable({ data }: { data: Standings }) {
  const winRate = data.mode === 'winRate'
  return (
    <section className="overflow-hidden rounded-xl border border-edge bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge bg-panel px-4 py-2.5">
        <h2 className="font-bold">
          {data.league.name}
          <span className="ml-2 text-xs font-normal text-dim">{data.league.sport}</span>
        </h2>
        <p className="text-xs text-dim">{winRate ? '승률 · 승 순' : '승점 · 득실 · 다득점 순'}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-edge">
            <tr>
              <th className={`${thCls} w-12`}>순위</th>
              <th className={thCls}>팀</th>
              <th className={`${thCls} w-14 text-right`}>경기</th>
              <th className={`${thCls} w-12 text-right`}>승</th>
              <th className={`${thCls} w-12 text-right`}>무</th>
              <th className={`${thCls} w-12 text-right`}>패</th>
              <th className={`${thCls} w-14 text-right`}>득점</th>
              <th className={`${thCls} w-14 text-right`}>실점</th>
              <th className={`${thCls} w-14 text-right`}>득실</th>
              {winRate ? <th className={`${thCls} w-16 text-right`}>승률</th> : <th className={`${thCls} w-14 text-right`}>승점</th>}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.team} className={trCls}>
                <td className={`${tdCls} font-bold tabular-nums ${row.rank === 1 ? 'text-gold' : row.rank <= 3 ? 'text-accent' : 'text-dim'}`}>
                  {row.rank}
                </td>
                <td className={`${tdCls} font-semibold`}>{row.team}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{formatNumber(row.played)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{formatNumber(row.win)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{formatNumber(row.draw)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{formatNumber(row.loss)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{formatNumber(row.goalsFor)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{formatNumber(row.goalsAgainst)}</td>
                <td className={`${tdCls} text-right tabular-nums ${row.diff > 0 ? 'text-accent' : row.diff < 0 ? 'text-danger' : ''}`}>
                  {row.diff > 0 ? `+${row.diff}` : row.diff}
                </td>
                {winRate ? (
                  <td className={`${tdCls} text-right font-semibold tabular-nums`}>{formatWinRate(row.winRate)}</td>
                ) : (
                  <td className={`${tdCls} text-right font-semibold tabular-nums`}>{formatNumber(row.points)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
