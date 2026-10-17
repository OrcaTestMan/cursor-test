import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Empty, ErrorBox, Loading } from '../components/StatusViews'
import { apiFetch, errorMessage, useApi } from '../lib/api'
import { CATEGORY_LABELS, formatDateTime, toPositiveInt } from '../lib/format'
import type { Comment, PostDetail } from '../lib/types'

const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm'

export default function PostDetailPage() {
  const id = toPositiveInt(useParams().id ?? null)
  if (id === null) return <ErrorBox message="잘못된 게시글 주소입니다." />
  return <PostDetailView key={id} id={id} />
}

function PostDetailView({ id }: { id: number }) {
  const navigate = useNavigate()
  const post = useApi<PostDetail>(`/posts/${id}`)
  const [added, setAdded] = useState<Comment[]>([])
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!confirm('이 글을 삭제할까요?')) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await apiFetch<void>(`/posts/${id}`, { method: 'DELETE' })
      navigate('/board')
    } catch (err) {
      setDeleteError(errorMessage(err))
      setDeleting(false)
    }
  }

  if (post.loading) return <Loading />
  if (post.error) return <ErrorBox message={post.error} onRetry={post.reload} />
  if (!post.data) return null

  const data = post.data
  const comments = [...data.comments, ...added]

  return (
    <div className="space-y-6">
      <article className="rounded border border-gray-200 bg-white p-5">
        <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{CATEGORY_LABELS[data.category]}</span>
        <h1 className="mt-2 text-xl font-bold">{data.title}</h1>
        <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-gray-500">
          <span>{data.author}</span>
          <span>{formatDateTime(data.createdAt)}</span>
          <span>조회 {data.views}</span>
        </div>
        {data.matchId !== null && (
          <Link to={`/matches/${data.matchId}`} className="mt-3 inline-block text-sm text-blue-700 underline">
            관련 경기 보기
          </Link>
        )}
        <p className="mt-4 whitespace-pre-wrap break-words border-t border-gray-100 pt-4 text-sm leading-relaxed">
          {data.body}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Link to="/board" className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100">
            목록
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
        {deleteError && (
          <div className="mt-3">
            <ErrorBox message={deleteError} />
          </div>
        )}
      </article>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">댓글 {comments.length}</h2>
        {comments.length === 0 ? (
          <Empty text="첫 댓글을 남겨 보세요." />
        ) : (
          <ul className="divide-y divide-gray-100 rounded border border-gray-200 bg-white">
            {comments.map((comment) => (
              <li key={comment.id} className="px-4 py-3 text-sm">
                <div className="flex gap-2 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{comment.author}</span>
                  <span>{formatDateTime(comment.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words">{comment.body}</p>
              </li>
            ))}
          </ul>
        )}
        <CommentForm postId={id} onCreated={(comment) => setAdded((prev) => [...prev, comment])} />
      </section>
    </div>
  )
}

function CommentForm({ postId, onCreated }: { postId: number; onCreated: (comment: Comment) => void }) {
  const [author, setAuthor] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!author.trim()) return setError('작성자를 입력해 주세요.')
    if (author.length > 20) return setError('작성자는 20자 이하로 입력해 주세요.')
    if (!body.trim()) return setError('내용을 입력해 주세요.')
    if (body.length > 500) return setError('댓글은 500자 이하로 입력해 주세요.')
    setSubmitting(true)
    setError(null)
    try {
      const comment = await apiFetch<Comment>(`/posts/${postId}/comments`, {
        method: 'POST',
        body: { author: author.trim(), body },
      })
      onCreated(comment)
      setBody('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded border border-gray-200 bg-white p-4">
      <input
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        maxLength={20}
        placeholder="작성자"
        aria-label="작성자"
        className={`${inputClass} sm:w-48`}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="내용"
        aria-label="내용"
        className={inputClass}
      />
      {error && <ErrorBox message={error} />}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{body.length}/500</span>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? '등록 중...' : '댓글 등록'}
        </button>
      </div>
    </form>
  )
}
