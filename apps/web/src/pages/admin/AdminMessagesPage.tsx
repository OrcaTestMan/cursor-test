import { useState, type FormEvent } from 'react'
import { IconClose, IconSearch, IconSend } from '../../components/icons'
import { Card, EmptyState, ErrorBox, Field, FormError, FormSuccess, Loading, PageHeader, Pagination, Pill } from '../../components/ui'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { formatShort, toPositiveInt } from '../../lib/format'
import { useQueryState } from '../../lib/params'
import { btnPrimary, btnSecondary, cardCls, inputCls, tdCls, textareaCls, thCls, trCls } from '../../lib/styles'
import type { AdminUser, Author, Paged, SentMessage } from '../../lib/types'

export default function AdminMessagesPage() {
  const qs = useQueryState()
  const toId = toPositiveInt(qs.get('to'))
  const preset = useApi<AdminUser>(toId ? `/admin/users/${toId}` : null)
  const history = useApi<Paged<SentMessage>>(`/admin/messages${buildQuery({ page: qs.page, pageSize: qs.pageSize })}`)

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
          {history.loading ? (
            <Loading />
          ) : history.error ? (
            <ErrorBox message={history.error} onRetry={history.reload} />
          ) : !history.data || history.data.items.length === 0 ? (
            <EmptyState icon={<IconSend size={20} />} title="보낸 쪽지가 없습니다" />
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

function UserPicker({ onPick }: { onPick: (user: Author) => void }) {
  const [input, setInput] = useState('')
  const [q, setQ] = useState<string | null>(null)
  const result = useApi<Paged<AdminUser>>(q === null ? null : `/admin/users${buildQuery({ q, status: 'active', page: 1, pageSize: 20 })}`)

  return (
    <div className="rounded-lg border border-edge bg-panel p-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                setQ(input.trim())
              }
            }}
            placeholder="아이디 또는 닉네임으로 회원 검색"
            aria-label="회원 검색"
            className={`${inputCls} pl-9`}
          />
        </div>
        <button type="button" onClick={() => setQ(input.trim())} className={btnSecondary}>
          찾기
        </button>
      </div>
      {q !== null && (
        <div className="mt-2 max-h-56 overflow-y-auto">
          {result.loading ? (
            <Loading />
          ) : result.error ? (
            <p className="px-2 py-3 text-xs text-danger">{result.error}</p>
          ) : !result.data || result.data.items.length === 0 ? (
            <p className="px-2 py-3 text-xs text-dim">검색된 회원이 없습니다.</p>
          ) : (
            result.data.items.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onPick({ id: u.id, nickname: u.nickname })}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-card-hover"
              >
                <span className="text-muted">#{u.id}</span>
                <span className="font-semibold">{u.nickname}</span>
                <span className="text-dim">({u.username})</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
