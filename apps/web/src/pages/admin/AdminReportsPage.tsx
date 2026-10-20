import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { IconFlag } from '../../components/admin/AdminUi'
import { EmptyFilterActions, FilterChoice, ListFilterBar, OptionButtons, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../../components/filters'
import { ContentStatusPill, EmptyState, ErrorBox, Field, FormError, Loading, Modal, PageHeader, Pagination, Pill } from '../../components/ui'
import {
  BLOCK_DAY_OPTIONS,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_LABELS,
  useAdminContext,
} from '../../lib/admin'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { formatDateTime, formatShort } from '../../lib/format'
import { dateFilterQuery, emptyDateFilter, optionalIntError, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../../lib/list-query'
import { useQueryState } from '../../lib/params'
import { btnPrimary, btnSecondary, btnSmPrimary, inputCls, selectCls, tdCls, textareaCls, thCls, trCls } from '../../lib/styles'
import type { Paged, ReportGroup, ReportReason, ReportStatus, ReportTarget } from '../../lib/types'

type ResolveAction = 'hide' | 'delete' | 'dismiss'

const ACTIONS: { value: ResolveAction; label: string; description: string }[] = [
  { value: 'hide', label: '숨김', description: '대상을 숨김 상태로 바꿉니다.' },
  { value: 'delete', label: '삭제', description: '대상을 삭제합니다.' },
  { value: 'dismiss', label: '기각(이상 없음)', description: '신고를 기각하고, 자동 숨김이었다면 다시 노출합니다.' },
]

const NOTE_MAX = 300

function toStatus(value: string): ReportStatus {
  return value === 'resolved' || value === 'rejected' ? value : 'pending'
}

function toTarget(value: string): ReportTarget | '' {
  return value === 'post' || value === 'comment' || value === 'chat' ? value : ''
}

function toReason(value: string): ReportReason | '' {
  return value === 'abuse' || value === 'obscene' || value === 'spam' || value === 'privacy' || value === 'etc' ? value : ''
}

function targetLink(group: ReportGroup): string {
  if (group.targetType === 'chat') return group.target.postId ? `/matches/${group.target.postId}` : '/live'
  return group.targetType === 'comment' ? `/posts/${group.target.postId}#comment-${group.targetId}` : `/posts/${group.target.postId}`
}

type Extra = {
  status: ReportStatus
  targetType: ReportTarget | ''
  reason: ReportReason | ''
  minCount: string
  sort: string
  pendingHours: string
}

const EMPTY_EXTRA: Extra = {
  status: 'pending',
  targetType: '',
  reason: '',
  minCount: '',
  sort: 'latest',
  pendingHours: '',
}

function extraFromParams(get: (key: string) => string): Extra {
  return {
    status: toStatus(get('status')),
    targetType: toTarget(get('targetType')),
    reason: toReason(get('reason')),
    minCount: get('minCount'),
    sort: get('sort') || 'latest',
    pendingHours: get('pendingHours'),
  }
}

function extraQuery(extra: Extra): Record<string, string | null> {
  return {
    status: extra.status === 'pending' ? null : extra.status,
    targetType: extra.targetType || null,
    reason: extra.reason || null,
    minCount: extra.minCount || null,
    sort: extra.sort === 'latest' ? null : extra.sort,
    pendingHours: extra.pendingHours || null,
  }
}

function advancedCountOf(extra: Extra) {
  return [extra.reason, extra.minCount, extra.pendingHours].filter(Boolean).length
}

function ReasonChips({ group }: { group: ReportGroup }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {REPORT_REASONS.filter((r) => (group.reasons[r] ?? 0) > 0).map((r) => (
        <span key={r} className="inline-flex h-5 items-center rounded-md border border-edge px-1.5 text-[11px] text-dim">
          {REPORT_REASON_LABELS[r]} {group.reasons[r]}
        </span>
      ))}
    </span>
  )
}

function TargetStatus({ group }: { group: ReportGroup }) {
  if (group.target.deleted) return <Pill tone="gray">삭제됨</Pill>
  if (group.status === 'pending' && group.target.status === 'hidden') return <Pill tone="red">자동 숨김</Pill>
  return <ContentStatusPill status={group.target.status} />
}

function TargetCell({ group }: { group: ReportGroup }) {
  const isComment = group.targetType === 'comment'
  return (
    <Link to={targetLink(group)} className="block min-w-0 hover:text-accent">
      <span className="block truncate font-medium">{isComment ? group.target.excerpt || '(내용 없음)' : group.target.title}</span>
      <span className="block truncate text-xs text-muted">{isComment ? `글: ${group.target.title}` : group.target.excerpt}</span>
    </Link>
  )
}

export default function AdminReportsPage() {
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, 'today', {
    keys: ['minCount', 'pendingHours'],
  })
  const appliedExtra = extraFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)
  const [filterAlert, setFilterAlert] = useState<string | null>(null)
  const [handling, setHandling] = useState<ReportGroup | null>(null)

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const list = useApi<Paged<ReportGroup>>(
    `/admin/reports${buildQuery({
      ...dateFilterQuery(appliedDates),
      ...extraQuery(appliedExtra),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )
  const pending = appliedExtra.status === 'pending'

  const apply = (dates = draft, nextExtra = extra) => {
    setFilterAlert(null)
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(nextExtra) })
  }
  const submit = () => {
    const message = optionalIntError(extra.minCount, '신고 건수') || optionalIntError(extra.pendingHours, '대기 시간')
    if (message) {
      setFilterAlert(message)
      return
    }
    apply()
  }
  const reset = () => {
    const dates = emptyDateFilter()
    setDraft(dates)
    setExtra(EMPTY_EXTRA)
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(EMPTY_EXTRA) }, { replace: true })
  }
  const applyPreset = (id: string) => {
    const dates = emptyDateFilter()
    let next = { ...EMPTY_EXTRA }
    if (id === 'today-chat') next = { ...next, targetType: 'chat' }
    if (id === 'today-min5') next = { ...next, minCount: '5' }
    if (id === 'pending-24') {
      dates.range = 'all'
      next = { ...next, pendingHours: '24' }
    }
    setDraft(dates)
    setExtra(next)
    apply(dates, next)
  }

  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.status !== 'pending') {
    chips.push({
      key: 'status',
      label: `상태: ${REPORT_STATUS_LABELS[appliedExtra.status]}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, status: 'pending' }),
    })
  }
  if (appliedExtra.targetType) {
    chips.push({
      key: 'targetType',
      label: `대상: ${REPORT_TARGET_LABELS[appliedExtra.targetType]}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, targetType: '' }),
    })
  }
  if (appliedExtra.reason) {
    chips.push({
      key: 'reason',
      label: `사유: ${REPORT_REASON_LABELS[appliedExtra.reason]}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, reason: '' }),
    })
  }
  if (appliedExtra.minCount) {
    chips.push({
      key: 'minCount',
      label: `${appliedExtra.minCount}건 이상`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, minCount: '' }),
    })
  }
  if (appliedExtra.pendingHours) {
    chips.push({
      key: 'pendingHours',
      label: `${appliedExtra.pendingHours}시간 이상 미처리`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, pendingHours: '' }),
    })
  }

  const total = list.data?.total ?? 0

  return (
    <div>
      <PageHeader icon={<IconFlag size={20} />} title="신고 처리" subtitle="회원이 신고한 글과 댓글을 대상별로 묶어 확인하고 처리합니다." />
      <ListFilterBar
        dateLabel="신고일 기준"
        searchPlaceholder="대상 내용, 작성자 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={submit}
        onReset={reset}
        restoreNotice={restoreNotice}
        alert={filterAlert}
        advancedCount={advancedCountOf(appliedExtra)}
        chips={chips}
        presets={[
          { id: 'today-chat', label: '오늘 응원방 신고' },
          { id: 'today-min5', label: '오늘 5건 이상 미처리' },
          { id: 'pending-24', label: '전체 24시간 이상 미처리' },
        ]}
        onPreset={applyPreset}
        basic={
          <>
            <OptionButtons
              label="상태"
              value={extra.status}
              onChange={(value) => setExtra({ ...extra, status: value || 'pending' })}
              items={(Object.keys(REPORT_STATUS_LABELS) as ReportStatus[]).map((s) => ({ value: s, label: REPORT_STATUS_LABELS[s] }))}
            />
            <OptionButtons
              label="대상"
              value={extra.targetType}
              onChange={(value) => setExtra({ ...extra, targetType: value })}
              items={[
                { value: '', label: '전체 대상' },
                { value: 'post', label: '글' },
                { value: 'comment', label: '댓글' },
                { value: 'chat', label: '응원방' },
              ]}
            />
            <FilterChoice
              label="정렬"
              value={extra.sort}
              onChange={(value) => setExtra({ ...extra, sort: value || 'latest' })}
              items={[
                { value: 'latest', label: '최근 신고순' },
                { value: 'pending_old', label: '오래된 미처리순' },
                { value: 'count', label: '신고 건수순' },
              ]}
            />
          </>
        }
        advanced={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="사유">
              <FilterChoice
                label="사유"
                value={extra.reason}
                onChange={(value) => setExtra({ ...extra, reason: toReason(value) })}
                items={[{ value: '', label: '전체 사유' }, ...REPORT_REASONS.map((r) => ({ value: r, label: REPORT_REASON_LABELS[r] }))]}
              />
            </Field>
            <Field label="신고 건수 이상">
              <input value={extra.minCount} onChange={(e) => setExtra({ ...extra, minCount: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 5" />
            </Field>
            <Field label="미처리 경과 시간">
              <input value={extra.pendingHours} onChange={(e) => setExtra({ ...extra, pendingHours: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 24" />
            </Field>
          </div>
        }
        summary={<p className="text-xs text-dim">{resultCountText(total, qs.page, qs.pageSize, '건')}</p>}
      />

      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <ErrorBox message={list.error} onRetry={list.reload} />
      ) : !list.data || list.data.items.length === 0 ? (
        <EmptyState
          icon={<IconFlag size={20} />}
          title="선택한 신고일 기간과 검색어에 맞는 신고가 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates), appliedExtra)} onReset={reset} />}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-edge bg-card">
            <table className="w-full min-w-[1040px] text-sm">
              <thead className="border-b border-edge">
                <tr>
                  <th className={thCls}>대상</th>
                  <th className={thCls}>내용</th>
                  <th className={thCls}>작성자</th>
                  <th className={`${thCls} text-right`}>신고</th>
                  <th className={thCls}>사유</th>
                  <th className={thCls}>상태</th>
                  <th className={thCls}>최근 신고</th>
                  <th className={`${thCls} text-right`}>{pending ? '관리' : '처리'}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((g) => (
                  <tr key={`${g.targetType}-${g.targetId}`} className={trCls}>
                    <td className={tdCls}>
                      <Pill tone={g.targetType === 'post' ? 'blue' : g.targetType === 'chat' ? 'gold' : 'gray'}>{REPORT_TARGET_LABELS[g.targetType]}</Pill>
                    </td>
                    <td className={`${tdCls} h-auto max-w-80 py-2`}>
                      <TargetCell group={g} />
                    </td>
                    <td className={`${tdCls} text-dim`}>{g.target.author.nickname}</td>
                    <td className={`${tdCls} text-right`}>
                      <Pill tone="red">{g.reportCount}건</Pill>
                    </td>
                    <td className={`${tdCls} h-auto py-2 whitespace-normal`}>
                      <ReasonChips group={g} />
                    </td>
                    <td className={tdCls}>
                      <TargetStatus group={g} />
                    </td>
                    <td className={`${tdCls} text-dim tabular-nums`}>{formatShort(g.latestAt)}</td>
                    <td className={`${tdCls} text-right`}>
                      {pending ? (
                        <button type="button" onClick={() => setHandling(g)} className={btnSmPrimary}>
                          처리
                        </button>
                      ) : (
                        <span className="inline-block max-w-56 text-right text-xs leading-snug whitespace-normal">
                          <span className="block text-dim">
                            {g.handledBy?.nickname ?? '-'}
                            {g.handledAt && <span className="ml-1 tabular-nums">{formatShort(g.handledAt)}</span>}
                          </span>
                          {g.handleNote && (
                            <span className="block truncate text-muted" title={g.handleNote}>
                              {g.handleNote}
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={qs.page}
            pageSize={qs.pageSize}
            total={list.data.total}
            onPage={(p) => qs.update({ page: p })}
            onPageSize={(size) => qs.update({ pageSize: size })}
          />
        </>
      )}

      {handling && (
        <ResolveModal
          group={handling}
          onClose={() => setHandling(null)}
          onDone={() => {
            setHandling(null)
            list.reload()
          }}
        />
      )}
    </div>
  )
}

function ResolveModal({ group, onClose, onDone }: { group: ReportGroup; onClose: () => void; onDone: () => void }) {
  const { refreshCounts } = useAdminContext()
  const [action, setAction] = useState<ResolveAction>('hide')
  const [blockDays, setBlockDays] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const canBlock = action !== 'dismiss'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const text = note.trim()
    if (text.length > NOTE_MAX) return setError(`메모는 ${NOTE_MAX}자까지 쓸 수 있습니다.`)
    const block = canBlock && blockDays !== '' ? Number(blockDays) : null
    const label = ACTIONS.find((a) => a.value === action)?.label ?? action
    const blockText = block === null ? '' : `\n작성자 ${group.target.author.nickname} 님을 ${block === 0 ? '영구' : `${block}일`} 차단합니다.`
    if (!window.confirm(`신고 ${group.reportCount}건을 '${label}'(으)로 처리할까요?${blockText}`)) return
    setSending(true)
    setError(null)
    try {
      await apiFetch<ReportGroup>('/admin/reports/resolve', {
        method: 'POST',
        body: {
          targetType: group.targetType,
          targetId: group.targetId,
          action,
          ...(text ? { note: text } : {}),
          ...(block === null ? {} : { blockDays: block }),
        },
      })
      refreshCounts()
      onDone()
    } catch (err) {
      setError(errorMessage(err))
      setSending(false)
    }
  }

  return (
    <Modal title={`신고 처리 · ${REPORT_TARGET_LABELS[group.targetType]} #${group.targetId}`} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="rounded-lg border border-edge bg-input px-4 py-3 text-sm">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <TargetStatus group={group} />
            <span className="text-dim">작성자 {group.target.author.nickname}</span>
            <Link to={targetLink(group)} target="_blank" className="ml-auto text-xs font-semibold text-accent hover:text-accent-strong">
              원문 보기 →
            </Link>
          </div>
          <p className="font-semibold">{group.target.title}</p>
          {group.target.excerpt && <p className="mt-1 line-clamp-3 text-xs text-dim">{group.target.excerpt}</p>}
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-dim">신고 {group.reportCount}건</span>
            <ReasonChips group={group} />
            <span className="ml-auto text-xs text-muted tabular-nums">최근 {formatDateTime(group.latestAt)}</span>
          </div>
          {group.details.length === 0 ? (
            <p className="rounded-lg border border-dashed border-edge px-3 py-3 text-center text-xs text-muted">상세 내용을 남긴 신고가 없습니다.</p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-edge-soft p-2">
              {group.details.map((d, i) => (
                <li key={i} className="rounded-md bg-card px-3 py-1.5 text-xs leading-relaxed whitespace-pre-line text-fg/90">
                  {d}
                </li>
              ))}
            </ul>
          )}
        </div>

        <fieldset className="space-y-1.5 border-t border-edge pt-4">
          <legend className="mb-1.5 text-xs font-semibold text-dim">처리 방법</legend>
          {ACTIONS.map((a) => (
            <label
              key={a.value}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 ${
                action === a.value ? 'border-accent bg-accent-soft/40' : 'border-edge hover:bg-card-hover'
              }`}
            >
              <input
                type="radio"
                name="action"
                value={a.value}
                checked={action === a.value}
                onChange={() => setAction(a.value)}
                className="mt-0.5 accent-[var(--color-accent)]"
              />
              <span>
                <span className="block text-sm font-semibold">{a.label}</span>
                <span className="block text-xs text-dim">{a.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <Field label="작성자 차단" hint={canBlock ? '차단하면 작성자의 로그인 세션도 모두 끊깁니다.' : '기각할 때는 작성자를 차단하지 않습니다.'}>
          <select
            value={canBlock ? blockDays : ''}
            disabled={!canBlock}
            onChange={(e) => setBlockDays(e.target.value)}
            className={`${selectCls} w-48 disabled:opacity-50`}
          >
            <option value="">차단 안 함</option>
            {BLOCK_DAY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="처리 메모" hint={`선택 입력 (${note.length}/${NOTE_MAX})`}>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={NOTE_MAX} className={textareaCls} />
        </Field>

        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            취소
          </button>
          <button type="submit" disabled={sending} className={btnPrimary}>
            {sending ? '처리 중...' : '처리'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
