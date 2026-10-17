import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ErrorBox, Loading } from '../components/StatusViews'
import { apiFetch, errorMessage, useApi } from '../lib/api'
import { CATEGORY_LABELS, formatDateTime, scoreText, toPositiveInt } from '../lib/format'
import type { Category, Match, Post } from '../lib/types'

const inputClass = 'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm'

function validate(author: string, title: string, body: string): string | null {
  if (!author.trim()) return '작성자를 입력해 주세요.'
  if (author.length > 20) return '작성자는 20자 이하로 입력해 주세요.'
  if (!title.trim()) return '제목을 입력해 주세요.'
  if (title.length > 100) return '제목은 100자 이하로 입력해 주세요.'
  if (!body.trim()) return '내용을 입력해 주세요.'
  if (body.length > 5000) return '내용은 5000자 이하로 입력해 주세요.'
  return null
}

export default function WritePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const matchId = toPositiveInt(searchParams.get('matchId'))
  const match = useApi<Match>(matchId === null ? null : `/matches/${matchId}`)

  const [author, setAuthor] = useState('')
  const [category, setCategory] = useState<Category>('free')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matchReady = matchId === null || match.data !== undefined

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const invalid = validate(author, title, body)
    if (invalid) {
      setError(invalid)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const post = await apiFetch<Post>('/posts', {
        method: 'POST',
        body: {
          category: matchId === null ? category : 'match',
          ...(matchId === null ? {} : { matchId }),
          author: author.trim(),
          title: title.trim(),
          body,
        },
      })
      navigate(`/board/${post.id}`)
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">글쓰기</h1>

      {matchId !== null && (
        <div className="rounded border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
          {match.loading && <Loading text="경기 정보를 불러오는 중..." />}
          {match.error && <ErrorBox message={match.error} onRetry={match.reload} />}
          {match.data && (
            <p>
              <span className="text-gray-500">경기:</span> {match.data.leagueName} · {match.data.homeTeam}{' '}
              {scoreText(match.data)} {match.data.awayTeam} · {formatDateTime(match.data.kickoffAt)}
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 rounded border border-gray-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">작성자</span>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={20}
              placeholder="닉네임"
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-700">분류</span>
            <select
              value={matchId === null ? category : 'match'}
              onChange={(e) => setCategory(e.target.value === 'match' ? 'match' : 'free')}
              disabled={matchId !== null}
              className={`${inputClass} disabled:bg-gray-100`}
            >
              <option value="free">{CATEGORY_LABELS.free}</option>
              <option value="match">{CATEGORY_LABELS.match}</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-700">제목</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className={inputClass} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-gray-700">
            내용 <span className="text-xs text-gray-400">({body.length}/5000)</span>
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            rows={10}
            className={inputClass}
          />
        </label>
        {error && <ErrorBox message={error} />}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={submitting || !matchReady}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
