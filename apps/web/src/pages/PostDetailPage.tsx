import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { IconChat, IconEye, IconPencil, IconTrash } from '../components/icons'
import { CategoryPill } from '../components/posts'
import { Avatar, ContentStatusPill, ErrorBox, FormError, FormSuccess, Loading, MatchStatusPill } from '../components/ui'
import { apiFetch, errorMessage, useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime, formatShort, scoreText, toPositiveInt } from '../lib/format'
import { btnPrimary, btnSecondary, btnSmDanger, cardCls, textareaCls } from '../lib/styles'
import type { Comment, PostDetail } from '../lib/types'

export default function PostDetailPage() {
  const id = toPositiveInt(useParams().id)
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: post, loading, error, reload } = useApi<PostDetail>(id ? `/posts/${id}` : null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  if (!id) return <ErrorBox message="글을 찾을 수 없습니다." />
  if (loading) return <Loading />
  if (error || !post) return <ErrorBox message={error ?? '글을 찾을 수 없습니다.'} onRetry={reload} />

  const canManage = !!user && (user.id === post.author.id || user.role === 'admin')

  const onDelete = async () => {
    if (!window.confirm('이 글을 삭제할까요? 삭제한 글은 되돌릴 수 없습니다.')) return
    setDeleting(true)
    setActionError(null)
    try {
      await apiFetch<void>(`/posts/${post.id}`, { method: 'DELETE' })
      navigate(`/board/${post.category}`, { replace: true })
    } catch (err) {
      setActionError(errorMessage(err))
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <Link to={`/board/${post.category}`} className="text-xs text-dim hover:text-fg">
        ← 목록으로
      </Link>

      {post.status !== 'visible' && (
        <div className="rounded-lg border border-gold/30 bg-gold-soft px-4 py-2.5 text-sm text-gold">
          {post.status === 'pending'
            ? '관리자 승인을 기다리는 글입니다. 승인 후 다른 회원에게 보입니다.'
            : '숨김 처리된 글입니다. 작성자와 관리자만 볼 수 있습니다.'}
        </div>
      )}

      <article className={cardCls}>
        <header className="border-b border-edge-soft p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <CategoryPill category={post.category} />
            {post.status !== 'visible' && <ContentStatusPill status={post.status} />}
          </div>
          <h1 className="text-xl font-bold break-words">{post.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-dim">
            <span className="flex items-center gap-2">
              <Avatar name={post.author.nickname} size="sm" />
              <span className="font-semibold text-fg">{post.author.nickname}</span>
            </span>
            <span>{formatDateTime(post.createdAt)}</span>
            <span className="flex items-center gap-1">
              <IconEye size={14} /> {post.views.toLocaleString('ko-KR')}
            </span>
            <span className="flex items-center gap-1">
              <IconChat size={14} /> {post.comments.length}
            </span>
            {canManage && (
              <span className="ml-auto flex gap-2">
                <Link to={`/posts/${post.id}/edit`} className={`${btnSecondary} h-8 px-3`}>
                  <IconPencil size={14} /> 수정
                </Link>
                <button type="button" onClick={onDelete} disabled={deleting} className={`${btnSecondary} h-8 px-3 text-danger`}>
                  <IconTrash size={14} /> {deleting ? '삭제 중...' : '삭제'}
                </button>
              </span>
            )}
          </div>
        </header>
        {post.match && (
          <Link
            to={`/matches/${post.match.id}`}
            className="mx-5 mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-edge bg-panel px-4 py-3 hover:bg-card-hover"
          >
            <span className="text-xs text-dim">관련 경기</span>
            <span className="text-xs text-muted">{post.match.leagueName}</span>
            <span className="font-semibold">
              {post.match.homeTeam} <span className="px-1 text-dim">{scoreText(post.match)}</span> {post.match.awayTeam}
            </span>
            <MatchStatusPill status={post.match.status} />
            <span className="ml-auto text-xs text-accent">경기 보기 →</span>
          </Link>
        )}
        <div className="p-5 text-[15px] leading-7 break-words whitespace-pre-wrap">{post.body}</div>
        {actionError && (
          <div className="px-5 pb-5">
            <FormError message={actionError} />
          </div>
        )}
      </article>

      <Comments post={post} onChanged={reload} />
    </div>
  )
}

function Comments({ post, onChanged }: { post: PostDetail; onChanged: () => void }) {
  const { user } = useAuth()
  const location = useLocation()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const text = body.trim()
    setNotice(null)
    if (!text) return setError('댓글 내용을 입력해 주세요.')
    if (text.length > 500) return setError('댓글은 500자까지 쓸 수 있습니다.')
    setSending(true)
    setError(null)
    try {
      const created = await apiFetch<Comment>(`/posts/${post.id}/comments`, { method: 'POST', body: { body: text } })
      setBody('')
      if (created.status === 'pending') setNotice('댓글이 등록되었습니다. 관리자 승인 후 다른 회원에게 보입니다.')
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const onDelete = async (comment: Comment) => {
    if (!window.confirm('이 댓글을 삭제할까요?')) return
    setDeletingId(comment.id)
    setError(null)
    try {
      await apiFetch<void>(`/comments/${comment.id}`, { method: 'DELETE' })
      onChanged()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className={cardCls}>
      <h2 className="border-b border-edge-soft px-5 py-3 font-bold">
        댓글 <span className="text-accent">{post.comments.length}</span>
      </h2>
      {post.comments.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-dim">아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.</p>
      ) : (
        <ul>
          {post.comments.map((c) => {
            const canDelete = !!user && (user.id === c.author.id || user.role === 'admin')
            return (
              <li key={c.id} className="flex gap-3 border-b border-edge-soft px-5 py-3 last:border-b-0">
                <Avatar name={c.author.nickname} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold">{c.author.nickname}</span>
                    <span className="text-muted">{formatShort(c.createdAt)}</span>
                    {c.status !== 'visible' && <ContentStatusPill status={c.status} />}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => void onDelete(c)}
                        disabled={deletingId === c.id}
                        className={`${btnSmDanger} ml-auto`}
                      >
                        {deletingId === c.id ? '삭제 중...' : '삭제'}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm break-words whitespace-pre-wrap">{c.body}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <div className="border-t border-edge p-5">
        {user ? (
          <form onSubmit={onSubmit} className="space-y-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="댓글을 입력해 주세요. (최대 500자)"
              aria-label="댓글"
              className={textareaCls}
            />
            <FormError message={error} />
            <FormSuccess message={notice} />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{body.length}/500</span>
              <button type="submit" disabled={sending} className={btnPrimary}>
                {sending ? '등록 중...' : '댓글 등록'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-center text-sm text-dim">
            <Link
              to={`/login?next=${encodeURIComponent(location.pathname)}`}
              className="font-semibold text-accent hover:text-accent-strong"
            >
              로그인
            </Link>{' '}
            후 댓글을 쓸 수 있습니다.
          </p>
        )}
      </div>
    </section>
  )
}
