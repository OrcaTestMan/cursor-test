import { useEffect, useState, type FormEvent } from 'react'
import { EmptyFilterActions, FilterChoice, ListFilterBar, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../../components/filters'
import { IconTrophy } from '../../components/icons'
import { EmptyState, ErrorBox, Field, FormError, Loading, PageHeader, Pagination } from '../../components/ui'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { asPaged, dateFilterQuery, emptyDateFilter, optionalIntError, resultCountText, serializeDateFilter, uniqueSorted, withAllPeriod, withToday } from '../../lib/list-query'
import { useQueryState } from '../../lib/params'
import { btnPrimary, btnSmDanger, btnSmPrimary, btnSmSecondary, cardCls, inputCls, tdCls, thCls, trCls } from '../../lib/styles'
import type { League, Paged } from '../../lib/types'

type Extra = {
  sport: string
  hasMatches: '' | 'true' | 'false'
  minMatchCount: string
}

const EMPTY_EXTRA: Extra = { sport: '', hasMatches: '', minMatchCount: '' }

function extraFromParams(get: (key: string) => string): Extra {
  const hasMatches = get('hasMatches')
  return {
    sport: get('sport'),
    hasMatches: hasMatches === 'true' || hasMatches === 'false' ? hasMatches : '',
    minMatchCount: get('minMatchCount'),
  }
}

function extraQuery(extra: Extra): Record<string, string | null> {
  return {
    sport: extra.sport || null,
    hasMatches: extra.hasMatches || null,
    minMatchCount: extra.minMatchCount || null,
  }
}

function validateLeague(name: string, sport: string): string | null {
  if (!name || name.length > 50) return '리그 이름은 1~50자로 입력해 주세요.'
  if (!sport || sport.length > 20) return '종목은 1~20자로 입력해 주세요.'
  return null
}

export default function AdminLeaguesPage() {
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, 'all', { keys: ['minMatchCount'] })
  const appliedExtra = extraFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)
  const [filterAlert, setFilterAlert] = useState<string | null>(null)
  const catalog = useApi<League[]>('/leagues')
  const list = useApi<Paged<League> | League[]>(
    `/admin/leagues${buildQuery({
      ...dateFilterQuery(appliedDates),
      ...extraQuery(appliedExtra),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )
  const [editingId, setEditingId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const apply = (dates = draft, nextExtra = extra) => {
    setFilterAlert(null)
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(nextExtra) })
  }
  const submit = () => {
    const message = optionalIntError(extra.minMatchCount, '경기 수')
    if (message) {
      setFilterAlert(message)
      return
    }
    apply()
  }
  const reset = () => {
    const dates = { ...emptyDateFilter(), range: 'all' as const }
    setDraft(dates)
    setExtra(EMPTY_EXTRA)
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(EMPTY_EXTRA) }, { replace: true })
  }

  const onDelete = async (league: League) => {
    if (!window.confirm(`'${league.name}' 리그를 삭제할까요?`)) return
    setDeletingId(league.id)
    setActionError(null)
    try {
      await apiFetch<void>(`/admin/leagues/${league.id}`, { method: 'DELETE' })
      list.reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  const paged = asPaged(list.data)
  const shown = paged?.items ?? []
  const total = paged?.total ?? 0
  const sports = uniqueSorted((catalog.data ?? shown).map((item) => item.sport))
  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.sport) {
    chips.push({ key: 'sport', label: `종목: ${appliedExtra.sport}`, onRemove: () => apply(appliedDates, { ...appliedExtra, sport: '' }) })
  }
  if (appliedExtra.hasMatches) {
    chips.push({
      key: 'hasMatches',
      label: appliedExtra.hasMatches === 'true' ? '경기 있음' : '경기 없음',
      onRemove: () => apply(appliedDates, { ...appliedExtra, hasMatches: '' }),
    })
  }
  if (appliedExtra.minMatchCount) {
    chips.push({
      key: 'minMatchCount',
      label: `경기 ${appliedExtra.minMatchCount}건 이상`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, minMatchCount: '' }),
    })
  }

  return (
    <div>
      <PageHeader icon={<IconTrophy size={20} />} title="리그 관리" subtitle="경기를 묶는 리그와 종목을 관리합니다." />
      <ListFilterBar
        dateLabel="등록일 기준"
        searchPlaceholder="리그 이름 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={submit}
        onReset={reset}
        restoreNotice={restoreNotice}
        alert={filterAlert}
        advancedCount={[appliedExtra.hasMatches, appliedExtra.minMatchCount].filter(Boolean).length}
        chips={chips}
        basic={
          <FilterChoice
            label="종목"
            value={extra.sport}
            onChange={(value) => setExtra({ ...extra, sport: value })}
            items={[{ value: '', label: '전체 종목' }, ...sports.filter(Boolean).map((sport) => ({ value: sport, label: sport }))]}
          />
        }
        advanced={
          <div className="grid gap-3 sm:grid-cols-2">
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
            <Field label="최소 경기 수">
              <input value={extra.minMatchCount} onChange={(e) => setExtra({ ...extra, minMatchCount: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 1" />
            </Field>
          </div>
        }
        summary={<p className="text-xs text-dim">{resultCountText(total, qs.page, qs.pageSize, '개')}</p>}
      />
      <AddLeagueForm onAdded={list.reload} />
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
          title="선택한 등록일 기간과 검색어에 맞는 리그가 없습니다."
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
                  <th className={`${thCls} text-right`}>경기 수</th>
                  <th className={thCls}>등록일</th>
                  <th className={`${thCls} text-right`}>관리</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((league) =>
                  editingId === league.id ? (
                    <EditRow
                      key={league.id}
                      league={league}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => {
                        setEditingId(null)
                        list.reload()
                      }}
                    />
                  ) : (
                    <tr key={league.id} className={trCls}>
                      <td className={`${tdCls} text-muted`}>#{league.id}</td>
                      <td className={`${tdCls} font-semibold`}>{league.name}</td>
                      <td className={`${tdCls} text-dim`}>{league.sport}</td>
                      <td className={`${tdCls} text-right tabular-nums`}>{league.matchCount}</td>
                      <td className={`${tdCls} text-dim`}>{formatDate(league.createdAt)}</td>
                      <td className={`${tdCls} text-right`}>
                        <span className="inline-flex gap-1.5">
                          <button type="button" onClick={() => setEditingId(league.id)} className={btnSmSecondary}>
                            수정
                          </button>
                          <button type="button" disabled={deletingId === league.id} onClick={() => void onDelete(league)} className={btnSmDanger}>
                            삭제
                          </button>
                        </span>
                      </td>
                    </tr>
                  ),
                )}
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

function AddLeagueForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    const s = sport.trim()
    const problem = validateLeague(n, s)
    if (problem) return setError(problem)
    setSending(true)
    setError(null)
    try {
      await apiFetch<League>('/admin/leagues', { method: 'POST', body: { name: n, sport: s } })
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
          <span className="mb-1.5 block text-xs font-semibold text-dim">리그 이름</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="예: K리그1" className={inputCls} />
        </label>
        <label className="w-40">
          <span className="mb-1.5 block text-xs font-semibold text-dim">종목</span>
          <input value={sport} onChange={(e) => setSport(e.target.value)} maxLength={20} placeholder="예: 축구" className={inputCls} />
        </label>
        <button type="submit" disabled={sending} className={btnPrimary}>
          {sending ? '추가 중...' : '리그 추가'}
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

function EditRow({ league, onCancel, onSaved }: { league: League; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(league.name)
  const [sport, setSport] = useState(league.sport)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const onSave = async () => {
    const n = name.trim()
    const s = sport.trim()
    const problem = validateLeague(n, s)
    if (problem) return setError(problem)
    setSending(true)
    setError(null)
    try {
      await apiFetch<League>(`/admin/leagues/${league.id}`, { method: 'PATCH', body: { name: n, sport: s } })
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
      setSending(false)
    }
  }

  return (
    <tr className="border-b border-edge-soft bg-card-hover last:border-b-0">
      <td className={`${tdCls} align-top text-muted`}>#{league.id}</td>
      <td className="px-3 py-2 align-top" colSpan={2}>
        <div className="flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} aria-label="리그 이름" className={`${inputCls} h-8`} />
          <input value={sport} onChange={(e) => setSport(e.target.value)} maxLength={20} aria-label="종목" className={`${inputCls} h-8 w-32!`} />
        </div>
        {error && <p className="mt-1.5 text-xs whitespace-pre-line text-danger">{error}</p>}
      </td>
      <td className={`${tdCls} text-right align-top tabular-nums`}>{league.matchCount}</td>
      <td className={`${tdCls} align-top text-dim`}>{formatDate(league.createdAt)}</td>
      <td className={`${tdCls} text-right align-top`}>
        <span className="inline-flex gap-1.5">
          <button type="button" disabled={sending} onClick={() => void onSave()} className={btnSmPrimary}>
            {sending ? '저장 중...' : '저장'}
          </button>
          <button type="button" onClick={onCancel} className={btnSmSecondary}>
            취소
          </button>
        </span>
      </td>
    </tr>
  )
}
