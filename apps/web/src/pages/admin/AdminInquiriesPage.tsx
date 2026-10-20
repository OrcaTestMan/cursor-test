import { useEffect, useState, type FormEvent } from 'react'
import { EmptyFilterActions, FilterChoice, ListFilterBar, OptionButtons, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../../components/filters'
import { IconHeadset } from '../../components/icons'
import { EmptyState, ErrorBox, Field, FormError, FormSuccess, InquiryStatusPill, Loading, PageHeader, Pagination } from '../../components/ui'
import { useAdminContext } from '../../lib/admin'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { formatDateTime, formatShort, toPositiveInt } from '../../lib/format'
import { dateFilterQuery, emptyDateFilter, optionalIntError, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../../lib/list-query'
import { useQueryState } from '../../lib/params'
import { btnPrimary, cardCls, inputCls, textareaCls } from '../../lib/styles'
import type { AdminInquiry, InquiryStatus, Paged } from '../../lib/types'

type Extra = {
  status: InquiryStatus | ''
  userId: string
  dateField: 'created' | 'answered'
  waitingHours: string
  sort: string
}

const EMPTY_EXTRA: Extra = {
  status: '',
  userId: '',
  dateField: 'created',
  waitingHours: '',
  sort: 'created_desc',
}

function extraFromParams(get: (key: string) => string): Extra {
  const status = get('status')
  return {
    status: status === 'waiting' || status === 'answered' ? status : '',
    userId: get('userId'),
    dateField: get('dateField') === 'answered' ? 'answered' : 'created',
    waitingHours: get('waitingHours'),
    sort: get('sort') || 'created_desc',
  }
}

function extraQuery(extra: Extra): Record<string, string | null> {
  return {
    status: extra.status || null,
    userId: extra.userId || null,
    dateField: extra.dateField === 'answered' ? 'answered' : null,
    waitingHours: extra.waitingHours || null,
    sort: extra.sort === 'created_desc' ? null : extra.sort,
  }
}

function advancedCountOf(extra: Extra) {
  return [extra.userId, extra.waitingHours].filter(Boolean).length
}

export default function AdminInquiriesPage() {
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, 'today', { keys: ['waitingHours'] })
  const appliedExtra = extraFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)
  const [filterAlert, setFilterAlert] = useState<string | null>(null)
  const selectedId = toPositiveInt(qs.get('id'))

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const list = useApi<Paged<AdminInquiry>>(
    `/admin/inquiries${buildQuery({
      ...dateFilterQuery(appliedDates),
      ...extraQuery(appliedExtra),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )

  const apply = (dates = draft, nextExtra = extra) => {
    setFilterAlert(null)
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(nextExtra) })
  }
  const submit = () => {
    const message = optionalIntError(extra.waitingHours, '대기 시간')
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
    if (id === 'today-waiting') next = { ...next, status: 'waiting' }
    if (id === 'waiting-24') {
      dates.range = 'all'
      next = { ...next, status: 'waiting', waitingHours: '24' }
    }
    setDraft(dates)
    setExtra(next)
    apply(dates, next)
  }

  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.status) {
    chips.push({
      key: 'status',
      label: `상태: ${appliedExtra.status === 'waiting' ? '답변 대기' : '답변 완료'}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, status: '' }),
    })
  }
  if (appliedExtra.userId) {
    chips.push({
      key: 'userId',
      label: `회원: #${appliedExtra.userId}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, userId: '' }),
    })
  }
  if (appliedExtra.waitingHours) {
    chips.push({
      key: 'waitingHours',
      label: `${appliedExtra.waitingHours}시간 이상 대기`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, waitingHours: '' }),
    })
  }

  const dateLabel = appliedExtra.dateField === 'answered' ? '답변일 기준' : '문의일 기준'
  const total = list.data?.total ?? 0

  return (
    <div>
      <PageHeader icon={<IconHeadset size={20} />} title="1:1 문의 관리" subtitle="회원 문의를 확인하고 답변합니다. 답변 대기 문의가 먼저 보입니다." />
      <ListFilterBar
        dateLabel={dateLabel}
        searchPlaceholder="제목, 내용, 닉네임 검색"
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
          { id: 'today-waiting', label: '오늘 답변 대기' },
          { id: 'waiting-24', label: '전체 24시간 이상 대기' },
        ]}
        onPreset={applyPreset}
        basic={
          <>
            <OptionButtons
              label="상태"
              value={extra.status}
              onChange={(value) => setExtra({ ...extra, status: value })}
              items={[
                { value: '', label: '전체 상태' },
                { value: 'waiting', label: '답변 대기' },
                { value: 'answered', label: '답변 완료' },
              ]}
            />
            <OptionButtons
              label="날짜 기준"
              value={extra.dateField}
              onChange={(value) => setExtra({ ...extra, dateField: value || 'created' })}
              items={[
                { value: 'created', label: '문의일' },
                { value: 'answered', label: '답변일' },
              ]}
            />
            <FilterChoice
              label="정렬"
              value={extra.sort}
              onChange={(value) => setExtra({ ...extra, sort: value || 'created_desc' })}
              items={[
                { value: 'created_desc', label: '문의 최신순' },
                { value: 'waiting_desc', label: '대기 오래된 순' },
              ]}
            />
          </>
        }
        advanced={
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="회원번호">
              <input value={extra.userId} onChange={(e) => setExtra({ ...extra, userId: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 12" />
            </Field>
            <Field label="대기 시간(시간 이상)">
              <input value={extra.waitingHours} onChange={(e) => setExtra({ ...extra, waitingHours: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 24" />
            </Field>
          </div>
        }
        summary={<p className="text-xs text-dim">{resultCountText(total, qs.page, qs.pageSize, '건')}</p>}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          {list.loading ? (
            <Loading />
          ) : list.error ? (
            <ErrorBox message={list.error} onRetry={list.reload} />
          ) : !list.data || list.data.items.length === 0 ? (
            <EmptyState
              icon={<IconHeadset size={20} />}
              title="선택한 문의일 기간과 검색어에 맞는 문의가 없습니다."
              description="기간을 넓히거나 조건을 초기화해 보세요."
              action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates), appliedExtra)} onReset={reset} />}
            />
          ) : (
            <>
              <ul className={`${cardCls} overflow-hidden`}>
                {list.data.items.map((inq) => (
                  <li key={inq.id} className="border-b border-edge-soft last:border-b-0">
                    <button
                      type="button"
                      onClick={() => qs.update({ id: inq.id }, true)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
                        selectedId === inq.id ? 'bg-accent-soft/40' : 'hover:bg-card-hover'
                      }`}
                    >
                      <span className="w-10 shrink-0 text-muted">#{inq.id}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{inq.title}</span>
                        <span className="block text-xs text-dim">{inq.user.nickname}</span>
                      </span>
                      <InquiryStatusPill status={inq.status} />
                      <span className="shrink-0 text-xs text-muted tabular-nums">{formatShort(inq.createdAt)}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <Pagination
                page={qs.page}
                pageSize={qs.pageSize}
                total={list.data.total}
                onPage={(p) => qs.update({ page: p }, true)}
                onPageSize={(size) => qs.update({ pageSize: size })}
              />
            </>
          )}
        </div>
        <div>
          {selectedId ? (
            <InquiryPanel key={selectedId} id={selectedId} onSaved={list.reload} />
          ) : (
            <EmptyState title="문의를 선택하세요" description="왼쪽 목록에서 문의를 고르면 내용과 답변 입력란이 열립니다." />
          )}
        </div>
      </div>
    </div>
  )
}

