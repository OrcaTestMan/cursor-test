import { useEffect, useRef, useState, type FormEvent } from 'react'
import { apiFetch, errorMessage } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Paged, SocialUser } from '../lib/types'
import { formatTime } from '../lib/format'
import { btnPrimary, btnSmDanger, btnSmSecondary, textareaCls } from '../lib/styles'
import { ReportModal } from './report'
import { Avatar } from './ui'

export type ChatMessage = {
  id: number
  matchId: number
  body: string
  status: 'visible' | 'hidden'
  deleted: boolean
  createdAt: string
  author: { id: number; nickname: string; avatarUploadId?: number | null }
  teamName: string | null
}

type Conn = 'connecting' | 'open' | 'closed'

export function ChatPanel({ matchId }: { matchId: number }) {
  const { user } = useAuth()
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const lastId = useRef(0)
  const [items, setItems] = useState<ChatMessage[]>([])
  const [conn, setConn] = useState<Conn>('connecting')
  const [online, setOnline] = useState<number | null>(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(0)
  const [reportId, setReportId] = useState<number | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const mutedIds = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!user) {
      mutedIds.current = new Set()
      return
    }
    let cancelled = false
    apiFetch<Paged<SocialUser>>('/me/mutes?page=1&pageSize=100').then(
      (data) => {
        if (!cancelled) mutedIds.current = new Set(data.items.map((item) => item.id))
      },
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [user, matchId])

  const merge = (incoming: ChatMessage[]) => {
    const visible = incoming.filter((item) => !mutedIds.current.has(item.author.id))
    if (visible.length === 0) return 0
    setItems((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]))
      for (const item of visible) map.set(item.id, item)
      const next = [...map.values()].sort((a, b) => a.id - b.id)
      lastId.current = next.at(-1)?.id ?? lastId.current
      return next
    })
    return visible.length
  }

  useEffect(() => {
    let cancelled = false
    apiFetch<{ items: ChatMessage[] }>(`/matches/${matchId}/chat`).then(
      (data) => {
        if (!cancelled) merge(data.items)
      },
      (err: unknown) => {
        if (!cancelled) setError(errorMessage(err))
      },
    )
    return () => {
      cancelled = true
    }
  }, [matchId])

  useEffect(() => {
    let ws: WebSocket | null = null
    let closed = false
    let delay = 1000
    const connect = () => {
      if (closed) return
      setConn('connecting')
      const proto = location.protocol === 'https:' ? 'wss' : 'ws'
      ws = new WebSocket(`${proto}://${location.host}/api/chat?matchId=${matchId}`)
      ws.onopen = () => {
        setConn('open')
        delay = 1000
        if (lastId.current > 0) ws?.send(JSON.stringify({ type: 'since', afterId: lastId.current }))
      }
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data as string) as {
          type: string
          message?: ChatMessage | string
          items?: ChatMessage[]
          id?: number
          online?: number
        }
        if (data.type === 'ready' || data.type === 'online') setOnline(data.online ?? null)
        if (data.type === 'message' && data.message && typeof data.message !== 'string') {
          const added = merge([data.message])
          if (added > 0 && !stick.current) setPending((n) => n + added)
        }
        if (data.type === 'catchup' && data.items) merge(data.items)
        if (data.type === 'deleted' && data.id) {
          setItems((prev) => prev.map((item) => (item.id === data.id ? { ...item, deleted: true, body: '' } : item)))
        }
        if (data.type === 'error') setError(typeof data.message === 'string' ? data.message : '오류가 발생했습니다.')
      }
      ws.onclose = () => {
        setConn('closed')
        if (!closed) window.setTimeout(connect, delay)
        delay = Math.min(delay * 2, 15000)
      }
    }
    connect()
    return () => {
      closed = true
      ws?.close()
    }
  }, [matchId])

  useEffect(() => {
    if (stick.current && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight
      setPending(0)
    }
  }, [items])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    if (stick.current) setPending(0)
  }

  const loadMore = async () => {
    const first = items[0]
    if (!first) return
    setLoadingMore(true)
    try {
      const data = await apiFetch<{ items: ChatMessage[] }>(`/matches/${matchId}/chat?beforeId=${first.id}`)
      merge(data.items)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoadingMore(false)
    }
  }

  const onSend = async (e: FormEvent) => {
    e.preventDefault()
    const text = body.trim()
    if (!text) return
    setError(null)
    try {
      await apiFetch(`/matches/${matchId}/chat`, { method: 'POST', body: { body: text } })
      setBody('')
      stick.current = true
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const onDelete = async (id: number) => {
    if (!window.confirm('이 메시지를 지울까요?')) return
    try {
      await apiFetch(`/matches/${matchId}/chat/${id}`, { method: 'DELETE' })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const statusLabel = conn === 'open' ? '연결됨' : conn === 'connecting' ? '연결 중...' : '다시 연결 중...'

  return (
    <section className="rounded-xl border border-edge bg-card">
      <div className="flex items-center justify-between border-b border-edge-soft px-4 py-3">
        <h2 className="text-sm font-bold">응원방</h2>
        <p className="text-xs text-dim">
          {statusLabel}
          {online !== null ? ` · 접속 ${online}명` : ''}
        </p>
      </div>
      <div ref={scroller} onScroll={onScroll} className="max-h-96 min-h-64 overflow-y-auto p-3">
        {items.length > 0 && (
          <button type="button" disabled={loadingMore} onClick={() => void loadMore()} className={`${btnSmSecondary} mb-2`}>
            {loadingMore ? '불러오는 중...' : '이전 대화 더 보기'}
          </button>
        )}
        {items.length === 0 && <p className="py-10 text-center text-sm text-dim">아직 대화가 없습니다. 경기 전에도 이야기할 수 있습니다.</p>}
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="flex gap-2">
              <Avatar name={item.author.nickname} uploadId={item.author.avatarUploadId} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-dim">
                  <span className="font-semibold text-fg">{item.author.nickname}</span>
                  {item.teamName && <span className="ml-1 text-accent">{item.teamName}</span>}
                  <span className="ml-2 tabular-nums">{formatTime(item.createdAt)}</span>
                </p>
                <p className="text-sm break-words">
                  {item.deleted ? <span className="text-muted">삭제된 메시지입니다.</span> : item.body}
                </p>
                {!item.deleted && user && (
                  <span className="mt-1 flex gap-2">
                    {(user.id === item.author.id || user.role === 'admin') && (
                      <button type="button" className={btnSmDanger} onClick={() => void onDelete(item.id)}>
                        삭제
                      </button>
                    )}
                    {user.id !== item.author.id && (
                      <button type="button" className={btnSmSecondary} onClick={() => setReportId(item.id)}>
                        신고
                      </button>
                    )}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      {pending > 0 && (
        <button
          type="button"
          className="w-full border-t border-edge-soft py-2 text-xs font-semibold text-accent"
          onClick={() => {
            stick.current = true
            setPending(0)
            if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight
          }}
        >
          새 메시지 {pending}개 보기
        </button>
      )}
      {error && <p className="px-4 py-2 text-xs text-danger">{error}</p>}
      {user ? (
        <form
          onSubmit={(e) => void onSend(e)}
          className="sticky bottom-0 flex gap-2 border-t border-edge-soft bg-card p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                e.currentTarget.form?.requestSubmit()
              }
            }}
            maxLength={500}
            rows={2}
            placeholder="메시지를 입력해 주세요. Enter 전송, Shift+Enter 줄바꿈."
            className={textareaCls}
          />
          <button type="submit" className={btnPrimary}>
            보내기
          </button>
        </form>
      ) : (
        <p className="border-t border-edge-soft px-4 py-3 text-xs text-dim">읽기는 누구나 가능합니다. 쓰려면 로그인해 주세요.</p>
      )}
      {reportId && (
        <ReportModal targetType="chat" targetId={reportId} onClose={() => setReportId(null)} />
      )}
    </section>
  )
}
