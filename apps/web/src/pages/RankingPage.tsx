import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { EmptyFilterActions, FilterChoice, ListFilterBar, OptionButtons, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../components/filters'
import { AuthorLink } from '../components/posts'
import { IconTarget } from '../components/icons'
import { EmptyState, ErrorBox, Loading, PageHeader } from '../components/ui'
import { buildQuery, useApi } from '../lib/api'
import { profilePath } from '../lib/boards'
import { formatNumber } from '../lib/format'
import { dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, uniqueSorted, withAllPeriod, withToday } from '../lib/list-query'
import { useQueryState } from '../lib/params'
import { tdCls, thCls, trCls } from '../lib/styles'
import { useTitle } from '../lib/title'
import type { League, PredictionRanking } from '../lib/types'

type Extra = {
  sport: string
  leagueId: string
  minDecided: string
  sort: string
}

const EMPTY_EXTRA: Extra = { sport: '', leagueId: '', minDecided: '1', sort: 'rate_desc' }

function extraFromParams(get: (key: string) => string): Extra {
  const minDecided = get('minDecided')
  return {
    sport: get('sport'),
    leagueId: get('leagueId'),
    minDecided: minDecided === '5' || minDecided === '10' ? minDecided : '1',
    sort: get('sort') || 'rate_desc',
  }
}

function extraQuery(extra: Extra): Record<string, string | null> {
  return {
    sport: extra.sport || null,
    leagueId: extra.leagueId || null,
    minDecided: extra.minDecided === '1' ? null : extra.minDecided,
    sort: extra.sort === 'rate_desc' ? null : extra.sort,
  }
}

function rateText(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

export default function RankingPage() {
  useTitle('예측 랭킹')
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, 'all')
  const appliedExtra = extraFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)
  const leagues = useApi<League[]>('/leagues')
  const leagueItems = leagues.data ?? []

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const { data, loading, error, reload } = useApi<PredictionRanking>(
    `/rankings/predictions${buildQuery({
      ...dateFilterQuery(appliedDates),
      ...extraQuery(appliedExtra),
      q: appliedDates.q || null,
    })}`,
  )

  const apply = (dates = draft, nextExtra = extra) => {
    const league = leagueItems.find((item) => String(item.id) === nextExtra.leagueId)
    const linked = league && nextExtra.sport && league.sport !== nextExtra.sport ? { ...nextExtra, leagueId: '' } : nextExtra
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(linked) })
  }
  const reset = () => {
    const dates = { ...emptyDateFilter(), range: 'all' as const }
    setDraft(dates)
    setExtra(EMPTY_EXTRA)
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(EMPTY_EXTRA) }, { replace: true })
  }
  const applyPreset = (id: string) => {
    const dates = emptyDateFilter()
    let next = { ...EMPTY_EXTRA }
    if (id === 'all-5') {
      dates.range = 'all'
      next = { ...next, minDecided: '5' }
    }
    if (id === 'all-10') {
      dates.range = 'all'
      next = { ...next, minDecided: '10' }
    }
    setDraft(dates)
    setExtra(next)
    apply(dates, next)
  }

  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.sport) {
    chips.push({ key: 'sport', label: `종목: ${appliedExtra.sport}`, onRemove: () => apply(appliedDates, { ...appliedExtra, sport: '', leagueId: '' }) })
  }
  if (appliedExtra.leagueId) {
    const name = leagueItems.find((item) => String(item.id) === appliedExtra.leagueId)?.name ?? appliedExtra.leagueId
    chips.push({ key: 'leagueId', label: `리그: ${name}`, onRemove: () => apply(appliedDates, { ...appliedExtra, leagueId: '' }) })
  }
  if (appliedExtra.minDecided !== '1') {
    chips.push({
      key: 'minDecided',
      label: `판정 ${appliedExtra.minDecided}회 이상`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, minDecided: '1' }),
    })
  }

  const sports = uniqueSorted(leagueItems.map((item) => item.sport))
  const visibleLeagues = extra.sport ? leagueItems.filter((item) => item.sport === extra.sport) : leagueItems
  const items = data?.items ?? []

  return (
    <div>
      <PageHeader icon={<IconTarget size={20} />} title="예측 랭킹" subtitle="종료된 경기의 승부 예측 적중률입니다. 돈이나 보상은 없습니다." />
      <ListFilterBar
        dateLabel="경기일 기준"
        searchPlaceholder="닉네임 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        chips={chips}
        presets={[
          { id: 'today', label: '오늘' },
          { id: 'all-5', label: '전체기간 판정 5회 이상' },
          { id: 'all-10', label: '전체기간 판정 10회 이상' },
        ]}
        onPreset={(id) => {
          if (id === 'today') applyPreset('today')
          else applyPreset(id)
        }}
        basic={
          <>
            <FilterChoice
              label="종목"
              value={extra.sport}
              onChange={(value) => setExtra({ ...extra, sport: value, leagueId: '' })}
              items={[{ value: '', label: '전체 종목' }, ...sports.map((sport) => ({ value: sport, label: sport }))]}
            />
            <FilterChoice
              label="리그"
              value={extra.leagueId}
              onChange={(value) => setExtra({ ...extra, leagueId: value })}
              items={[{ value: '', label: '전체 리그' }, ...visibleLeagues.map((league) => ({ value: String(league.id), label: league.name }))]}
            />
            <OptionButtons
              label="최소 판정"
              value={extra.minDecided}
              onChange={(value) => setExtra({ ...extra, minDecided: value || '1' })}
              items={[
                { value: '1', label: '1회' },
                { value: '5', label: '5회' },
                { value: '10', label: '10회' },
              ]}
            />
            <FilterChoice
              label="정렬"
              value={extra.sort}
              onChange={(value) => setExtra({ ...extra, sort: value || 'rate_desc' })}
              items={[
                { value: 'rate_desc', label: '적중률순' },
                { value: 'hits_desc', label: '적중 수순' },
                { value: 'decided_desc', label: '판정 수순' },
              ]}
            />
          </>
        }
        summary={<p className="text-xs text-dim">{resultCountText(items.length, 1, Math.max(items.length, 1), '명')}</p>}
      />
      {loading && !data ? (
        <Loading />
      ) : error && !data ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<IconTarget size={20} />}
          title="선택한 경기일 기간과 검색어에 맞는 랭킹이 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates), appliedExtra)} onReset={reset} />}
        />
      ) : (
        <section className="overflow-hidden rounded-xl border border-edge bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="border-b border-edge">
                <tr>
                  <th className={`${thCls} w-14`}>순위</th>
                  <th className={thCls}>회원</th>
                  <th className={`${thCls} w-16 text-right`}>예측</th>
                  <th className={`${thCls} w-16 text-right`}>판정</th>
                  <th className={`${thCls} w-16 text-right`}>적중</th>
                  <th className={`${thCls} w-28 text-right`}>적중률</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.user.id} className={trCls}>
                    <td className={`${tdCls} tabular-nums ${row.rank <= 3 ? 'font-bold text-accent' : 'text-muted'}`}>{row.rank}</td>
                    <td className={tdCls}>
                      <Link to={profilePath(row.user.nickname)} className="font-semibold hover:text-accent">
                        {row.user.nickname}
                      </Link>
                    </td>
                    <td className={`${tdCls} text-right tabular-nums`}>{formatNumber(row.total)}</td>
                    <td className={`${tdCls} text-right tabular-nums`}>{formatNumber(row.decided)}</td>
                    <td className={`${tdCls} text-right tabular-nums`}>{formatNumber(row.hits)}</td>
                    <td className={`${tdCls} text-right font-semibold tabular-nums`}>
                      {rateText(row.rate)}
                      <span className="ml-1 text-xs font-normal text-dim">
                        ({row.hits}/{row.decided})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

export function RankingPreview({ items }: { items: PredictionRanking['items'] }) {
  if (items.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-dim">아직 랭킹이 없습니다.</p>
  }
  return (
    <>
      {items.slice(0, 5).map((row) => (
        <div key={row.user.id} className="flex items-center gap-3 border-b border-edge-soft px-4 py-2.5 last:border-b-0">
          <span className={`w-6 text-sm font-bold tabular-nums ${row.rank <= 3 ? 'text-accent' : 'text-muted'}`}>{row.rank}</span>
          <AuthorLink nickname={row.user.nickname} className="min-w-0 flex-1 truncate font-medium" />
          <span className="text-xs text-dim tabular-nums">
            {row.hits}/{row.decided} · {rateText(row.rate)}
          </span>
        </div>
      ))}
    </>
  )
}
