import { useEffect, useState } from 'react'
import { EmptyFilterActions, ListFilterBar, OptionButtons, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../components/filters'
import { IconMail } from '../components/icons'
import { EmptyState, ErrorBox, FormError, Loading, PageHeader, Pagination, Pill } from '../components/ui'
import { apiFetch, buildQuery, errorMessage, useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime, formatShort } from '../lib/format'
import { dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../lib/list-query'
import { useQueryState } from '../lib/params'
import { btnSmDanger, cardCls } from '../lib/styles'
import type { Message, MessageList } from '../lib/types'

type Extra = { unread: '' | 'true' }
const EMPTY_EXTRA: Extra = { unread: '' }

export default function MessagesPage() {
  const { refreshUnread } = useAuth()
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs)
  const appliedExtra: Extra = { unread: qs.get('unread') === 'true' ? 'true' : '' }
  const [extra, setExtra] = useState(appliedExtra)
  const [openId, setOpenId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const { data, loading, error, reload } = useApi<MessageList>(
    `/messages${buildQuery({
      ...dateFilterQuery(appliedDates),
      unread: appliedExtra.unread || null,
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )

  const apply = (dates = draft, nextExtra = extra) => qs.update({ ...serializeDateFilter(dates), unread: nextExtra.unread || null })
  const reset = () => {
    const dates = emptyDateFilter()
    setDraft(dates)
    setExtra(EMPTY_EXTRA)
    qs.update({ ...serializeDateFilter(dates), unread: null }, { replace: true })
  }
  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.unread) {
    chips.push({ key: 'unread', label: '안 읽음', onRemove: () => apply(appliedDates, { unread: '' }) })
  }

  const onToggle = async (message: Message) => {
    if (openId === message.id) return setOpenId(null)
    setOpenId(message.id)
    if (message.readAt) return
    setActionError(null)
    try {
      await apiFetch<Message>(`/messages/${message.id}/read`, { method: 'POST' })
      reload()
      refreshUnread()
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  const onDelete = async (message: Message) => {
    if (!window.confirm('이 쪽지를 삭제할까요?')) return
    setBusyId(message.id)
    setActionError(null)
    try {
      await apiFetch<void>(`/messages/${message.id}`, { method: 'DELETE' })
      if (openId === message.id) setOpenId(null)
      reload()
      refreshUnread()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <PageHeader
        icon={<IconMail size={20} />}
        title="쪽지함"
        subtitle={data ? `읽지 않은 쪽지 ${data.unreadCount}개` : '운영진이 보낸 쪽지를 확인합니다.'}
      />
      <ListFilterBar
        dateLabel="받은 시각 기준"
        searchPlaceholder="제목, 내용 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        chips={chips}
        basic={
          <OptionButtons
            label="읽음"
            value={extra.unread}
            onChange={(value) => setExtra({ unread: value })}
            items={[
              { value: '', label: '전체' },
              { value: 'true', label: '안 읽음' },
            ]}
          />
        }
        summary={<p className="text-xs text-dim">{resultCountText(data?.total ?? 0, qs.page, qs.pageSize, '건')}</p>}
      />
      {actionError && (
        <div className="mb-3">
          <FormError message={actionError} />
        </div>
      )}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<IconMail size={20} />}
          title="선택한 받은 시각 기간과 검색어에 맞는 쪽지가 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates), appliedExtra)} onReset={reset} />}
        />
      ) : (
        <>
          <ul className={`${cardCls} overflow-hidden`}>
            {data.items.map((m) => (
              <li key={m.id} className="border-b border-edge-soft last:border-b-0">
                <button
                  type="button"
                  onClick={() => void onToggle(m)}
                  aria-expanded={openId === m.id}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-card-hover"
                >
                  <span className={`size-2 shrink-0 rounded-full ${m.readAt ? 'bg-transparent' : 'bg-accent'}`} />
                  <span className={`min-w-0 flex-1 truncate ${m.readAt ? 'text-dim' : 'font-semibold'}`}>{m.title}</span>
                  {!m.readAt && <Pill tone="green">새 쪽지</Pill>}
                  <span className="shrink-0 text-xs text-muted tabular-nums">{formatShort(m.createdAt)}</span>
                </button>
                {openId === m.id && (
                  <div className="border-t border-edge-soft bg-panel px-9 py-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted">
                      <span>받은 시각 {formatDateTime(m.createdAt)}</span>
                      <button type="button" disabled={busyId === m.id} onClick={() => void onDelete(m)} className={btnSmDanger}>
                        {busyId === m.id ? '삭제 중...' : '삭제'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pagination
            page={qs.page}
            pageSize={qs.pageSize}
            total={data.total}
            onPage={(p) => qs.update({ page: p }, true)}
            onPageSize={(size) => qs.update({ pageSize: size })}
          />
        </>
      )}
    </div>
  )
}
