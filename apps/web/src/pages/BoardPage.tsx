import { useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { IconBall, IconChat, IconMegaphone, IconSearch } from '../components/icons'
import { PostTable } from '../components/posts'
import { EmptyState, ErrorBox, Loading, PageHeader, Pagination } from '../components/ui'
import { buildQuery, useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { CATEGORY_LABELS, isCategory, toPageSize, toPositiveInt } from '../lib/format'
import { btnPrimary, btnSecondary, inputCls } from '../lib/styles'
import type { Category, Paged, PostSummary } from '../lib/types'
import NotFoundPage from './NotFoundPage'

const SUBTITLES: Record<Category, string> = {
  notice: '운영진이 전하는 소식입니다.',
  free: '스포츠에 관한 자유로운 이야기를 나눠요.',
  match: '경기를 보며 생각을 나눠요.',
}

const ICONS: Record<Category, typeof IconChat> = { notice: IconMegaphone, free: IconChat, match: IconBall }

export default function BoardPage() {
  const { category } = useParams()
  if (!isCategory(category)) return <NotFoundPage />
  return <Board key={category} category={category} />
}

function Board({ category }: { category: Category }) {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const page = toPositiveInt(params.get('page')) ?? 1
  const pageSize = toPageSize(params.get('pageSize'))
  const [search, setSearch] = useState(q)

  const { data, loading, error, reload } = useApi<Paged<PostSummary>>(
    `/posts${buildQuery({ category, q: q || null, page, pageSize })}`,
  )

  const canWrite = category !== 'notice' || user?.role === 'admin'
  const Icon = ICONS[category]

  const update = (patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, String(value))
    }
    setParams(next)
  }

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    update({ q: search.trim() || null, page: null })
  }

  const writeButton = canWrite ? (
    <Link to={`/write?category=${category}`} className={btnPrimary}>
      글쓰기
    </Link>
  ) : null

  return (
    <div>
      <PageHeader icon={<Icon size={20} />} title={CATEGORY_LABELS[category]} subtitle={SUBTITLES[category]} action={writeButton} />

      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <div className="relative max-w-sm flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제목으로 검색"
            aria-label="제목 검색"
            className={`${inputCls} pl-9`}
          />
        </div>
        <button type="submit" className={btnSecondary}>
          검색
        </button>
        {q && (
          <button
            type="button"
            className={btnSecondary}
            onClick={() => {
              setSearch('')
              update({ q: null, page: null })
            }}
          >
            초기화
          </button>
        )}
      </form>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<Icon size={20} />}
          title={q ? '검색 결과가 없습니다' : '아직 글이 없습니다'}
          description={q ? '다른 검색어로 찾아보세요.' : canWrite ? '첫 번째 글을 남겨 보세요.' : undefined}
          action={q ? undefined : writeButton}
        />
      ) : (
        <>
          <PostTable posts={data.items} />
          <Pagination
            page={page}
            pageSize={pageSize}
            total={data.total}
            onPage={(p) => update({ page: p })}
            onPageSize={(size) => update({ pageSize: size, page: null })}
          />
        </>
      )}
    </div>
  )
}
