import { useState } from 'react'
import { Link } from 'react-router'
import { apiFetch, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime } from '../lib/format'
import { btnPrimary, btnSecondary } from '../lib/styles'
import type { OpenPoll, PostPoll } from '../lib/types'
import { FormError } from './ui'

export function PollCard({
  postId,
  poll,
  onChanged,
}: {
  postId: number
  poll: PostPoll
  onChanged?: (next: PostPoll) => void
}) {
  const { user } = useAuth()
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const vote = async (optionId: number) => {
    if (!user) {
      setError('투표하려면 로그인이 필요합니다.')
      return
    }
    if (poll.closed) return
    setBusy(optionId)
    setError(null)
    try {
      const next = await apiFetch<PostPoll>(`/posts/${postId}/poll/vote`, {
        method: 'POST',
        body: { optionId },
      })
      onChanged?.(next)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-lg border border-edge bg-panel p-4">
      <p className="mb-3 text-xs text-dim">
        {poll.closed ? '마감된 투표' : `마감 ${formatDateTime(poll.closesAt)}`} · {poll.totalVotes}명 참여
      </p>
      <ul className="space-y-2">
        {poll.options.map((option) => {
          const mine = poll.myOptionId === option.id
          const showResult = poll.closed || poll.myOptionId !== null
          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={poll.closed || busy !== null}
                onClick={() => void vote(option.id)}
                className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm ${
                  mine ? 'border-accent/60 bg-accent-soft' : 'border-edge bg-card hover:bg-card-hover'
                } disabled:cursor-not-allowed`}
              >
                {showResult && (
                  <span
                    className="absolute inset-y-0 left-0 bg-accent/15"
                    style={{ width: `${option.percent}%` }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-between gap-2">
                  <span>{option.label}</span>
                  {showResult && (
                    <span className="shrink-0 tabular-nums text-xs text-dim">
                      {option.votes}표 · {option.percent}%
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {poll.closed ? (
        <p className="mt-2 text-xs text-muted">마감 후에는 선택을 바꿀 수 없습니다.</p>
      ) : user ? (
        <p className="mt-2 text-xs text-muted">마감 전에는 선택을 바꿀 수 있습니다. 회원당 한 표입니다.</p>
      ) : (
        <p className="mt-2 text-xs text-muted">로그인하면 투표할 수 있습니다.</p>
      )}
      <FormError message={error} />
    </div>
  )
}

export function OpenPollList({ items }: { items: OpenPoll[] }) {
  if (items.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-dim">진행 중인 투표가 없습니다.</p>
  }
  return (
    <ul>
      {items.map((item) => (
        <li key={item.postId} className="border-b border-edge-soft last:border-b-0">
          <Link to={`/posts/${item.postId}`} className="block px-4 py-2.5 hover:bg-card-hover">
            <p className="truncate text-sm font-semibold">{item.title}</p>
            <p className="mt-1 truncate text-xs text-dim">
              {item.options.map((option) => option.label).join(' · ')} · {item.totalVotes}명
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function PollEditor({
  enabled,
  options,
  closesAt,
  locked,
  onEnabled,
  onOptions,
  onClosesAt,
}: {
  enabled: boolean
  options: string[]
  closesAt: string
  locked: boolean
  onEnabled: (value: boolean) => void
  onOptions: (value: string[]) => void
  onClosesAt: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={enabled} disabled={locked} onChange={(e) => onEnabled(e.target.checked)} />
        투표 넣기
      </label>
      {enabled && (
        <div className="space-y-2 rounded-lg border border-edge p-3">
          {locked && <p className="text-xs text-gold">표가 있어 선택지를 바꿀 수 없습니다.</p>}
          {options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <input
                value={option}
                disabled={locked}
                maxLength={40}
                onChange={(e) => {
                  const next = [...options]
                  next[index] = e.target.value
                  onOptions(next)
                }}
                placeholder={`선택지 ${index + 1}`}
                className="h-9 min-w-0 flex-1 rounded-lg border border-edge bg-input px-3 text-sm"
              />
              {options.length > 2 && !locked && (
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => onOptions(options.filter((_, i) => i !== index))}
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          {options.length < 10 && !locked && (
            <button type="button" className={btnPrimary} onClick={() => onOptions([...options, ''])}>
              선택지 추가
            </button>
          )}
          <label className="block text-xs font-semibold text-dim">
            마감
            <input
              type="datetime-local"
              value={closesAt}
              disabled={locked}
              onChange={(e) => onClosesAt(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-edge bg-input px-3 text-sm"
            />
          </label>
        </div>
      )}
    </div>
  )
}

export function defaultPollCloseLocal(): string {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function toLocalInput(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return defaultPollCloseLocal()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString()
}