function InquiryPanel({ id, onSaved }: { id: number; onSaved: () => void }) {
  const { data, loading, error, reload } = useApi<AdminInquiry>(`/admin/inquiries/${id}`)
  if (loading) return <Loading />
  if (error || !data) return <ErrorBox message={error ?? '문의를 찾을 수 없습니다.'} onRetry={reload} />
  return <AnswerForm inquiry={data} onSaved={onSaved} />
}

function AnswerForm({ inquiry, onSaved }: { inquiry: AdminInquiry; onSaved: () => void }) {
  const { refreshCounts } = useAdminContext()
  const [answer, setAnswer] = useState(inquiry.answer ?? '')
  const [current, setCurrent] = useState(inquiry)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setDone(null)
    const text = answer.trim()
    if (!text) return setError('답변 내용을 입력해 주세요.')
    if (text.length > 2000) return setError('답변은 2000자까지 쓸 수 있습니다.')
    setSending(true)
    setError(null)
    try {
      const saved = await apiFetch<AdminInquiry>(`/admin/inquiries/${inquiry.id}/answer`, { method: 'POST', body: { answer: text } })
      setCurrent(saved)
      setDone('답변을 저장했습니다.')
      onSaved()
      refreshCounts()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className={`${cardCls} p-5`}>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-dim">
          <InquiryStatusPill status={current.status} />
          <span className="font-semibold text-fg">{current.user.nickname}</span>
          <span>{formatDateTime(current.createdAt)}</span>
        </div>
        <h2 className="text-lg font-bold break-words">{current.title}</h2>
        <p className="mt-3 text-sm leading-relaxed break-words whitespace-pre-wrap">{current.body}</p>
      </section>
      <form onSubmit={onSubmit} className={`${cardCls} space-y-3 p-5`} noValidate>
        <div className="flex items-center justify-between">
          <h3 className="font-bold">답변</h3>
          {current.answeredAt && <span className="text-xs text-muted">마지막 답변 {formatDateTime(current.answeredAt)}</span>}
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={8}
          maxLength={2000}
          placeholder="회원에게 보낼 답변을 입력하세요."
          aria-label="답변"
          className={textareaCls}
        />
        <FormError message={error} />
        <FormSuccess message={done} />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">{answer.length}/2000</span>
          <button type="submit" disabled={sending} className={btnPrimary}>
            {sending ? '저장 중...' : current.answer ? '답변 수정' : '답변 저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
