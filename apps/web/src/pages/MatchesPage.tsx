import { useEffect, useState } from 'react'
import { EmptyFilterActions, FilterChoice, ListFilterBar, OptionButtons, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../components/filters'
import { IconCalendar } from '../components/icons'
import { MatchRow } from '../components/matches'
import { EmptyState, ErrorBox, Field, Loading, PageHeader } from '../components/ui'
import { buildQuery, useApi } from '../lib/api'
import { groupByLeague, isMatchStatus, MATCH_STATUS_LABELS } from '../lib/format'
import { asPaged, dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, uniqueSorted, withAllPeriod, withToday } from '../lib/list-query'
import { useQueryState } from '../lib/params'
import type { League, Match, MatchStatus, Paged, Team } from '../lib/types'

type Extra = {
  sport: string
  leagueId: string
  teamId: string
  status: MatchStatus | ''
  side: '' | 'home' | 'away'
  hasScore: '' | 'true'
  missingScore: '' | 'true'
}

const EMPTY_EXTRA: Extra = { sport: '', leagueId: '', teamId: '', status: '', side: '', hasScore: '', missingScore: '' }

function extraFromParams(get: (key: string) => string): Extra {
  const statusParam = get('status')
  const side = get('side')
  return {
    sport: get('sport'),
    leagueId: get('leagueId'),
    teamId: get('teamId'),
    status: isMatchStatus(statusParam) ? statusParam : '',
    side: side === 'home' || side === 'away' ? side : '',
    hasScore: get('hasScore') === 'true' ? 'true' : '',
    missingScore: get('missingScore') === 'true' ? 'true' : '',
  }
}

function extraQuery(extra: Extra): Record<string, string | null> {
  return {
    sport: extra.sport || null,
    leagueId: extra.leagueId || null,
    teamId: extra.teamId || null,
    status: extra.status || null,
    side: extra.side || null,
    hasScore: extra.hasScore || null,
    missingScore: extra.missingScore || null,
  }
}

function linkedExtra(extra: Extra, leagues: League[], teams: Team[]): Extra {
  const league = leagues.find((item) => String(item.id) === extra.leagueId)
  const team = teams.find((item) => String(item.id) === extra.teamId)
  let leagueId = extra.leagueId
  let teamId = extra.teamId
  if (league && extra.sport && league.sport !== extra.sport) leagueId = ''
  if (team && extra.sport && team.sport !== extra.sport) teamId = ''
  if (team && leagueId && team.leagueId && String(team.leagueId) !== leagueId) teamId = ''
  return { ...extra, leagueId, teamId }
}

export default function MatchesPage() {
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs)
  const appliedExtra = extraFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)
  const leagues = useApi<League[]>('/leagues')
  const teams = useApi<Team[]>('/teams')
  const leagueItems = leagues.data ?? []
  const teamItems = teams.data ?? []

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const matches = useApi<Paged<Match> | Match[]>(
    `/matches${buildQuery({
      ...dateFilterQuery(appliedDates),
      ...extraQuery(appliedExtra),
    })}`,
  )

  const apply = (dates = draft, nextExtra = extra) => {
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(linkedExtra(nextExtra, leagueItems, teamItems)) })
  }
  const reset = () => {
    const dates = emptyDateFilter()
    setDraft(dates)
    setExtra(EMPTY_EXTRA)
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(EMPTY_EXTRA) }, { replace: true })
  }

  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.status) {
    chips.push({
      key: 'status',
      label: `상태: ${MATCH_STATUS_LABELS[appliedExtra.status]}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, status: '' }),
    })
  }
  if (appliedExtra.sport) {
    chips.push({ key: 'sport', label: `종목: ${appliedExtra.sport}`, onRemove: () => apply(appliedDates, linkedExtra({ ...appliedExtra, sport: '' }, leagueItems, teamItems)) })
  }
  if (appliedExtra.leagueId) {
    const name = leagueItems.find((item) => String(item.id) === appliedExtra.leagueId)?.name ?? appliedExtra.leagueId
    chips.push({ key: 'leagueId', label: `리그: ${name}`, onRemove: () => apply(appliedDates, { ...appliedExtra, leagueId: '' }) })
  }
  if (appliedExtra.teamId) {
    const name = teamItems.find((item) => String(item.id) === appliedExtra.teamId)?.name ?? appliedExtra.teamId
    chips.push({ key: 'teamId', label: `팀: ${name}`, onRemove: () => apply(appliedDates, { ...appliedExtra, teamId: '' }) })
  }

  const sports = uniqueSorted(leagueItems.map((item) => item.sport))
  const visibleLeagues = extra.sport ? leagueItems.filter((item) => item.sport === extra.sport) : leagueItems
  const visibleTeams = teamItems.filter((item) => {
    if (extra.sport && item.sport !== extra.sport) return false
    if (extra.leagueId && item.leagueId && String(item.leagueId) !== extra.leagueId) return false
    return true
  })
  const paged = asPaged(matches.data)
  const items = paged?.items ?? []
  const total = paged?.total ?? 0

  return (
    <div>
      <PageHeader icon={<IconCalendar size={20} />} title="경기 일정" subtitle="날짜와 리그로 경기를 찾습니다." />
      <ListFilterBar
        dateLabel="경기 시작일 기준"
        searchPlaceholder="팀 이름 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        advancedCount={[appliedExtra.teamId, appliedExtra.side, appliedExtra.hasScore, appliedExtra.missingScore].filter(Boolean).length}
        chips={chips}
        basic={
          <>
            <OptionButtons
              label="상태"
              value={extra.status}
              onChange={(value) => setExtra({ ...extra, status: value })}
              items={[{ value: '', label: '전체 상태' }, ...(Object.keys(MATCH_STATUS_LABELS) as MatchStatus[]).map((s) => ({ value: s, label: MATCH_STATUS_LABELS[s] }))]}
            />
            <FilterChoice
              label="종목"
              value={extra.sport}
              onChange={(value) => setExtra(linkedExtra({ ...extra, sport: value }, leagueItems, teamItems))}
              items={[{ value: '', label: '전체 종목' }, ...sports.map((sport) => ({ value: sport, label: sport }))]}
            />
            <FilterChoice
              label="리그"
              value={extra.leagueId}
              onChange={(value) => setExtra(linkedExtra({ ...extra, leagueId: value }, leagueItems, teamItems))}
              items={[{ value: '', label: '전체 리그' }, ...visibleLeagues.map((league) => ({ value: String(league.id), label: league.name }))]}
            />
          </>
        }
        advanced={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="팀">
              <FilterChoice
                label="팀"
                value={extra.teamId}
                onChange={(value) => setExtra({ ...extra, teamId: value })}
                items={[{ value: '', label: '전체 팀' }, ...visibleTeams.map((team) => ({ value: String(team.id), label: team.name }))]}
              />
            </Field>
            <Field label="홈/원정">
              <FilterChoice
                label="홈/원정"
                value={extra.side}
                onChange={(value) => setExtra({ ...extra, side: value })}
                items={[
                  { value: '', label: '제한 없음' },
                  { value: 'home', label: '홈' },
                  { value: 'away', label: '원정' },
                ]}
              />
            </Field>
            <Field label="점수">
              <FilterChoice
                label="점수"
                value={extra.hasScore ? 'true' : extra.missingScore ? 'missing' : ''}
                onChange={(value) =>
                  setExtra({
                    ...extra,
                    hasScore: value === 'true' ? 'true' : '',
                    missingScore: value === 'missing' ? 'true' : '',
                  })
                }
                items={[
                  { value: '', label: '제한 없음' },
                  { value: 'true', label: '점수 있음' },
                  { value: 'missing', label: '점수 없음' },
                ]}
              />
            </Field>
          </div>
        }
        summary={<p className="text-xs text-dim">{resultCountText(total, 1, Math.max(total, 1), '건')}</p>}
      />

      {matches.loading ? (
        <Loading />
      ) : matches.error ? (
        <ErrorBox message={matches.error} onRetry={matches.reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<IconCalendar size={20} />}
          title="선택한 경기일 기간과 검색어에 맞는 경기가 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates), appliedExtra)} onReset={reset} />}
        />
      ) : (
        <div className="space-y-4">
          {groupByLeague(items).map((group) => (
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
