import { useEffect, useState, type FormEvent } from 'react'
import { UserPicker } from '../../components/admin/UserPicker'
import { EmptyFilterActions, ListFilterBar, OptionButtons, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../../components/filters'
import { IconClose, IconSend } from '../../components/icons'
import { Card, EmptyState, ErrorBox, Field, FormError, FormSuccess, Loading, PageHeader, Pagination, Pill } from '../../components/ui'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { formatShort, toPositiveInt } from '../../lib/format'
import { dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../../lib/list-query'
import { useQueryState } from '../../lib/params'
import { btnPrimary, cardCls, inputCls, tdCls, textareaCls, thCls, trCls } from '../../lib/styles'
import type { AdminUser, Author, Paged, SentMessage } from '../../lib/types'

type Extra = {
  toAll: '' | 'true' | 'false'
  toUserId: string
  unreadOnly: '' | 'true'
}

const EMPTY_EXTRA: Extra = { toAll: '', toUserId: '', unreadOnly: '' }

function extraFromParams(get: (key: string) => string): Extra {
  const toAll = get('toAll')
  return {
    toAll: toAll === 'true' || toAll === 'false' ? toAll : '',
    toUserId: get('toUserId'),
    unreadOnly: get('unreadOnly') === 'true' ? 'true' : '',
  }
}

function extraQuery(extra: Extra): Record<string, string | null> {
  return {
    toAll: extra.toAll || null,
    toUserId: extra.toUserId || null,
    unreadOnly: extra.unreadOnly || null,
  }
}

export default function AdminMessagesPage() {
  const qs = useQueryState()
  const toId = toPositiveInt(qs.get('to'))
  const preset = useApi<AdminUser>(toId ? `/admin/users/${toId}` : null)
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs)
  const appliedExtra = extraFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const history = useApi<Paged<SentMessage>>(
    `/admin/messages${buildQuery({
      ...dateFilterQuery(appliedDates),
      ...extraQuery(appliedExtra),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )

  const apply = (dates = draft, nextExtra = extra) => {
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(nextExtra) })
  }
  const reset = () => {
    const dates = emptyDateFilter()
    setDraft(dates)
    setExtra(EMPTY_EXTRA)
    qs.update({ ...serializeDateFilter(dates), ...extraQuery(EMPTY_EXTRA) }, { replace: true })
  }

  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.toAll) {
    chips.push({
      key: 'toAll',
      label: appliedExtra.toAll === 'true' ? '전체 발송' : '개별 발송',
      onRemove: () => apply(appliedDates, { ...appliedExtra, toAll: '' }),
    })
  }
  if (appliedExtra.toUserId) {
    chips.push({
      key: 'toUserId',
      label: `받는 회원: #${appliedExtra.toUserId}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, toUserId: '' }),
    })
  }
  if (appliedExtra.unreadOnly) {
    chips.push({
      key: 'unreadOnly',
      label: '미읽음만',
      onRemove: () => apply(appliedDates, { ...appliedExtra, unreadOnly: '' }),
    })
  }

  const total = history.data?.total ?? 0

  return (
    <div className="space-y-5">
      <PageHeader icon={<IconSend size={20} />} title="쪽지 발송" subtitle="전체 회원 또는 특정 회원에게 쪽지를 보냅니다." />
      {toId && preset.loading ? (
        <Loading />
      ) : (
        <SendForm
          key={preset.data?.id ?? 'all'}
          initialTarget={preset.data ? { id: preset.data.id, nickname: preset.data.nickname } : null}
          presetError={toId ? (preset.error ?? null) : null}
          onSent={history.reload}
        />
      )}

      <Card title="보낸 쪽지">
        <div className="p-4">
          <ListFilterBar
            dateLabel="발송일 기준"
            searchPlaceholder="제목, 내용, 받는 사람 검색"
            draft={draft}
            applied={appliedDates}
            onDraft={setDraft}
            onSubmit={() => apply()}
            onReset={reset}
            restoreNotice={restoreNotice}
            advancedCount={[appliedExtra.toUserId, appliedExtra.unreadOnly].filter(Boolean).length}
            chips={chips}
            basic={
              <OptionButtons
                label="발송 대상"
                value={extra.toAll}
                onChange={(value) => setExtra({ ...extra, toAll: value })}
                items={[
                  { value: '', label: '전체' },
                  { value: 'true', label: '전체 발송' },
                  { value: 'false', label: '개별 발송' },
                ]}
              />
            }
            advanced={
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="받는 회원번호">
                  <input value={extra.toUserId} onChange={(e) => setExtra({ ...extra, toUserId: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 12" />
                </Field>
                <OptionButtons
                  label="읽음"
                  value={extra.unreadOnly}
                  onChange={(value) => setExtra({ ...extra, unreadOnly: value })}
                  items={[
                    { value: '', label: '전체' },
                    { value: 'true', label: '미읽음만' },
                  ]}
                />
              </div>
            }
            summary={<p className="text-xs text-dim">{resultCountText(total, qs.page, qs.pageSize, '건')}</p>}
          />
          {history.loading ? (
            <Loading />
          ) : history.error ? (
            <ErrorBox message={history.error} onRetry={history.reload} />
          ) : !history.data || history.data.items.length === 0 ? (
            <EmptyState
              icon={<IconSend size={20} />}
              title="선택한 발송일 기간과 검색어에 맞는 쪽지가 없습니다."
              description="기간을 넓히거나 조건을 초기화해 보세요."
              action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates), appliedExtra)} onReset={reset} />}
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-edge">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b border-edge">
                    <tr>
                      <th className={thCls}>ID</th>
                      <th className={thCls}>받는 사람</th>
                      <th className={thCls}>제목</th>
                      <th className={thCls}>내용</th>
                      <th className={`${thCls} text-right`}>보낸 시각</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.data.items.map((m) => (
                      <tr key={m.id} className={trCls}>
                        <td className={`${tdCls} text-muted`}>#{m.id}</td>
                        <td className={tdCls}>
                          {m.toAll ? <Pill tone="green">전체 회원</Pill> : <span className="font-semibold">{m.to?.nickname ?? '-'}</span>}
                        </td>
                        <td className={`${tdCls} max-w-56 truncate font-medium`}>{m.title}</td>
                        <td className={`${tdCls} max-w-72 truncate text-dim`} title={m.body}>
                          {m.body}
                        </td>
                        <td className={`${tdCls} text-right text-dim tabular-nums`}>{formatShort(m.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={qs.page}
                pageSize={qs.pageSize}
                total={history.data.total}
                onPage={(p) => qs.update({ page: p }, true)}
                onPageSize={(size) => qs.update({ pageSize: size }, true)}
              />
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

function SendForm({
  initialTarget,
  presetError,
  onSent,
}: {
  initialTarget: Author | null
  presetError: string | null
  onSent: () => void
}) {
  const [mode, setMode] = useState<'all' | 'one'>(initialTarget ? 'one' : 'all')
  const [target, setTarget] = useState<Author | null>(initialTarget)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(presetError)
  const [done, setDone] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setDone(null)
    const t = title.trim()
    const b = body.trim()
    const problems: string[] = []
    if (mode === 'one' && !target) problems.push('받는 회원을 선택해 주세요.')
    if (!t || t.length > 100) problems.push('제목은 1~100자로 입력해 주세요.')
    if (!b || b.length > 2000) problems.push('내용은 1~2000자로 입력해 주세요.')
    if (problems.length > 0) return setError(problems.join('\n'))
    if (mode === 'all' && !window.confirm('활성 회원 전체에게 쪽지를 보낼까요?')) return

    setSending(true)
    setError(null)
    try {
      const res = await apiFetch<{ sent: number }>('/admin/messages', {
        method: 'POST',
        body: mode === 'all' ? { toAll: true, title: t, body: b } : { toUserId: target?.id, title: t, body: b },
      })
      setTitle('')
      setBody('')
      setDone(`${res.sent.toLocaleString('ko-KR')}명에게 쪽지를 보냈습니다.`)
      onSent()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const radio = (value: 'all' | 'one', label: string) => (
    <label
      className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold ${
        mode === value ? 'border-accent/50 bg-accent-soft text-accent' : 'border-edge bg-card text-dim'
      }`}
    >
      <input type="radio" name="target" checked={mode === value} onChange={() => setMode(value)} className="accent-accent" />
      {label}
    </label>
  )

  return (
    <form onSubmit={onSubmit} className={`${cardCls} space-y-4 p-5`} noValidate>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-dim">받는 사람</p>
        <div className="flex flex-wrap gap-2">
          {radio('all', '전체 회원')}
          {radio('one', '특정 회원')}
        </div>
      </div>
      {mode === 'one' &&
        (target ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 items-center gap-2 rounded-lg bg-accent-soft px-3 text-sm font-semibold text-accent">
              {target.nickname} <span className="text-xs font-normal">#{target.id}</span>
              <button type="button" aria-label="선택 해제" onClick={() => setTarget(null)} className="hover:text-fg">
                <IconClose size={14} />
              </button>
            </span>
          </div>
        ) : (
          <UserPicker onPick={setTarget} />
        ))}
      <Field label="제목">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className={inputCls} />
      </Field>
      <Field label="내용" hint={`${body.length}/2000`}>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={2000} className={textareaCls} />
      </Field>
      <FormError message={error} />
      <FormSuccess message={done} />
      <div className="flex justify-end">
        <button type="submit" disabled={sending} className={btnPrimary}>
          <IconSend size={14} /> {sending ? '보내는 중...' : '쪽지 보내기'}
        </button>
      </div>
    </form>
  )
}

