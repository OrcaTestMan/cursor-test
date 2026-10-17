import { Link, useParams } from 'react-router'
import { IconChat } from '../components/icons'
import { PostLine } from '../components/posts'
import { Card, CenteredMessage, EmptyState, ErrorBox, Loading, MatchStatusPill } from '../components/ui'
import { buildQuery, useApi } from '../lib/api'
import { formatDateTime, hasScore, toPositiveInt } from '../lib/format'
import { btnPrimary, btnSecondary } from '../lib/styles'
import type { Match, Paged, PostSummary } from '../lib/types'

export default function MatchDetailPage() {
  const id = toPositiveInt(useParams().id)
  const match = useApi<Match>(id ? `/matches/${id}` : null)
  const posts = useApi<Paged<PostSummary>>(id ? `/posts${buildQuery({ category: 'match', matchId: id, page: 1, pageSize: 50 })}` : null)

  if (!id)
    return (
      <CenteredMessage
        title="경기를 찾을 수 없습니다."
        action={
          <Link to="/matches" className={btnSecondary}>
            경기 일정으로
          </Link>
        }
      />
    )
  if (match.loading) return <Loading />
  if (match.error || !match.data) return <ErrorBox message={match.error ?? '경기를 찾을 수 없습니다.'} onRetry={match.reload} />

  const m = match.data
  const writeLink = `/write?category=match&matchId=${m.id}`

  return (
    <div className="space-y-5">
      <Link to="/matches" className="text-xs text-dim hover:text-fg">
        ← 경기 일정
      </Link>
      <section className={`rounded-xl border bg-card p-6 ${m.status === 'live' ? 'border-danger/50' : 'border-edge'}`}>
        <div className="mb-5 flex items-center justify-center gap-2 text-xs text-dim">
          <span>{m.leagueName}</span>
          <span className="text-muted">·</span>
          <MatchStatusPill status={m.status} />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted">홈</p>
            <p className="mt-1 text-lg font-bold break-keep sm:text-2xl">{m.homeTeam}</p>
          </div>
          <div className="text-center">
            {hasScore(m) ? (
              <p className="text-3xl font-bold tabular-nums sm:text-4xl">
                {m.homeScore} <span className="text-muted">:</span> {m.awayScore}
              </p>
            ) : (
              <p className="text-xl font-bold text-muted">VS</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted">원정</p>
            <p className="mt-1 text-lg font-bold break-keep sm:text-2xl">{m.awayTeam}</p>
          </div>
        </div>
      </section>

      <Card title="경기 정보">
        <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2">
          <InfoRow label="시작 시각" value={formatDateTime(m.kickoffAt)} />
          <InfoRow label="경기장" value={m.venue || '-'} />
          <InfoRow label="리그" value={m.leagueName} />
          <InfoRow label="종목" value={m.sport} />
        </dl>
      </Card>

      <Card
        title={`이 경기 이야기 ${posts.data ? posts.data.total : ''}`}
        action={
          <Link to={writeLink} className={`${btnPrimary} h-8 px-3`}>
            이 경기 글쓰기
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
              title="아직 이 경기 이야기가 없습니다"
              description="경기에 대한 생각을 처음으로 남겨 보세요."
              action={
                <Link to={writeLink} className={btnPrimary}>
                  이 경기 글쓰기
                </Link>
              }
            />
          </div>
        ) : (
          posts.data.items.map((post) => <PostLine key={post.id} post={post} />)
        )}
      </Card>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-dim">{label}</dt>
      <dd className="min-w-0 font-medium">{value}</dd>
    </div>
  )
}
