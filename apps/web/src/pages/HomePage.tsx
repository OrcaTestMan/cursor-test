import { Link } from 'react-router'
import MatchList from '../components/MatchList'
import PostList from '../components/PostList'
import { Empty, ErrorBox, Loading } from '../components/StatusViews'
import { useApi } from '../lib/api'
import { formatDayLabel, todayKst } from '../lib/format'
import type { Match, PostList as PostListData } from '../lib/types'

export default function HomePage() {
  const today = todayKst()
  const matches = useApi<Match[]>(`/matches?date=${today}`)
  const posts = useApi<PostListData>('/posts?page=1')
  const latest = posts.data?.items.slice(0, 5)

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-bold">
            오늘의 경기 <span className="text-sm font-normal text-gray-500">{formatDayLabel(today)}</span>
          </h2>
          <Link to="/matches" className="text-sm text-blue-700">
            전체 일정
          </Link>
        </div>
        {matches.loading && <Loading />}
        {matches.error && <ErrorBox message={matches.error} onRetry={matches.reload} />}
        {matches.data &&
          (matches.data.length === 0 ? (
            <Empty text="오늘 예정된 경기가 없습니다." />
          ) : (
            <MatchList matches={matches.data} />
          ))}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-bold">최신 글</h2>
          <Link to="/board" className="text-sm text-blue-700">
            게시판 가기
          </Link>
        </div>
        {posts.loading && <Loading />}
        {posts.error && <ErrorBox message={posts.error} onRetry={posts.reload} />}
        {latest && (latest.length === 0 ? <Empty text="아직 글이 없습니다." /> : <PostList posts={latest} />)}
      </section>
    </div>
  )
}
