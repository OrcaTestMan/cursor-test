import { Link, useSearchParams } from 'react-router'
import PostList from '../components/PostList'
import { Empty, ErrorBox, Loading } from '../components/StatusViews'
import { useApi } from '../lib/api'
import { toPositiveInt } from '../lib/format'
import type { Category, PostList as PostListData } from '../lib/types'

const TABS: { value: Category | null; label: string }[] = [
  { value: null, label: '전체' },
  { value: 'free', label: '자유' },
  { value: 'match', label: '경기 이야기' },
]

function toCategory(value: string | null): Category | null {
  return value === 'free' || value === 'match' ? value : null
}

export default function BoardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = toCategory(searchParams.get('category'))
  const page = toPositiveInt(searchParams.get('page')) ?? 1

  const query = new URLSearchParams({ page: String(page) })
  if (category) query.set('category', category)
  const posts = useApi<PostListData>(`/posts?${query.toString()}`)

  const go = (nextCategory: Category | null, nextPage: number) => {
    const next = new URLSearchParams()
    if (nextCategory) next.set('category', nextCategory)
    if (nextPage > 1) next.set('page', String(nextPage))
    setSearchParams(next)
  }

  const totalPages = posts.data ? Math.max(1, Math.ceil(posts.data.total / posts.data.pageSize)) : 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">게시판</h1>
        <Link to="/board/write" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
          글쓰기
        </Link>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => go(tab.value, 1)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              category === tab.value
                ? 'border-blue-600 font-semibold text-blue-700'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {posts.loading && <Loading />}
      {posts.error && <ErrorBox message={posts.error} onRetry={posts.reload} />}
      {posts.data &&
        (posts.data.items.length === 0 ? (
          <Empty text="글이 없습니다." />
        ) : (
          <>
            <PostList posts={posts.data.items} />
            <nav className="flex flex-wrap justify-center gap-1" aria-label="페이지">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => go(category, page - 1)}
                className="rounded border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-40"
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => go(category, n)}
                  className={`rounded border px-3 py-1 text-sm ${
                    n === page ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => go(category, page + 1)}
                className="rounded border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-40"
              >
                다음
              </button>
            </nav>
          </>
        ))}
    </div>
  )
}
