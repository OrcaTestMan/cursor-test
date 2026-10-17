import { useState, type FormEvent } from 'react'
import { IconHeadset } from '../../components/icons'
import { EmptyState, ErrorBox, FormError, FormSuccess, InquiryStatusPill, Loading, PageHeader, Pagination, SegmentedTabs, type TabItem } from '../../components/ui'
import { useAdminContext } from '../../lib/admin'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { formatDateTime, formatShort, toPositiveInt } from '../../lib/format'
import { useQueryState } from '../../lib/params'
import { btnPrimary, cardCls, textareaCls } from '../../lib/styles'
import type { AdminInquiry, InquiryStatus, Paged } from '../../lib/types'

type StatusTab = InquiryStatus | 'all'

const STATUS_TABS: TabItem<StatusTab>[] = [
  { value: 'all', label: '전체' },
  { value: 'waiting', label: '답변 대기' },
  { value: 'answered', label: '답변 완료' },
]

export default function AdminInquiriesPage() {
  const qs = useQueryState()
  const statusParam = qs.get('status')
  const status: StatusTab = statusParam === 'waiting' || statusParam === 'answered' ? statusParam : 'all'
  const selectedId = toPositiveInt(qs.get('id'))
  const list = useApi<Paged<AdminInquiry>>(
    `/admin/inquiries${buildQuery({ status: status === 'all' ? null : status, page: qs.page, pageSize: qs.pageSize })}`,
  )

  return (
    <div>
      <PageHeader icon={<IconHeadset size={20} />} title="1:1 문의 관리" subtitle="회원 문의를 확인하고 답변합니다. 답변 대기 문의가 먼저 보입니다." />
      <div className="mb-4">
        <SegmentedTabs items={STATUS_TABS} value={status} onChange={(v) => qs.update({ status: v === 'all' ? null : v })} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          {list.loading ? (
            <Loading />
          ) : list.error ? (
            <ErrorBox message={list.error} onRetry={list.reload} />
          ) : !list.data || list.data.items.length === 0 ? (
            <EmptyState icon={<IconHeadset size={20} />} title="문의가 없습니다" description="회원 문의가 들어오면 여기에 표시됩니다." />
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
