import { Link } from 'react-router'
import { MatchCard } from '../components/matches'
import { PostLine } from '../components/posts'
import { IconBall, IconChat, IconHome, IconMegaphone } from '../components/icons'
import { Card, EmptyState, ErrorBox, Loading, PageHeader } from '../components/ui'
import { buildQuery, useApi } from '../lib/api'
import { formatDayLabel, formatShort, todayKst } from '../lib/format'
import { useSettings } from '../lib/settings'
import { btnPrimary, linkAccent } from '../lib/styles'
import type { Match, Paged, PostSummary } from '../lib/types'

export default function HomePage() {
  const { settings } = useSettings()
  const today = todayKst()
  const matches = useApi<Match[]>(`/matches${buildQuery({ date: today })}`)
  const notices = useApi<Paged<PostSummary>>(`/posts${buildQuery({ category: 'notice', page: 1, pageSize: 20 })}`)
  const posts = useApi<Paged<PostSummary>>(`/posts${buildQuery({ page: 1, pageSize: 20 })}`)

  const sorted = matches.data
    ? [...matches.data].sort((a, b) => Number(b.status === 'live') - Number(a.status === 'live'))
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<IconHome size={20} />}
        title={settings.siteName}
        subtitle={`${formatDayLabel(today)} · 오늘의 경기와 이야기`}
        action={
          <Link to="/write?category=free" className={btnPrimary}>
            글쓰기
          </Link>
        }
      />

      <Card
        title="라이브 · 오늘의 경기"
        action={
          <Link to="/matches" className={linkAccent}>
            경기 일정 보기 →
          </Link>
        }
      >
        <div className="p-4">
          {matches.loading ? (
            <Loading />
          ) : matches.error ? (
            <ErrorBox message={matches.error} onRetry={matches.reload} />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={<IconBall size={20} />}
              title="오늘 예정된 경기가 없습니다"
              description="다른 날짜의 경기 일정을 확인해 보세요."
              action={
                <Link to="/matches" className={btnPrimary}>
                  경기 일정 보기
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {sorted.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card
        title="공지사항"
        action={
          <Link to="/board/notice" className={linkAccent}>
            더보기 →
          </Link>
        }
      >
        {notices.loading ? (
          <Loading />
        ) : notices.error ? (
          <div className="p-4">
            <ErrorBox message={notices.error} onRetry={notices.reload} />
          </div>
        ) : !notices.data || notices.data.items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-dim">등록된 공지가 없습니다.</p>
        ) : (
          notices.data.items.slice(0, 3).map((post) => (
            <Link
              key={post.id}
              to={`/posts/${post.id}`}
              className="flex items-center gap-3 border-b border-edge-soft px-4 py-2.5 last:border-b-0 hover:bg-card-hover"
            >
              <IconMegaphone className="shrink-0 text-gold" />
              <span className="min-w-0 flex-1 truncate font-medium">{post.title}</span>
              <span className="shrink-0 text-xs text-muted">{formatShort(post.createdAt)}</span>
            </Link>
          ))
        )}
      </Card>

      <Card
        title="최근 글"
        action={
          <Link to="/board/free" className={linkAccent}>
            자유게시판 →
          </Link>
        }
      >
        {posts.loading ? (
          <Loading />
        ) : posts.error ? (
          <div className="p-4">
            <ErrorBox message={posts.error} onRetry={posts.reload} />
          </div>
        ) : !posts.data || posts.data.items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={<IconChat size={20} />}
              title="아직 글이 없습니다"
              description="첫 번째 이야기를 남겨 보세요."
              action={
                <Link to="/write?category=free" className={btnPrimary}>
                  글쓰기
                </Link>
              }
            />
          </div>
        ) : (
          posts.data.items.slice(0, 10).map((post) => <PostLine key={post.id} post={post} />)
        )}
      </Card>
    </div>
  )
}
