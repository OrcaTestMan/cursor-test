import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import {
  IconBookmark,
  IconChat,
  IconChevronLeft,
  IconChevronRight,
  IconEye,
  IconFlag,
  IconLink,
  IconPencil,
  IconReply,
  IconShare,
  IconThumbUp,
  IconTrash,
} from '../components/icons'
import { ImageGallery, YoutubeCards } from '../components/media'
import { PollCard } from '../components/poll'
import { AuthorLink, BestPill, CategoryPill, PostLine, TagLabel } from '../components/posts'
import { TeamBadge } from '../components/teams'
import { ReportModal } from '../components/report'
import {
  Avatar,
  ContentStatusPill,
  ErrorBox,
  FormError,
  FormSuccess,
  BackButton,
  Loading,
  MatchStatusPill,
  SegmentedTabs,
  type TabItem,
} from '../components/ui'
import { apiFetch, errorMessage, useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { profilePath } from '../lib/boards'
import { CATEGORY_LABELS, formatDateTime, formatNumber, formatShort, scoreText, toPositiveInt } from '../lib/format'
import { isTypingTarget, loadSeenCommentMax, recordRecentPost, saveSeenCommentMax } from '../lib/prefs'
import { btnPrimary, btnSecondary, btnSmSecondary, cardCls, textareaCls } from '../lib/styles'
import { useTitle } from '../lib/title'
import type { Comment, PostDetail, PostNeighbor, ReportTarget } from '../lib/types'

type ReportState = { targetType: ReportTarget; targetId: number } | null
type CommentSort = 'oldest' | 'newest' | 'likes'

const COMMENT_TABS: TabItem<CommentSort>[] = [
  { value: 'oldest', label: '등록순' },
  { value: 'newest', label: '최신순' },
  { value: 'likes', label: '추천순' },
]

function isEdited(createdAt: string, updatedAt: string) {
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 60_000
}

function quoteSnippet(comment: Comment) {
  const excerpt = comment.body.replace(/\s+/g, ' ').trim().slice(0, 80)
  const more = comment.body.replace(/\s+/g, ' ').trim().length > 80 ? '…' : ''
  return `@${comment.author.nickname} “${excerpt}${more}”\n`
}

/** 로그인하지 않았으면 로그인 화면으로 보낼지 묻는다. 로그인 상태면 true */
function useLoginPrompt() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  return (message: string): boolean => {
    if (user) return true
    if (window.confirm(`${message}\n로그인 화면으로 이동할까요?`)) {
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`)
    }
    return false
  }
}

export default function PostDetailPage() {
  const id = toPositiveInt(useParams().id)
  const { data, loading, error, reload } = useApi<PostDetail>(id ? `/posts/${id}` : null)
  const [last, setLast] = useState<PostDetail | null>(null)
  if (data && data !== last) setLast(data)
  const post = data ?? (last && last.id === id && !error ? last : undefined)
  useTitle(post ? post.title : '게시글')

  if (!id) return <ErrorBox message="글을 찾을 수 없습니다." />
  if (loading && !post) return <Loading />
  if (error || !post) return <ErrorBox message={error ?? '글을 찾을 수 없습니다.'} onRetry={reload} />
  return <PostView key={post.id} post={post} reload={reload} />
}

function PostView({ post, reload }: { post: PostDetail; reload: () => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const askLogin = useLoginPrompt()
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [like, setLike] = useState<{ liked: boolean; likeCount: number } | null>(null)
  const [bookmarked, setBookmarked] = useState<boolean | null>(null)
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [busy, setBusy] = useState<'like' | 'bookmark' | 'subscribe' | 'mute' | null>(null)
  const [report, setReport] = useState<ReportState>(null)
  const [poll, setPoll] = useState(post.poll)
  const [bodyOpen, setBodyOpen] = useState(false)

  const isOwn = !!user && user.id === post.author.id
  const canManage = !!user && (isOwn || user.role === 'admin')
  const liked = like?.liked ?? post.liked
  const likeCount = like?.likeCount ?? post.likeCount
  const isBookmarked = bookmarked ?? post.bookmarked
  const isSubscribed = subscribed ?? post.subscribed
  const visibleComments = post.comments.filter((c) => !c.deleted).length
  const longBody = post.body.length > 900 || post.body.split('\n').length > 16
  const edited = isEdited(post.createdAt, post.updatedAt)

  useEffect(() => {
    recordRecentPost({ id: post.id, title: post.title, category: post.category })
  }, [post.id, post.title, post.category])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (isTypingTarget(e.target)) return
      if (e.key === 'j' && post.prev) navigate(`/posts/${post.prev.id}`)
      if (e.key === 'k' && post.next) navigate(`/posts/${post.next.id}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, post.next, post.prev])

  const run = async (action: () => Promise<void>) => {
    setActionError(null)
    setActionNotice(null)
    try {
      await action()
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  const onDelete = async () => {
    if (!window.confirm('이 글을 삭제할까요? 삭제한 글은 되돌릴 수 없습니다.')) return
    setDeleting(true)
    await run(async () => {
      await apiFetch<void>(`/posts/${post.id}`, { method: 'DELETE' })
      navigate(`/board/${post.category}`, { replace: true })
    })
    setDeleting(false)
  }

  const onLike = async () => {
    if (!askLogin('추천하려면 로그인이 필요합니다.')) return
    setBusy('like')
    await run(async () => {
      const res = await apiFetch<{ liked: boolean; likeCount: number }>(`/posts/${post.id}/like`, {
        method: liked ? 'DELETE' : 'POST',
      })
      setLike(res)
    })
    setBusy(null)
  }

  const onBookmark = async () => {
    if (!askLogin('스크랩하려면 로그인이 필요합니다.')) return
    setBusy('bookmark')
    await run(async () => {
      const res = await apiFetch<{ bookmarked: boolean }>(`/posts/${post.id}/bookmark`, {
        method: isBookmarked ? 'DELETE' : 'POST',
      })
      setBookmarked(res.bookmarked)
      setActionNotice(res.bookmarked ? '스크랩했습니다. 내 정보 > 스크랩에서 볼 수 있습니다.' : '스크랩을 취소했습니다.')
    })
    setBusy(null)
  }

  const onSubscribe = async () => {
    if (!askLogin('댓글 알림을 받으려면 로그인이 필요합니다.')) return
    setBusy('subscribe')
    await run(async () => {
      const res = await apiFetch<{ subscribed: boolean }>(`/posts/${post.id}/subscribe`, {
        method: isSubscribed ? 'DELETE' : 'POST',
      })
      setSubscribed(res.subscribed)
      setActionNotice(res.subscribed ? '이 글의 새 댓글 알림을 받습니다.' : '댓글 알림을 껐습니다.')
    })
    setBusy(null)
  }

  const onMuteAuthor = async () => {
    if (!askLogin('회원을 숨기려면 로그인이 필요합니다.')) return
    if (!window.confirm(`${post.author.nickname}님의 글과 응원방 메시지를 목록에서 숨길까요?`)) return
    setBusy('mute')
    await run(async () => {
      await apiFetch(`/profiles/${encodeURIComponent(post.author.nickname)}/mute`, { method: 'POST' })
      setActionNotice('회원을 숨겼습니다. 내 정보 > 숨긴 회원에서 해제할 수 있습니다.')
    })
    setBusy(null)
  }

  const onCopyLink = async () => {
    await run(async () => {
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`)
      } catch {
        throw new Error('링크를 복사하지 못했습니다. 주소창의 주소를 직접 복사해 주세요.')
      }
      setActionNotice('링크를 복사했습니다.')
    })
  }

  const onShare = async () => {
    const url = `${window.location.origin}/posts/${post.id}`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: post.title, url })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
      }
    }
    await onCopyLink()
  }

  const onReport = (targetType: ReportTarget, targetId: number) => {
    if (!askLogin('신고하려면 로그인이 필요합니다.')) return
    setReport({ targetType, targetId })
  }

  const actionBtn = (active: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
      active ? 'border-accent/60 bg-accent-soft text-accent' : 'border-edge bg-card text-fg hover:bg-card-hover'
    }`

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <BackButton fallback={`/board/${post.category}`} />
      </div>

      {post.status !== 'visible' && (
        <div className="rounded-lg border border-gold/30 bg-gold-soft px-4 py-2.5 text-sm text-gold">
          {post.status === 'pending'
            ? '관리자 승인을 기다리는 글입니다. 승인 후 다른 회원에게 보입니다.'
            : '숨김 처리된 글입니다. 작성자와 관리자만 볼 수 있습니다.'}
        </div>
      )}

      <article className={cardCls}>
        <header className="border-b border-edge-soft p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <CategoryPill category={post.category} />
            {post.isBest && <BestPill />}
            {post.status !== 'visible' && <ContentStatusPill status={post.status} />}
          </div>
          <h1 className="flex flex-wrap items-baseline gap-x-1.5 text-xl font-bold break-words">
            <TagLabel tag={post.tag} />
            <span className="min-w-0 break-all">{post.title}</span>
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-dim">
            <span className="flex min-w-0 items-center gap-2">
              <Avatar name={post.author.nickname} uploadId={post.author.avatarUploadId} size="sm" />
              <AuthorLink nickname={post.author.nickname} className="truncate font-semibold text-fg" />
            </span>
            <span>
              {formatDateTime(post.createdAt)}
              {edited && (
                <span className="ml-1 text-muted" title={formatDateTime(post.updatedAt)}>
                  · 수정됨
                </span>
              )}
            </span>
            <span className="flex items-center gap-1">
              <IconEye size={14} /> {formatNumber(post.views)}
            </span>
            <span className="flex items-center gap-1">
              <IconThumbUp size={14} /> {formatNumber(likeCount)}
            </span>
            <span className="flex items-center gap-1">
              <IconChat size={14} /> {visibleComments}
            </span>
            <Link to={profilePath(post.author.nickname)} className="hover:text-fg">
              작성자 글
            </Link>
            <Link to={`/board/${post.category}?authorId=${post.author.id}`} className="hover:text-fg">
              이 게시판에서만
            </Link>
            {canManage && (
              <span className="flex gap-2 sm:ml-auto">
                <Link to={`/posts/${post.id}/edit`} className={`${btnSecondary} h-8 px-3`}>
                  <IconPencil size={14} /> 수정
                </Link>
                <button type="button" onClick={() => void onDelete()} disabled={deleting} className={`${btnSecondary} h-8 px-3 text-danger`}>
                  <IconTrash size={14} /> {deleting ? '삭제 중...' : '삭제'}
                </button>
              </span>
            )}
          </div>
        </header>
        {post.match && (
          <Link
            to={`/matches/${post.match.id}`}
            className="mx-4 mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-edge bg-panel px-4 py-3 hover:bg-card-hover sm:mx-5 sm:mt-5"
          >
            <span className="text-xs text-dim">관련 경기</span>
            <span className="text-xs text-muted">{post.match.leagueName}</span>
            <span className="min-w-0 font-semibold break-keep">
              {post.match.homeTeam} <span className="px-1 text-dim">{scoreText(post.match)}</span> {post.match.awayTeam}
            </span>
            <MatchStatusPill status={post.match.status} />
            <span className="ml-auto text-xs text-accent">경기 보기 →</span>
          </Link>
        )}
        <div className="space-y-4 p-4 sm:p-5">
          {(post.teams ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(post.teams ?? []).map((team) => (
                <Link key={team.id} to={`/teams/${team.id}`}>
                  <TeamBadge team={team} />
                </Link>
              ))}
            </div>
          )}
          <div className="relative">
            <div
              className={`text-[15px] leading-7 break-words whitespace-pre-wrap ${
                longBody && !bodyOpen ? 'max-h-80 overflow-hidden' : ''
              }`}
            >
              {post.body}
            </div>
            {longBody && !bodyOpen && (
              <div className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-gradient-to-t from-card to-transparent pb-1">
                <button type="button" onClick={() => setBodyOpen(true)} className={`${btnSecondary} h-8 px-3`}>
                  더보기
                </button>
              </div>
            )}
            {longBody && bodyOpen && (
              <div className="mt-3">
                <button type="button" onClick={() => setBodyOpen(false)} className="text-xs text-dim hover:text-fg">
                  접기
                </button>
              </div>
            )}
          </div>
          <ImageGallery images={post.images ?? []} />
          <YoutubeCards text={post.body} />
          {poll && <PollCard postId={post.id} poll={poll} onChanged={setPoll} />}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-edge-soft px-4 py-4">
          <button
            type="button"
            onClick={() => void onLike()}
            disabled={isOwn || busy === 'like'}
            title={isOwn ? '내 글은 추천할 수 없습니다.' : undefined}
            aria-pressed={liked}
            className={actionBtn(liked)}
          >
            <IconThumbUp size={16} /> 추천 <span className="tabular-nums">{formatNumber(likeCount)}</span>
          </button>
          <button
            type="button"
            onClick={() => void onBookmark()}
            disabled={busy === 'bookmark'}
            aria-pressed={isBookmarked}
            className={actionBtn(isBookmarked)}
          >
            <IconBookmark size={16} /> {isBookmarked ? '스크랩됨' : '스크랩'}
          </button>
          <button
            type="button"
            onClick={() => void onSubscribe()}
            disabled={busy === 'subscribe'}
            aria-pressed={isSubscribed}
            className={actionBtn(isSubscribed)}
          >
            {isSubscribed ? '구독 중' : '댓글 알림'}
          </button>
          <button type="button" onClick={() => void onShare()} className={actionBtn(false)}>
            <IconShare size={16} /> 공유
          </button>
          <button type="button" onClick={() => void onCopyLink()} className={actionBtn(false)}>
            <IconLink size={16} /> 링크 복사
          </button>
          <button
            type="button"
            onClick={() => document.getElementById('comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className={actionBtn(false)}
          >
            <IconChat size={16} /> 댓글
          </button>
          {!isOwn && (
            <button type="button" onClick={() => onReport('post', post.id)} className={`${actionBtn(false)} text-dim`}>
              <IconFlag size={16} /> 신고
            </button>
          )}
          {!isOwn && user && (
            <button
              type="button"
              onClick={() => void onMuteAuthor()}
              disabled={busy === 'mute'}
              className={`${actionBtn(false)} text-dim`}
            >
              작성자 숨기기
            </button>
          )}
        </div>
        {(actionError || actionNotice) && (
          <div className="space-y-2 px-4 pb-4 sm:px-5">
            <FormError message={actionError} />
            <FormSuccess message={actionNotice} />
          </div>
        )}
      </article>

      <Comments post={post} onChanged={reload} onReport={(cid) => onReport('comment', cid)} />

      {(post.related ?? []).length > 0 && (
        <section className={cardCls}>
          <h2 className="border-b border-edge-soft px-4 py-3 font-bold sm:px-5">관련 글</h2>
          <div>
            {(post.related ?? []).map((item) => (
              <PostLine key={item.id} post={item} />
            ))}
          </div>
        </section>
      )}

      <nav className={`${cardCls} divide-y divide-edge-soft`} aria-label="이전글 다음글">
        <NeighborRow label="다음글" neighbor={post.next ?? null} />
        <NeighborRow label="이전글" neighbor={post.prev ?? null} />
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <Link to={`/board/${post.category}`} className="text-sm text-dim hover:text-fg">
            {CATEGORY_LABELS[post.category]} 목록
          </Link>
          <span className="hidden text-xs text-muted sm:inline">J 이전글 · K 다음글</span>
        </div>
      </nav>

      {report && <ReportModal targetType={report.targetType} targetId={report.targetId} onClose={() => setReport(null)} />}
    </div>
  )
}

function NeighborRow({ label, neighbor }: { label: string; neighbor: PostNeighbor | null }) {
  if (!neighbor) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 text-sm text-muted sm:px-5">
        {label === '다음글' ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
        <span className="w-12 shrink-0 text-xs">{label}</span>
        <span>글이 없습니다.</span>
      </div>
    )
  }
  return (
    <Link to={`/posts/${neighbor.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-card-hover sm:px-5">
      {label === '다음글' ? <IconChevronRight size={14} className="text-muted" /> : <IconChevronLeft size={14} className="text-muted" />}
      <span className="w-12 shrink-0 text-xs text-dim">{label}</span>
      <span className="min-w-0 truncate">
        <TagLabel tag={neighbor.tag} /> {neighbor.title}
      </span>
    </Link>
  )
}

function Comments({ post, onChanged, onReport }: { post: PostDetail; onChanged: () => void; onReport: (commentId: number) => void }) {
  const { user } = useAuth()
  const askLogin = useLoginPrompt()
  const location = useLocation()
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [quoteDraft, setQuoteDraft] = useState('')
  const [sort, setSort] = useState<CommentSort>('oldest')
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [likingId, setLikingId] = useState<number | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const [seenMax, setSeenMax] = useState(() => loadSeenCommentMax(post.id))
  const [copyNotice, setCopyNotice] = useState<string | null>(null)

  const repliesOf = (id: number) => post.comments.filter((c) => c.parentId === id)
  const count = post.comments.filter((c) => !c.deleted).length
  const maxCommentId = post.comments.reduce((max, comment) => Math.max(max, comment.id), 0)
  const tops = useMemo(() => {
    const idSet = new Set(post.comments.map((c) => c.id))
    const items = post.comments.filter((c) => c.parentId === null || !idSet.has(c.parentId))
    if (sort === 'newest') return [...items].reverse()
    if (sort === 'likes') {
      return [...items].sort((a, b) => b.likeCount - a.likeCount || a.id - b.id)
    }
    return items
  }, [post.comments, sort])

  const hashId = /^#comment-(\d+)$/.exec(location.hash)?.[1]
  const commentsKey = post.comments.length
  useEffect(() => {
    if (!hashId) return
    const el = document.getElementById(`comment-${hashId}`)
    if (!el) return
    const start = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightId(Number(hashId))
    }, 50)
    const end = window.setTimeout(() => setHighlightId(null), 2500)
    return () => {
      window.clearTimeout(start)
      window.clearTimeout(end)
    }
  }, [hashId, commentsKey])

  useEffect(() => {
    setSeenMax(loadSeenCommentMax(post.id))
    if (maxCommentId <= 0) return
    const timer = window.setTimeout(() => saveSeenCommentMax(post.id, maxCommentId), 4000)
    return () => {
      window.clearTimeout(timer)
      saveSeenCommentMax(post.id, maxCommentId)
    }
  }, [maxCommentId, post.id])

  const onDelete = async (comment: Comment) => {
    if (!window.confirm('이 댓글을 삭제할까요?')) return
    setDeletingId(comment.id)
    setListError(null)
    try {
      await apiFetch<void>(`/comments/${comment.id}`, { method: 'DELETE' })
      onChanged()
    } catch (err) {
      setListError(errorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  const onLike = async (comment: Comment) => {
    if (!askLogin('추천하려면 로그인이 필요합니다.')) return
    setLikingId(comment.id)
    setListError(null)
    try {
      await apiFetch<{ liked: boolean; likeCount: number }>(`/comments/${comment.id}/like`, {
        method: comment.liked ? 'DELETE' : 'POST',
      })
      onChanged()
    } catch (err) {
      setListError(errorMessage(err))
    } finally {
      setLikingId(null)
    }
  }

  const onQuote = (comment: Comment) => {
    if (!askLogin('인용하려면 로그인이 필요합니다.')) return
    setReplyTo(comment.parentId ?? comment.id)
    setQuoteDraft(quoteSnippet(comment))
  }

  const onCopyComment = async (commentId: number) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}#comment-${commentId}`)
      setCopyNotice('댓글 주소를 복사했습니다.')
      window.setTimeout(() => setCopyNotice(null), 2000)
    } catch {
      setListError('댓글 주소를 복사하지 못했습니다.')
    }
  }

  const renderComment = (c: Comment, isReply: boolean) => {
    const isOwn = !!user && user.id === c.author.id
    const canDelete = !c.deleted && !!user && (isOwn || user.role === 'admin')
    const likeCount = c.likeCount ?? 0
    const isNew = !c.deleted && c.id > seenMax && seenMax > 0
    return (
      <div
        id={`comment-${c.id}`}
        className={`flex scroll-mt-20 gap-3 px-4 py-3 transition-colors duration-700 sm:px-5 ${isReply ? 'pl-8 sm:pl-12' : ''} ${
          highlightId === c.id ? 'bg-accent-soft/60' : isNew ? 'bg-accent-soft/25' : ''
        }`}
      >
        {isReply && <IconReply size={16} className="mt-1.5 shrink-0 text-muted" />}
        {c.deleted ? (
          <p className="py-1 text-sm text-muted">삭제된 댓글입니다.</p>
        ) : (
          <>
            <Avatar name={c.author.nickname} uploadId={c.author.avatarUploadId} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <AuthorLink nickname={c.author.nickname} className="max-w-40 truncate font-semibold" />
                {c.author.id === post.author.id && <span className="text-[11px] font-semibold text-accent">작성자</span>}
                {isNew && <span className="text-[11px] font-semibold text-accent">NEW</span>}
                <span className="text-muted">{formatShort(c.createdAt)}</span>
                {c.status !== 'visible' && <ContentStatusPill status={c.status} />}
              </div>
              <CommentBody text={c.body} />
              <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-dim">
                <button
                  type="button"
                  onClick={() => void onLike(c)}
                  disabled={likingId === c.id || isOwn}
                  className={`inline-flex items-center gap-1 hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 ${c.liked ? 'font-semibold text-accent' : ''}`}
                >
                  <IconThumbUp size={12} />
                  추천{likeCount > 0 ? ` ${likeCount}` : ''}
                </button>
                {!isReply && user && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuoteDraft('')
                      setReplyTo(replyTo === c.id ? null : c.id)
                    }}
                    className="hover:text-fg"
                  >
                    {replyTo === c.id && !quoteDraft ? '답글 취소' : '답글'}
                  </button>
                )}
                {user && (
                  <button type="button" onClick={() => onQuote(c)} className="hover:text-fg">
                    인용
                  </button>
                )}
                <button type="button" onClick={() => void onCopyComment(c.id)} className="hover:text-fg">
                  주소
                </button>
                {!isOwn && (
                  <button type="button" onClick={() => onReport(c.id)} className="hover:text-fg">
                    신고
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => void onDelete(c)}
                    disabled={deletingId === c.id}
                    className="text-danger hover:underline disabled:opacity-50"
                  >
                    {deletingId === c.id ? '삭제 중...' : '삭제'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <section id="comments" className={cardCls}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge-soft px-4 py-3 sm:px-5">
        <h2 className="font-bold">
          댓글 <span className="text-accent">{count}</span>
        </h2>
        {tops.length > 0 && <SegmentedTabs items={COMMENT_TABS} value={sort} onChange={setSort} />}
      </div>
      {(listError || copyNotice) && (
        <div className="px-4 pt-3 sm:px-5">
          <FormError message={listError} />
          <FormSuccess message={copyNotice} />
        </div>
      )}
      {tops.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-dim">아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.</p>
      ) : (
        <ul>
          {tops.map((c) => {
            const replies = c.parentId === null ? repliesOf(c.id) : []
            return (
              <li key={c.id} className="border-b border-edge-soft last:border-b-0">
                {renderComment(c, false)}
                {replies.length > 0 && (
                  <ul className="bg-panel/50">
                    {replies.map((r) => (
                      <li key={r.id} className="border-t border-edge-soft">
                        {renderComment(r, true)}
                      </li>
                    ))}
                  </ul>
                )}
                {replyTo === c.id && (
                  <div className="border-t border-edge-soft bg-panel/50 py-3 pr-4 pl-8 sm:pr-5 sm:pl-12">
                    <CommentForm
                      key={`${c.id}-${quoteDraft}`}
                      postId={post.id}
                      parentId={c.id}
                      autoFocus
                      initialBody={quoteDraft}
                      onCancel={() => {
                        setReplyTo(null)
                        setQuoteDraft('')
                      }}
                      onDone={() => {
                        setReplyTo(null)
                        setQuoteDraft('')
                        onChanged()
                      }}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <div className="border-t border-edge p-4 sm:p-5">
        {user ? (
          <CommentForm postId={post.id} parentId={null} onDone={onChanged} />
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

function CommentBody({ text }: { text: string }) {
  const long = text.length > 180 || text.split('\n').length > 6
  const [open, setOpen] = useState(!long)
  return (
    <>
      <p className={`mt-1 text-sm break-words whitespace-pre-wrap ${long && !open ? 'max-h-24 overflow-hidden' : ''}`}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen((value) => !value)} className="mt-1 text-xs text-dim hover:text-fg">
          {open ? '접기' : '더보기'}
        </button>
      )}
    </>
  )
}

function CommentForm({
  postId,
  parentId,
  autoFocus,
  initialBody = '',
  onDone,
  onCancel,
}: {
  postId: number
  parentId: number | null
  autoFocus?: boolean
  initialBody?: string
  onDone: () => void
  onCancel?: () => void
}) {
  const [body, setBody] = useState(initialBody)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const text = body.trim()
    setNotice(null)
    if (!text) return setError('댓글 내용을 입력해 주세요.')
    if (text.length > 500) return setError('댓글은 500자까지 쓸 수 있습니다.')
    setSending(true)
    setError(null)
    try {
      const created = await apiFetch<Comment>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: parentId === null ? { body: text } : { body: text, parentId },
      })
      setBody('')
      if (created.status === 'pending') setNotice('댓글이 등록되었습니다. 관리자 승인 후 다른 회원에게 보입니다.')
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={parentId === null ? 3 : 2}
        maxLength={500}
        autoFocus={autoFocus}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            e.currentTarget.form?.requestSubmit()
          }
        }}
        placeholder={
          parentId === null
            ? '댓글을 입력해 주세요. @닉네임으로 언급할 수 있습니다. Ctrl+Enter로 등록.'
            : '답글을 입력해 주세요. Ctrl+Enter로 등록.'
        }
        aria-label={parentId === null ? '댓글' : '답글'}
        className={textareaCls}
      />
      <FormError message={error} />
      <FormSuccess message={notice} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted">{body.length}/500</span>
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className={btnSmSecondary}>
              취소
            </button>
          )}
          <button type="submit" disabled={sending} className={parentId === null ? btnPrimary : `${btnPrimary} h-7 px-2.5 text-xs`}>
            {sending ? '등록 중...' : parentId === null ? '댓글 등록' : '답글 등록'}
          </button>
        </div>
      </div>
    </form>
  )
}
