import { useEffect, useState, type FormEvent } from 'react'
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from 'react-router'
import { ImageField } from '../components/image-field'
import { defaultPollCloseLocal, fromLocalInput, PollEditor, toLocalInput } from '../components/poll'
import { IconPencil } from '../components/icons'
import { TeamPicker } from '../components/teams'
import { ErrorBox, Field, FormError, Loading, MatchStatusPill, PageHeader } from '../components/ui'
import { apiFetch, errorMessage, useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { tagsForCategory, WRITE_CATEGORIES } from '../lib/boards'
import { CATEGORY_LABELS, containsWord, forbiddenWordOf, formatDateTime, isCategory, toPositiveInt } from '../lib/format'
import { useSettings } from '../lib/settings'
import { btnGhost, btnPrimary, btnSecondary, cardCls, inputCls, selectCls, textareaCls } from '../lib/styles'
import { useTitle } from '../lib/title'
import type { Category, Match, PostDetail, Team, UploadFile } from '../lib/types'

type FormErrors = { tag?: string; title?: string; body?: string }

type Draft = {
  category: Category
  matchId: number | null
  tag: string
  title: string
  body: string
  teamIds: number[]
  imageIds: number[]
}

function draftKey(userId: number) {
  return `write-draft:${userId}`
}

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
  useTitle('글 수정')
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
  const [tag, setTag] = useState(post?.tag ?? '')
  const [title, setTitle] = useState(post?.title ?? '')
  const [body, setBody] = useState(post?.body ?? '')
  const [images, setImages] = useState<UploadFile[]>(post?.images ?? [])
  const [teamIds, setTeamIds] = useState<number[]>(post?.teams.map((team) => team.id) ?? [])
  const [pollOn, setPollOn] = useState(!!post?.poll)
  const [pollOptions, setPollOptions] = useState<string[]>(
    post?.poll ? post.poll.options.map((option) => option.label) : ['', ''],
  )
  const [pollCloses, setPollCloses] = useState(post?.poll ? toLocalInput(post.poll.closesAt) : defaultPollCloseLocal())
  const pollLocked = (post?.poll?.totalVotes ?? 0) > 0
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [draftNotice, setDraftNotice] = useState<string | null>(null)

  useTitle(mode === 'edit' ? '글 수정' : '글쓰기')

  const dirty =
    mode === 'create'
      ? Boolean(title.trim() || body.trim() || images.length > 0)
      : title !== (post?.title ?? '') || body !== (post?.body ?? '')
  const blocker = useBlocker(!sending && dirty)

  useEffect(() => {
    if (sending || !dirty) return
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirty, sending])

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('작성 중인 글이 있습니다. 이 페이지에서 나갈까요?')) blocker.proceed()
    else blocker.reset()
  }, [blocker])

  const match = useApi<Match>(mode === 'create' && matchId ? `/matches/${matchId}` : null)
  const teams = useApi<Team[]>('/teams')
  const linkedMatch = mode === 'edit' ? (post?.match ?? null) : (match.data ?? null)
  const tags = tagsForCategory(settings, category)
  const tagOptions = tag && !tags.includes(tag) ? [tag, ...tags] : tags

  useEffect(() => {
    if (mode !== 'create' || !user) return
    const raw = localStorage.getItem(draftKey(user.id))
    if (!raw) return
    try {
      const draft = JSON.parse(raw) as Draft
      if (!window.confirm('임시 저장된 글이 있습니다. 불러올까요?')) {
        localStorage.removeItem(draftKey(user.id))
        return
      }
      if (isCategory(draft.category)) setCategory(draft.category)
      setMatchId(draft.matchId)
      setTag(draft.tag ?? '')
      setTitle(draft.title ?? '')
      setBody(draft.body ?? '')
      setTeamIds(Array.isArray(draft.teamIds) ? draft.teamIds : [])
      setDraftNotice('임시 저장된 글을 불러왔습니다. 이미지는 다시 올려 주세요.')
    } catch {
      localStorage.removeItem(draftKey(user.id))
    }
  }, [mode, user])

  useEffect(() => {
    if (mode !== 'create' || !user) return
    const timer = window.setTimeout(() => {
      const draft: Draft = {
        category,
        matchId,
        tag,
        title,
        body,
        teamIds,
        imageIds: images.map((image) => image.id),
      }
      if (!title.trim() && !body.trim() && images.length === 0) {
        localStorage.removeItem(draftKey(user.id))
        return
      }
      localStorage.setItem(draftKey(user.id), JSON.stringify(draft))
    }, 800)
    return () => window.clearTimeout(timer)
  }, [mode, user, category, matchId, tag, title, body, teamIds, images])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const t = title.trim()
    const b = body.trim()
    const next: FormErrors = {}
    if (tags.length > 0 && !tag) next.tag = '말머리를 골라 주세요.'
    if (!t) next.title = '제목을 입력해 주세요.'
    else if (t.length > 100) next.title = '제목은 100자까지 쓸 수 있습니다.'
    if (!b) next.body = '내용을 입력해 주세요.'
    else if (b.length > 5000) next.body = '내용은 5000자까지 쓸 수 있습니다.'
    setErrors(next)
    if (next.tag || next.title || next.body) return

    if (pollOn) {
      const filled = pollOptions.map((item) => item.trim()).filter(Boolean)
      if (filled.length < 2) {
        setServerError('투표 선택지는 2개 이상이어야 합니다.')
        return
      }
    }

    const tagBody = tags.length > 0 ? { tag } : {}
    const media = { imageIds: images.map((image) => image.id), teamIds }
    const pollBody =
      pollOn && !pollLocked
        ? { poll: { options: pollOptions.map((item) => item.trim()).filter(Boolean), closesAt: fromLocalInput(pollCloses) } }
        : mode === 'edit' && post?.poll && !pollOn
          ? { poll: null }
          : {}
    setSending(true)
    setServerError(null)
    try {
      const saved =
        mode === 'edit' && post
          ? await apiFetch<PostDetail>(`/posts/${post.id}`, {
              method: 'PATCH',
              body: { ...tagBody, title: t, body: b, ...media, ...pollBody },
            })
          : await apiFetch<PostDetail>('/posts', {
              method: 'POST',
              body: {
                category,
                ...(matchId && category === 'match' ? { matchId } : {}),
                ...tagBody,
                title: t,
                body: b,
                ...media,
                ...pollBody,
              },
            })
      if (mode === 'create' && user) localStorage.removeItem(draftKey(user.id))
      navigate(`/posts/${saved.id}`, { replace: true })
    } catch (err) {
      const message = errorMessage(err)
      const word = forbiddenWordOf(message)
      if (word && (containsWord(t, word) || containsWord(b, word))) {
        setErrors({ title: containsWord(t, word) ? message : undefined, body: containsWord(b, word) ? message : undefined })
      } else {
        setServerError(message)
      }
      setSending(false)
    }
  }

  const categories: Category[] = isAdmin ? [...WRITE_CATEGORIES, 'notice'] : WRITE_CATEGORIES

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
        {draftNotice && <p className="text-xs text-gold">{draftNotice}</p>}
        <Field label="게시판">
          {mode === 'create' ? (
            <select
              value={category}
              onChange={(e) => {
                const value = e.target.value
                if (isCategory(value)) {
                  setCategory(value)
                  setTag('')
                }
              }}
              className={`${selectCls} w-full sm:w-48`}
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

        {tags.length > 0 && (
          <Field label="말머리" error={errors.tag}>
            <select value={tag} onChange={(e) => setTag(e.target.value)} className={`${selectCls} w-full sm:w-48`}>
              <option value="">말머리 선택</option>
              {tagOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault()
                e.currentTarget.form?.requestSubmit()
              }
            }}
            rows={14}
            maxLength={5000}
            placeholder="내용을 입력해 주세요. YouTube 링크는 글 아래에 카드로 보입니다. Ctrl+Enter로 등록할 수 있습니다."
            className={textareaCls}
          />
        </Field>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-dim">사진</p>
          <ImageField images={images} onChange={setImages} />
          <p className="mt-1 text-xs text-muted">미리보기에서 순서를 바꾸고 지울 수 있습니다.</p>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-dim">관련 팀</p>
          {teams.loading ? (
            <p className="text-xs text-dim">팀 목록을 불러오는 중...</p>
          ) : teams.error ? (
            <p className="text-xs text-danger">{teams.error}</p>
          ) : teams.data && teams.data.length > 0 ? (
            <TeamPicker teams={teams.data} selectedIds={teamIds} primaryId={teamIds[0] ?? null} onChange={(ids) => setTeamIds(ids)} max={5} />
          ) : (
            <p className="text-xs text-dim">등록된 팀이 없습니다.</p>
          )}
          <p className="mt-1 text-xs text-muted">이 글과 연결할 팀을 고르면 팀 공간에도 보입니다.</p>
        </div>
        <PollEditor
          enabled={pollOn}
          options={pollOptions}
          closesAt={pollCloses}
          locked={pollLocked}
          onEnabled={setPollOn}
          onOptions={setPollOptions}
          onClosesAt={setPollCloses}
        />
        <FormError message={serverError} />
        <div className="flex justify-end gap-2">
          {mode === 'create' && user && (title || body) && (
            <button type="button" className={btnGhost} onClick={() => setDraftNotice('브라우저에 임시 저장했습니다.')}>
              임시 저장
            </button>
          )}
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
