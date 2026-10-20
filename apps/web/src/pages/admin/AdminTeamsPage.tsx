import { useEffect, useState, type FormEvent } from 'react'
import { EmptyFilterActions, FilterChoice, ListFilterBar, OptionButtons, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../../components/filters'
import { IconTrophy } from '../../components/icons'
import { EmptyState, ErrorBox, Field, FormError, Loading, PageHeader, Pagination, Pill } from '../../components/ui'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { asPaged, dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, uniqueSorted, withAllPeriod, withToday } from '../../lib/list-query'
import { useQueryState } from '../../lib/params'
import { btnPrimary, btnSmPrimary, btnSmSecondary, cardCls, inputCls, tdCls, thCls, trCls } from '../../lib/styles'
import type { League, Paged, Team } from '../../lib/types'

type Extra = {
  sport: string
  leagueId: string
  active: '' | 'true' | 'false'
  unlinked: '' | 'true'
  hasMatches: '' | 'true' | 'false'
}

const EMPTY_EXTRA: Extra = { sport: '', leagueId: '', active: '', unlinked: '', hasMatches: '' }

function extraFromParams(get: (key: string) => string): Extra {
  const active = get('active')
  const hasMatches = get('hasMatches')
  return {
    sport: get('sport'),
    leagueId: get('leagueId'),
    active: active === 'true' || active === 'false' ? active : '',
    unlinked: get('unlinked') === 'true' ? 'true' : '',
    hasMatches: hasMatches === 'true' || hasMatches === 'false' ? hasMatches : '',
  }
}

function extraQuery(extra: Extra): Record<string, string | null> {
  return {
    sport: extra.sport || null,
    leagueId: extra.leagueId || null,
    active: extra.active || null,
    unlinked: extra.unlinked || null,
    hasMatches: extra.hasMatches || null,
  }
}

export default function AdminTeamsPage() {
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, 'all')
  const appliedExtra = extraFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const leagues = useApi<League[]>('/leagues')
  const list = useApi<Paged<Team> | Team[]>(
    `/admin/teams${buildQuery({
      ...dateFilterQuery(appliedDates),
      ...extraQuery(appliedExtra),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const apply = (dates = draft, nextExtra = extra) => {
    const linked = nextExtra.sport
      ? {
          ...nextExtra,
          leagueId: (leagues.data ?? []).some((item) => String(item.id) === nextExtra.leagueId && item.sport === nextExtra.sport)
            ? nextExtra.leagueId
            : nextExtra.leagueId && (leagues.data ?? []).find((item) => String(item.id) === nextExtra.leagueId)?.sport !== nextExtra.sport
              ? ''
              : nextExtra.leagueId,
        }
      : nextExtra
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(linked) })
  }
  const reset = () => {
    const dates = { ...emptyDateFilter(), range: 'all' as const }
    setDraft(dates)
    setExtra(EMPTY_EXTRA)
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(EMPTY_EXTRA) }, { replace: true })
  }

  const setActive = async (team: Team, active: boolean) => {
    setBusyId(team.id)
    setActionError(null)
    try {
      await apiFetch<Team>(`/admin/teams/${team.id}`, { method: 'PATCH', body: { active } })
      list.reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const paged = asPaged(list.data)
  const shown = paged?.items ?? []
  const total = paged?.total ?? 0
  const sports = uniqueSorted((leagues.data ?? []).map((item) => item.sport))
  const visibleLeagues = extra.sport ? (leagues.data ?? []).filter((item) => item.sport === extra.sport) : (leagues.data ?? [])

  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.sport) {
    chips.push({ key: 'sport', label: `종목: ${appliedExtra.sport}`, onRemove: () => apply(appliedDates, { ...appliedExtra, sport: '', leagueId: '' }) })
  }
  if (appliedExtra.leagueId) {
    const name = (leagues.data ?? []).find((item) => String(item.id) === appliedExtra.leagueId)?.name ?? appliedExtra.leagueId
    chips.push({ key: 'leagueId', label: `리그: ${name}`, onRemove: () => apply(appliedDates, { ...appliedExtra, leagueId: '' }) })
  }
  if (appliedExtra.active) {
    chips.push({
      key: 'active',
      label: appliedExtra.active === 'true' ? '활성' : '비활성',
      onRemove: () => apply(appliedDates, { ...appliedExtra, active: '' }),
    })
  }
  if (appliedExtra.unlinked) {
    chips.push({ key: 'unlinked', label: '리그 미연결', onRemove: () => apply(appliedDates, { ...appliedExtra, unlinked: '' }) })
  }
  if (appliedExtra.hasMatches) {
    chips.push({
      key: 'hasMatches',
      label: appliedExtra.hasMatches === 'true' ? '경기 있음' : '경기 없음',
      onRemove: () => apply(appliedDates, { ...appliedExtra, hasMatches: '' }),
    })
  }

  return (
    <div>
      <PageHeader
        icon={<IconTrophy size={20} />}
        title="팀 관리"
        subtitle="응원팀 이름을 등록합니다. 비슷한 이름은 합치지 않습니다."
      />
      <ListFilterBar
        dateLabel="등록일 기준"
        searchPlaceholder="팀 이름 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        advancedCount={[appliedExtra.unlinked, appliedExtra.hasMatches].filter(Boolean).length}
        chips={chips}
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
              label="상태"
              value={extra.active}
              onChange={(value) => setExtra({ ...extra, active: value })}
              items={[
                { value: '', label: '전체 상태' },
                { value: 'true', label: '활성' },
                { value: 'false', label: '비활성' },
              ]}
            />
          </>
        }
        advanced={
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionButtons
              label="리그 연결"
              value={extra.unlinked}
              onChange={(value) => setExtra({ ...extra, unlinked: value })}
              items={[
                { value: '', label: '제한 없음' },
                { value: 'true', label: '미연결만' },
              ]}
            />
            <Field label="경기">
              <FilterChoice
                label="경기"
                value={extra.hasMatches}
                onChange={(value) => setExtra({ ...extra, hasMatches: value })}
                items={[
                  { value: '', label: '제한 없음' },
                  { value: 'true', label: '있음' },
                  { value: 'false', label: '없음' },
                ]}
              />
            </Field>
          </div>
        }
        summary={<p className="text-xs text-dim">{resultCountText(total, qs.page, qs.pageSize, '개')}</p>}
      />
      <AddTeamForm onAdded={list.reload} />
      {actionError && (
        <div className="mb-3">
          <FormError message={actionError} />
        </div>
      )}
      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <ErrorBox message={list.error} onRetry={list.reload} />
      ) : !paged || shown.length === 0 ? (
        <EmptyState
          icon={<IconTrophy size={20} />}
          title="선택한 등록일 기간과 검색어에 맞는 팀이 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates), appliedExtra)} onReset={reset} />}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-edge bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-edge">
                <tr>
                  <th className={thCls}>ID</th>
                  <th className={thCls}>이름</th>
                  <th className={thCls}>종목</th>
                  <th className={thCls}>상태</th>
                  <th className={`${thCls} text-right`}>관리</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((team) => (
                  <tr key={team.id} className={trCls}>
                    <td className={`${tdCls} text-muted`}>#{team.id}</td>
                    <td className={`${tdCls} font-semibold`}>{team.name}</td>
                    <td className={`${tdCls} text-dim`}>{team.sport}</td>
                    <td className={tdCls}>
                      <Pill tone={team.active ? 'green' : 'gray'}>{team.active ? '활성' : '비활성'}</Pill>
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <button
                        type="button"
                        disabled={busyId === team.id}
                        onClick={() => void setActive(team, !team.active)}
                        className={team.active ? btnSmSecondary : btnSmPrimary}
                      >
                        {busyId === team.id ? '저장 중...' : team.active ? '비활성화' : '활성화'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={qs.page}
            pageSize={qs.pageSize}
            total={total}
            onPage={(p) => qs.update({ page: p }, true)}
            onPageSize={(size) => qs.update({ pageSize: size })}
          />
        </>
      )}
    </div>
  )
}

function AddTeamForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    const s = sport.trim()
    if (!n || n.length > 50) return setError('팀 이름은 1~50자로 입력해 주세요.')
    if (!s || s.length > 20) return setError('종목은 1~20자로 입력해 주세요.')
    setSending(true)
    setError(null)
    try {
      await apiFetch<Team>('/admin/teams', { method: 'POST', body: { name: n, sport: s } })
      setName('')
      setSport('')
      onAdded()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className={`${cardCls} mb-4 p-4`} noValidate>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-48 flex-1">
          <span className="mb-1.5 block text-xs font-semibold text-dim">팀 이름</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="경기 홈·원정 이름과 같게" className={inputCls} />
        </label>
        <label className="w-40">
          <span className="mb-1.5 block text-xs font-semibold text-dim">종목</span>
          <input value={sport} onChange={(e) => setSport(e.target.value)} maxLength={20} placeholder="예: 축구" className={inputCls} />
        </label>
        <button type="submit" disabled={sending} className={btnPrimary}>
          {sending ? '추가 중...' : '팀 추가'}
        </button>
      </div>
      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}
    </form>
  )
}
