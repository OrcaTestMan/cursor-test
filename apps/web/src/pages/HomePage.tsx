import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { MatchCard } from '../components/matches'
import {
  IconBall,
  IconChat,
  IconFire,
  IconMegaphone,
  IconNews,
  IconSmile,
  IconTarget,
  IconTicket,
  IconThumbUp,
} from '../components/icons'
import { OpenPollList } from '../components/poll'
import { PostLine } from '../components/posts'
import { TeamBadge } from '../components/teams'
import { EmptyState, ErrorBox, Loading, SegmentedTabs, type TabItem } from '../components/ui'
import { buildQuery, useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { addDays, CATEGORY_LABELS, formatDayLabel, formatRelative, formatShort, todayKst } from '../lib/format'
import { useSettings } from '../lib/settings'
import { btnPrimary, btnSecondary, linkAccent } from '../lib/styles'
import { useTitle } from '../lib/title'
import type { HotComment, Match, OpenPoll, Paged, PostSummary, PredictionRanking, Team } from '../lib/types'
import { RankingPreview } from './RankingPage'

const BOARD_BOXES: { to: string; en: string; label: string; hint: string; icon: typeof IconChat }[] = [
  { to: '/board/free', en: 'Talk', label: CATEGORY_LABELS.free, hint: '잡담 · 질문', icon: IconChat },
  { to: '/board/match', en: 'Match Talk', label: CATEGORY_LABELS.match, hint: '경기 중계 이야기', icon: IconBall },
  { to: '/board/review', en: 'Review', label: CATEGORY_LABELS.review, hint: '직관 · 분석', icon: IconTicket },
  { to: '/board/humor', en: 'Humor', label: CATEGORY_LABELS.humor, hint: '웃긴 장면 · 이슈', icon: IconSmile },
  { to: '/board/news', en: 'News', label: CATEGORY_LABELS.news, hint: '속보 · 구단 소식', icon: IconNews },
  { to: '/best', en: 'Best', label: '인기글', hint: '추천을 많이 받은 글', icon: IconFire },
]

type FeedTab = 'following' | 'best' | 'latest'
const FEED_TABS: TabItem<FeedTab>[] = [
  { value: 'following', label: '관심팀' },
  { value: 'best', label: '인기' },
  { value: 'latest', label: '최신' },
]

function SectionHead({ en, ko, to }: { en: string; ko: string; to?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="home-eyebrow mb-2">{en}</p>
        <h2 className="home-en m-0">{ko}</h2>
      </div>
      {to && (
        <Link to={to} className="shrink-0 pb-1 text-[11px] font-bold tracking-[0.16em] text-accent hover:text-accent-strong">
          MORE VIEW
        </Link>
      )}
    </div>
  )
}

function Glass({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[16px] border border-white/10 bg-white/[0.04] ${className}`}>{children}</section>
  )
}

function StatCell({ n, en, ko }: { n: number | null; en: string; ko: string }) {
  return (
    <div className="px-5 py-6">
      <p className="text-[11px] font-bold tracking-[0.16em] text-accent uppercase">{en}</p>
      <p className="home-stat-n mt-2 text-fg">{n === null ? '—' : n}</p>
      <p className="mt-2 text-sm text-dim">{ko}</p>
    </div>
  )
}

export default function HomePage() {
  const { settings } = useSettings()
  const { user } = useAuth()
  const today = todayKst()
  const weekFrom = addDays(today, -6)
  const myTeams = useApi<Team[]>(user ? '/me/teams' : null)
  const primary = myTeams.data?.find((team) => team.isPrimary) ?? myTeams.data?.[0] ?? null
  const [feed, setFeed] = useState<FeedTab>('latest')
  const matches = useApi<Match[]>(`/matches${buildQuery({ range: 'today' })}`)
  const teamMatches = useApi<Match[]>(primary ? `/matches${buildQuery({ teamId: primary.id, range: 'all' })}` : null)
  const notices = useApi<Paged<PostSummary>>(`/posts${buildQuery({ category: 'notice', range: 'all', page: 1, pageSize: 20 })}`)
  const todayPosts = useApi<Paged<PostSummary>>(`/posts${buildQuery({ range: 'today', page: 1, pageSize: 20 })}`)
  const photos = useApi<Paged<PostSummary>>(`/posts${buildQuery({ hasImage: 'true', range: 'today', page: 1, pageSize: 20 })}`)
  const followingPosts = useApi<Paged<PostSummary>>(
    primary && feed === 'following' ? `/posts${buildQuery({ teamId: primary.id, range: 'all', page: 1, pageSize: 20 })}` : null,
  )
  const latestPosts = useApi<Paged<PostSummary>>(feed === 'latest' ? `/posts${buildQuery({ range: 'today', page: 1, pageSize: 20 })}` : null)
  const bestPosts = useApi<Paged<PostSummary>>(
    feed === 'best' ? `/posts${buildQuery({ best: 'true', range: 'custom', from: weekFrom, to: today, page: 1, pageSize: 20 })}` : null,
  )
  const hot = useApi<{ items: HotComment[] }>('/comments/hot')
  const ranking = useApi<PredictionRanking>('/rankings/predictions?range=all')
  const polls = useApi<{ items: OpenPoll[] }>('/polls')
  useTitle(null)

  const todaySorted = matches.data
    ? [...matches.data].sort((a, b) => Number(b.status === 'live') - Number(a.status === 'live'))
    : []
  const live = todaySorted.filter((item) => item.status === 'live')
  const featured = live[0] ?? todaySorted[0] ?? null
  const nextMine = (teamMatches.data ?? []).find((item) => item.status === 'live' || item.status === 'scheduled') ?? null
  const feedData = feed === 'following' ? followingPosts : feed === 'best' ? bestPosts : latestPosts
  const showFollowing = !!primary
  const tabs = showFollowing ? FEED_TABS : FEED_TABS.filter((item) => item.value !== 'following')
  const activeFeed: FeedTab = feed === 'following' && !showFollowing ? 'latest' : feed

  return (
    <div>
      <section className="home-hero px-4 pt-10 pb-14 lg:px-8 lg:pt-14 lg:pb-16">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div>
            <p className="home-eyebrow">
              TODAY · {formatDayLabel(today)}
              {live.length > 0 ? ` · LIVE ${live.length}` : ''}
            </p>
            <h1 className="home-title">
              오늘의 경기와
              <br />
              <strong>현장 이야기</strong>
            </h1>
            <p className="max-w-xl text-[17px] leading-relaxed text-dim">
              {settings.siteName}에서 응원팀 경기, 게시판, 예측을 한곳에서 이어 갑니다. 숫자는 오늘 실제로 올라온 기록만 보여 줍니다.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/write?category=free" className={btnPrimary}>
                글쓰기
              </Link>
              <Link to="/matches" className={btnSecondary}>
                경기 일정
              </Link>
              {live[0] && (
                <Link to={`/matches/${live[0].id}`} className={btnSecondary}>
                  응원방 입장
                </Link>
              )}
            </div>
          </div>
          <div className="rounded-[16px] border border-white/12 bg-[#161b22]/80 p-5 backdrop-blur-sm">
            <p className="text-[11px] font-bold tracking-[0.16em] text-accent uppercase">
              {featured?.status === 'live' ? 'Now Playing' : 'Today Match'}
            </p>
            {matches.loading ? (
              <Loading />
            ) : featured ? (
              <div className="mt-4">
                <MatchCard match={featured} />
                {primary && nextMine && nextMine.id !== featured.id && (
                  <p className="mt-3 text-xs text-dim">
                    내 응원팀 다음 경기{' '}
                    <Link to={`/matches/${nextMine.id}`} className="font-semibold text-accent">
                      {nextMine.homeTeam} vs {nextMine.awayTeam}
                    </Link>
                  </p>
                )}
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 border-y border-white/8 lg:grid-cols-4">
        <StatCell n={matches.data ? matches.data.length : null} en="Matches" ko="오늘 경기" />
        <StatCell n={matches.data ? live.length : null} en="Live" ko="진행 중" />
        <StatCell n={todayPosts.data ? todayPosts.data.total : null} en="Stories" ko="오늘 글" />
        <StatCell n={notices.data ? notices.data.total : null} en="Notice" ko="공지" />
      </div>

      <div className="space-y-16 px-4 py-14 lg:px-8">
        <section>
          <SectionHead en="Boards" ko="이야기 공간" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {BOARD_BOXES.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group relative overflow-hidden rounded-[16px] border border-white/10 bg-panel px-5 py-6 hover:border-accent/40"
                >
                  <span className="absolute inset-x-0 top-0 h-1 bg-accent-fill opacity-80" />
                  <span className="grid size-10 place-items-center rounded-[10px] bg-accent-soft text-accent">
                    <Icon size={18} />
                  </span>
                  <p className="mt-5 font-display text-2xl text-fg">{item.label}</p>
                  <p className="mt-1 text-[11px] font-bold tracking-[0.16em] text-accent uppercase">{item.en}</p>
                  <p className="mt-2 text-sm text-dim">{item.hint}</p>
                </Link>
              )
            })}
          </div>
        </section>

        {primary && (
          <section>
            <SectionHead en="My Team" ko="내 응원팀" to={`/teams/${primary.id}`} />
            <Glass className="p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {myTeams.data?.map((team) => (
                  <Link key={team.id} to={`/teams/${team.id}`}>
                    <TeamBadge team={team} />
                  </Link>
                ))}
              </div>
              {teamMatches.loading ? (
                <Loading />
              ) : teamMatches.error ? (
                <ErrorBox message={teamMatches.error} onRetry={teamMatches.reload} />
              ) : !nextMine ? (
                <EmptyState title="예정된 경기가 없습니다" description="팀 이름이 같은 경기만 연결합니다." />
              ) : (
                <div className="max-w-lg space-y-3">
                  <MatchCard match={nextMine} />
                  {nextMine.status === 'live' && (
                    <Link to={`/matches/${nextMine.id}`} className={btnPrimary}>
                      응원방 입장
                    </Link>
                  )}
                </div>
              )}
            </Glass>
          </section>
        )}

        <section>
          <SectionHead en="Today Matches" ko="오늘의 주요 경기" to="/matches" />
          {live.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {live.map((match) => (
                <Link key={match.id} to={`/matches/${match.id}`} className={btnSecondary}>
                  {match.homeTeam} vs {match.awayTeam} 응원방
                </Link>
              ))}
            </div>
          )}
          {matches.loading ? (
            <Loading />
          ) : matches.error ? (
            <ErrorBox message={matches.error} onRetry={matches.reload} />
          ) : todaySorted.length === 0 ? (
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
              {todaySorted.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHead en="Community" ko="피드" to={activeFeed === 'best' ? '/best' : '/search'} />
          <Glass>
            <div className="px-4 pt-4">
              <SegmentedTabs items={tabs} value={activeFeed} onChange={setFeed} />
              {activeFeed === 'following' && !primary && (
                <p className="mt-2 text-xs text-dim">
                  응원팀을 고르면 관련 글이 모입니다.{' '}
                  <Link to="/me?setup=teams" className="font-semibold text-accent">
                    팀 고르기
                  </Link>
                </p>
              )}
            </div>
            {feedData.loading ? (
              <Loading />
            ) : feedData.error ? (
              <div className="p-4">
                <ErrorBox message={feedData.error} onRetry={feedData.reload} />
              </div>
            ) : !feedData.data || feedData.data.items.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  icon={<IconChat size={20} />}
                  title={activeFeed === 'best' ? '이번 주 인기글이 없습니다' : activeFeed === 'following' ? '관심팀 글이 없습니다' : '아직 글이 없습니다'}
                  description={
                    activeFeed === 'following'
                      ? '글쓰기에서 관련 팀을 고르면 여기에 보입니다.'
                      : '첫 번째 이야기를 남겨 보세요.'
                  }
                />
              </div>
            ) : (
              feedData.data.items.slice(0, 10).map((post) => <PostLine key={post.id} post={post} />)
            )}
          </Glass>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Glass>
            <div className="border-b border-white/8 px-5 py-4">
              <p className="home-eyebrow mb-1">Poll</p>
              <h2 className="m-0 text-xl font-bold">오늘의 투표</h2>
            </div>
            {polls.loading ? (
              <Loading />
            ) : polls.error ? (
              <div className="p-4">
                <ErrorBox message={polls.error} onRetry={polls.reload} />
              </div>
            ) : (
              <OpenPollList items={polls.data?.items ?? []} />
            )}
          </Glass>
          <Glass>
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div>
                <p className="home-eyebrow mb-1">Photos</p>
                <h2 className="m-0 text-xl font-bold">사진이 있는 글</h2>
              </div>
              <Link to="/board/review" className={linkAccent}>
                MORE VIEW
              </Link>
            </div>
            {photos.loading ? (
              <Loading />
            ) : photos.error ? (
              <div className="p-4">
                <ErrorBox message={photos.error} onRetry={photos.reload} />
              </div>
            ) : !photos.data || photos.data.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-dim">사진이 붙은 글이 아직 없습니다.</p>
            ) : (
              photos.data.items.slice(0, 5).map((post) => <PostLine key={post.id} post={post} />)
            )}
          </Glass>
          <Glass>
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div>
                <p className="home-eyebrow mb-1">Comments</p>
                <h2 className="m-0 text-xl font-bold">인기 댓글</h2>
              </div>
              <Link to="/board/free" className={linkAccent}>
                MORE VIEW
              </Link>
            </div>
            {hot.loading ? (
              <Loading />
            ) : hot.error ? (
              <div className="p-4">
                <ErrorBox message={hot.error} onRetry={hot.reload} />
              </div>
            ) : !hot.data || hot.data.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-dim">최근 댓글이 없습니다.</p>
            ) : (
              hot.data.items.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  to={`/posts/${item.postId}#comment-${item.id}`}
                  className="block border-b border-white/8 px-5 py-3 last:border-b-0 hover:bg-white/4"
                >
                  <p className="truncate text-sm">{item.body}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-dim">
                    <span className="font-medium">{item.author.nickname}</span>
                    <span className="truncate">{item.postTitle}</span>
                    <span className="ml-auto flex items-center gap-1 tabular-nums">
                      <IconThumbUp size={12} /> {item.likeCount}
                    </span>
                    <span className="tabular-nums">{formatRelative(item.createdAt)}</span>
                  </p>
                </Link>
              ))
            )}
          </Glass>
          <Glass>
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div>
                <p className="home-eyebrow mb-1">Notice</p>
                <h2 className="m-0 text-xl font-bold">최근 공지</h2>
              </div>
              <Link to="/board/notice" className={linkAccent}>
                MORE VIEW
              </Link>
            </div>
            {notices.loading ? (
              <Loading />
            ) : notices.error ? (
              <div className="p-4">
                <ErrorBox message={notices.error} onRetry={notices.reload} />
              </div>
            ) : !notices.data || notices.data.items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-dim">등록된 공지가 없습니다.</p>
            ) : (
              notices.data.items.slice(0, 4).map((post) => (
                <Link
                  key={post.id}
                  to={`/posts/${post.id}`}
                  className="flex items-center gap-3 border-b border-white/8 px-5 py-3 last:border-b-0 hover:bg-white/4"
                >
                  <IconMegaphone className="shrink-0 text-gold" />
                  <span className="min-w-0 flex-1 truncate font-medium">{post.title}</span>
                  <span className="shrink-0 text-xs text-muted">{formatShort(post.createdAt)}</span>
                </Link>
              ))
            )}
          </Glass>
        </div>

        <section>
          <SectionHead en="Ranking" ko="예측 랭킹" to="/ranking" />
          <Glass>
            {ranking.loading ? (
              <Loading />
            ) : ranking.error ? (
              <div className="p-4">
                <ErrorBox message={ranking.error} onRetry={ranking.reload} />
              </div>
            ) : (
              <RankingPreview items={ranking.data?.items ?? []} />
            )}
            <p className="flex items-center gap-1.5 border-t border-white/8 px-5 py-3 text-xs text-muted">
              <IconTarget size={12} /> 종료된 경기 예측만 집계합니다. 포인트나 보상은 없습니다.
            </p>
          </Glass>
        </section>
      </div>

      <section className="bg-accent-fill px-4 py-12 text-center lg:px-8">
        <p className="text-[12px] font-bold tracking-[0.18em] text-white/80 uppercase">Join the match</p>
        <h2 className="mt-3 font-display text-3xl text-white sm:text-4xl">
          {live.length > 0 ? '지금 진행 중인 경기에 입장하세요' : '오늘 이야기를 남겨 보세요'}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-white/80">
          {live.length > 0
            ? '라이브 응원방에서 점수와 장면을 같이 봅니다.'
            : '자유게시판에 첫 글을 쓰거나, 경기 일정에서 다음 경기를 확인하세요.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {live[0] ? (
            <Link
              to={`/matches/${live[0].id}`}
              className="inline-flex h-11 items-center rounded-full bg-white px-5 font-bold text-accent-fill hover:bg-white/90"
            >
              응원방 입장
            </Link>
          ) : (
            <Link
              to="/write?category=free"
              className="inline-flex h-11 items-center rounded-full bg-white px-5 font-bold text-accent-fill hover:bg-white/90"
            >
              글쓰기
            </Link>
          )}
          <Link
            to="/matches"
            className="inline-flex h-11 items-center rounded-full border border-white/40 px-5 font-bold text-white hover:bg-white/10"
          >
            경기 일정
          </Link>
        </div>
      </section>
    </div>
  )
}
