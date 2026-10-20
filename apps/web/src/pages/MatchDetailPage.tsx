import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ChatPanel } from '../components/chat'
import { IconChat, IconTrophy } from '../components/icons'
import { PostLine } from '../components/posts'
import { BackButton, Card, CenteredMessage, EmptyState, ErrorBox, FormError, Loading, MatchStatusPill, Pill } from '../components/ui'
import { apiFetch, buildQuery, errorMessage, useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  formatDateTime,
  hasScore,
  PICK_LABELS,
  percent,
  PREDICTION_RESULT_LABELS,
  toPositiveInt,
} from '../lib/format'
import { btnPrimary, btnSecondary } from '../lib/styles'
import { useTitle } from '../lib/title'
import type { CheerSide, MatchDetail, Paged, PostSummary, PredictionPick } from '../lib/types'

function useLoginPrompt() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  return (message: string): boolean => {
    if (user) return true
    if (window.confirm(`${message}\n로그인 화면으로 이동할까요?`)) {
      navigate(`/login?next=${encodeURIComponent(location.pathname + location.search)}`)
    }
    return false
  }
}

function pickResult(match: MatchDetail): 'hit' | 'miss' | null {
  if (match.status !== 'finished' || !match.myPick || !hasScore(match)) return null
  const home = match.homeScore ?? 0
  const away = match.awayScore ?? 0
  const actual: PredictionPick = home > away ? 'home' : home < away ? 'away' : 'draw'
  return actual === match.myPick ? 'hit' : 'miss'
}

export default function MatchDetailPage() {
  const id = toPositiveInt(useParams().id)
  const match = useApi<MatchDetail>(id ? `/matches/${id}` : null)
  const posts = useApi<Paged<PostSummary>>(id ? `/posts${buildQuery({ category: 'match', matchId: id, range: 'all', page: 1, pageSize: 50 })}` : null)
  useTitle(match.data ? `${match.data.homeTeam} vs ${match.data.awayTeam}` : '경기')

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

  return <MatchView key={match.data.id} match={match.data} posts={posts} />
}

function MatchView({
  match,
  posts,
}: {
  match: MatchDetail
  posts: ReturnType<typeof useApi<Paged<PostSummary>>>
}) {
  const [detail, setDetail] = useState(match)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<'cheer' | 'pick' | null>(null)
  const askLogin = useLoginPrompt()
  const m = detail.id === match.id ? detail : match
  const writeLink = `/write?category=match&matchId=${m.id}`
  const standingsLink = `/standings?leagueId=${m.leagueId}`
  const result = pickResult(m)

  const run = async (kind: 'cheer' | 'pick', action: () => Promise<MatchDetail>) => {
    setBusy(kind)
    setError(null)
    try {
      setDetail(await action())
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const onCheer = async (side: CheerSide) => {
    if (!askLogin('응원하려면 로그인이 필요합니다.')) return
    if (!m.open) return
    await run('cheer', () =>
      apiFetch<MatchDetail>(`/matches/${m.id}/cheer`, {
        method: m.myCheer === side ? 'DELETE' : 'PUT',
        body: m.myCheer === side ? undefined : { side },
      }),
    )
  }

  const onPick = async (pick: PredictionPick) => {
    if (!askLogin('예측하려면 로그인이 필요합니다.')) return
    if (!m.open) return
    await run('pick', () => apiFetch<MatchDetail>(`/matches/${m.id}/prediction`, { method: 'PUT', body: { pick } }))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to={standingsLink} className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-strong">
          <IconTrophy size={14} />
          {m.leagueName} 순위
        </Link>
        <BackButton fallback="/matches" />
      </div>
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

      <CheerBar match={m} busy={busy === 'cheer'} onCheer={(side) => void onCheer(side)} />
      <PredictionCard match={m} result={result} busy={busy === 'pick'} onPick={(pick) => void onPick(pick)} />
      <ChatPanel matchId={m.id} />

      {error && <FormError message={error} />}

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

function CheerBar({
  match,
  busy,
  onCheer,
}: {
  match: MatchDetail
  busy: boolean
  onCheer: (side: CheerSide) => void
}) {
  const home = match.cheers?.home ?? 0
  const away = match.cheers?.away ?? 0
  const total = home + away
  const homePct = percent(home, total)
  const awayPct = total > 0 ? 100 - homePct : 0
  const homeWidth = total > 0 ? homePct : 50
  const awayWidth = total > 0 ? awayPct : 50

  return (
    <Card title="응원">
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between text-xs text-dim">
          <span>
            {match.homeTeam} {home.toLocaleString('ko-KR')}명 ({homePct}%)
          </span>
          <span>
            {match.awayTeam} {away.toLocaleString('ko-KR')}명 ({awayPct}%)
          </span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-edge" aria-hidden>
          <div className="h-full bg-accent" style={{ width: `${homeWidth}%` }} />
          <div className="h-full bg-danger" style={{ width: `${awayWidth}%` }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!match.open || busy}
            onClick={() => onCheer('home')}
            className={`${btnSecondary} ${match.myCheer === 'home' ? 'border-accent/50 bg-accent-soft text-accent' : ''}`}
          >
            {match.homeTeam} 응원
          </button>
          <button
            type="button"
            disabled={!match.open || busy}
            onClick={() => onCheer('away')}
            className={`${btnSecondary} ${match.myCheer === 'away' ? 'border-danger/50 bg-danger-soft text-danger' : ''}`}
          >
            {match.awayTeam} 응원
          </button>
        </div>
        {!match.open && <p className="text-xs text-dim">경기가 시작되어 응원을 바꿀 수 없습니다.</p>}
      </div>
    </Card>
  )
}

function PredictionCard({
  match,
  result,
  busy,
  onPick,
}: {
  match: MatchDetail
  result: 'hit' | 'miss' | null
  busy: boolean
  onPick: (pick: PredictionPick) => void
}) {
  const prediction = match.prediction ?? { home: 0, draw: 0, away: 0 }
  const total = prediction.home + prediction.draw + prediction.away
  const options: { pick: PredictionPick; label: string; count: number }[] = [
    { pick: 'home', label: match.homeTeam, count: prediction.home },
    { pick: 'draw', label: PICK_LABELS.draw, count: prediction.draw },
    { pick: 'away', label: match.awayTeam, count: prediction.away },
  ]

  return (
    <Card title="승부 예측">
      <div className="space-y-3 p-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map((opt) => {
            const pct = percent(opt.count, total)
            return (
              <button
                key={opt.pick}
                type="button"
                disabled={!match.open || busy}
                onClick={() => onPick(opt.pick)}
                className={`${btnSecondary} h-auto flex-col py-3 ${match.myPick === opt.pick ? 'border-accent/50 bg-accent-soft text-accent' : ''}`}
              >
                <span>{opt.label}</span>
                <span className="text-lg font-bold tabular-nums">{pct}%</span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {match.myPick ? (
            <span>
              내 예측 <span className="font-semibold">{PICK_LABELS[match.myPick]}</span>
            </span>
          ) : (
            <span className="text-dim">아직 예측하지 않았습니다.</span>
          )}
          {result && <Pill tone={result === 'hit' ? 'green' : 'red'}>{PREDICTION_RESULT_LABELS[result]}</Pill>}
        </div>
        {!match.open && match.status !== 'finished' && <p className="text-xs text-dim">경기가 시작되어 예측할 수 없습니다.</p>}
        <p className="text-xs text-muted">포인트나 보상이 없는 재미용 예측입니다.</p>
      </div>
    </Card>
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
