import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { IconPencil } from '../components/icons'
import { ErrorBox, Field, FormError, Loading, MatchStatusPill, PageHeader } from '../components/ui'
import { apiFetch, errorMessage, useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { CATEGORY_LABELS, formatDateTime, isCategory, toPositiveInt } from '../lib/format'
import { useSettings } from '../lib/settings'
import { btnPrimary, btnSecondary, cardCls, inputCls, selectCls, textareaCls } from '../lib/styles'
import type { Category, Match, PostDetail } from '../lib/types'

export default function WritePage() {
  const id = toPositiveInt(useParams().id)
  const [params] = useSearchParams()
  if (id) return <EditPost id={id} />
  const categoryParam = params.get('category') ?? undefined
  return (
    <PostForm
      mode="create"
      initialCategory={isCategory(categoryParam) ? categoryParam : 'free'}
      initialMatchId={toPositiveInt(params.get('matchId'))}
    />
  )
}

function EditPost({ id }: { id: number }) {
  const { user } = useAuth()
  const { data, loading, error, reload } = useApi<PostDetail>(`/posts/${id}`)
  if (loading) return <Loading />
  if (error || !data) return <ErrorBox message={error ?? '글을 찾을 수 없습니다.'} onRetry={reload} />
  if (!user || (user.id !== data.author.id && user.role !== 'admin'))
    return <ErrorBox message="작성자와 관리자만 글을 고칠 수 있습니다." />
  return <PostForm key={data.id} mode="edit" post={data} initialCategory={data.category} initialMatchId={data.matchId} />
}

type PostFormProps = {
  mode: 'create' | 'edit'
  post?: PostDetail
  initialCategory: Category
  initialMatchId: number | null
}

function PostForm({ mode, post, initialCategory, initialMatchId }: PostFormProps) {
  const { user } = useAuth()
  const { settings } = useSettings()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const [category, setCategory] = useState<Category>(
    initialCategory === 'notice' && !isAdmin && mode === 'create' ? 'free' : initialCategory,
  )
  const [matchId, setMatchId] = useState<number | null>(initialMatchId)
  const [title, setTitle] = useState(post?.title ?? '')
  const [body, setBody] = useState(post?.body ?? '')
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const match = useApi<Match>(mode === 'create' && matchId ? `/matches/${matchId}` : null)
  const linkedMatch = mode === 'edit' ? (post?.match ?? null) : (match.data ?? null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    const b = body.trim()
    const next: { title?: string; body?: string } = {}
    if (!t) next.title = '제목을 입력해 주세요.'
    else if (t.length > 100) next.title = '제목은 100자까지 쓸 수 있습니다.'
    if (!b) next.body = '내용을 입력해 주세요.'
    else if (b.length > 5000) next.body = '내용은 5000자까지 쓸 수 있습니다.'
    setErrors(next)
    if (next.title || next.body) return

    setSending(true)
    setServerError(null)
    try {
      const saved =
        mode === 'edit' && post
          ? await apiFetch<PostDetail>(`/posts/${post.id}`, { method: 'PATCH', body: { title: t, body: b } })
          : await apiFetch<PostDetail>('/posts', {
              method: 'POST',
              body: { category, ...(matchId && category === 'match' ? { matchId } : {}), title: t, body: b },
            })
      navigate(`/posts/${saved.id}`, { replace: true })
    } catch (err) {
      setServerError(errorMessage(err))
      setSending(false)
    }
  }

  const categories: Category[] = isAdmin ? ['free', 'match', 'notice'] : ['free', 'match']

  return (
    <div>
      <PageHeader
        icon={<IconPencil size={20} />}
        title={mode === 'edit' ? '글 수정' : '글쓰기'}
        subtitle={
          mode === 'create' && settings.postApprovalRequired && !isAdmin
            ? '관리자 승인 후 게시판에 보입니다.'
            : '스포츠 이야기를 자유롭게 나눠 주세요.'
        }
      />
      <form onSubmit={onSubmit} className={`${cardCls} space-y-4 p-5`} noValidate>
        <Field label="게시판">
          {mode === 'create' ? (
            <select
              value={category}
              onChange={(e) => {
                const value = e.target.value
                if (isCategory(value)) setCategory(value)
              }}
              className={`${selectCls} w-48`}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm font-semibold">{CATEGORY_LABELS[category]}</p>
          )}
        </Field>

        {category === 'match' && (matchId || linkedMatch) && (
          <div className="rounded-lg border border-edge bg-panel px-4 py-3">
            <p className="mb-1 text-xs text-dim">연결된 경기</p>
            {match.loading ? (
              <p className="text-xs text-dim">경기 정보를 불러오는 중...</p>
            ) : match.error ? (
              <p className="text-xs text-danger">{match.error}</p>
            ) : linkedMatch ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-xs text-muted">{linkedMatch.leagueName}</span>
                <span className="font-semibold">
                  {linkedMatch.homeTeam} vs {linkedMatch.awayTeam}
                </span>
                <span className="text-xs text-dim">{formatDateTime(linkedMatch.kickoffAt)}</span>
                <MatchStatusPill status={linkedMatch.status} />
                {mode === 'create' && (
                  <button type="button" onClick={() => setMatchId(null)} className="ml-auto text-xs text-dim underline hover:text-fg">
                    연결 해제
                  </button>
                )}
              </div>
            ) : null}
          </div>
        )}

        <Field label="제목" error={errors.title}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="제목을 입력해 주세요."
            className={inputCls}
          />
        </Field>
        <Field label="내용" error={errors.body} hint={`${body.length}/5000`}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            maxLength={5000}
            placeholder="내용을 입력해 주세요."
            className={textareaCls}
          />
        </Field>
        <FormError message={serverError} />
        <div className="flex justify-end gap-2">
          <Link to={post ? `/posts/${post.id}` : `/board/${category}`} className={btnSecondary}>
            취소
          </Link>
          <button type="submit" disabled={sending} className={btnPrimary}>
            {sending ? '저장 중...' : mode === 'edit' ? '수정 완료' : '등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
