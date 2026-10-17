import { Link, useParams } from 'react-router'
import PostList from '../components/PostList'
import { Empty, ErrorBox, Loading } from '../components/StatusViews'
import { useApi } from '../lib/api'
import { STATUS_LABELS, formatDateTime, scoreText, toPositiveInt } from '../lib/format'
import type { Match, PostList as PostListData } from '../lib/types'

export default function MatchDetailPage() {
  const id = toPositiveInt(useParams().id ?? null)
  const match = useApi<Match>(id === null ? null : `/matches/${id}`)
  const posts = useApi<PostListData>(id === null ? null : `/posts?matchId=${id}`)

  if (id === null) return <ErrorBox message="잘못된 경기 주소입니다." />

  return (
    <div className="space-y-6">
      {match.loading && <Loading />}
      {match.error && <ErrorBox message={match.error} onRetry={match.reload} />}
      {match.data && (
        <section className="rounded border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">{match.data.leagueName}</p>
          <div className="my-4 flex items-center justify-center gap-4 text-lg font-bold sm:text-2xl">
            <span className="text-right">{match.data.homeTeam}</span>
            <span className="text-gray-700">{scoreText(match.data)}</span>
            <span>{match.data.awayTeam}</span>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-gray-500">상태</dt>
            <dd>{STATUS_LABELS[match.data.status]}</dd>
            <dt className="text-gray-500">시작</dt>
            <dd>{formatDateTime(match.data.kickoffAt)}</dd>
            <dt className="text-gray-500">장소</dt>
            <dd>{match.data.venue ?? '미정'}</dd>
          </dl>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">이 경기 이야기</h2>
          <Link
            to={`/board/write?matchId=${id}`}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            이 경기 글쓰기
          </Link>
        </div>
        {posts.loading && <Loading />}
        {posts.error && <ErrorBox message={posts.error} onRetry={posts.reload} />}
        {posts.data &&
          (posts.data.items.length === 0 ? (
            <Empty text="이 경기에 대한 글이 아직 없습니다." />
          ) : (
            <PostList posts={posts.data.items} />
          ))}
      </section>
    </div>
  )
}
