import { Link } from 'react-router'
import { formatTime, hasScore, scoreText } from '../lib/format'
import type { Match } from '../lib/types'
import { IconChat } from './icons'
import { MatchStatusPill } from './ui'

export function MatchRow({ match }: { match: Match }) {
  return (
    <Link
      to={`/matches/${match.id}`}
      className="grid grid-cols-[52px_1fr_auto] items-center gap-3 border-b border-edge-soft px-4 py-3 last:border-b-0 hover:bg-card-hover sm:grid-cols-[60px_1fr_80px_56px]"
    >
      <span className="text-sm font-semibold text-dim tabular-nums">{formatTime(match.kickoffAt)}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-right font-semibold">{match.homeTeam}</span>
        <span
          className={`w-14 shrink-0 text-center tabular-nums ${hasScore(match) ? 'font-bold' : 'text-xs font-semibold text-muted'}`}
        >
          {scoreText(match)}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{match.awayTeam}</span>
      </span>
      <span className="flex justify-end sm:justify-center">
        <MatchStatusPill status={match.status} />
      </span>
      <span className="hidden items-center justify-end gap-1 text-xs text-dim sm:flex">
        <IconChat size={14} />
        {match.postCount}
      </span>
    </Link>
  )
}

export function MatchCard({ match }: { match: Match }) {
  return (
    <Link
      to={`/matches/${match.id}`}
      className={`block rounded-[16px] border bg-panel p-5 transition-colors hover:bg-card-hover ${
        match.status === 'live' ? 'border-danger/50' : 'border-white/10'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-dim">
          {match.leagueName} · {formatTime(match.kickoffAt)}
        </span>
        <MatchStatusPill status={match.status} />
      </div>
      <div className="space-y-1.5">
        <TeamLine name={match.homeTeam} score={match.homeScore} />
        <TeamLine name={match.awayTeam} score={match.awayScore} />
      </div>
      <div className="mt-3 flex items-center gap-1 text-xs text-muted">
        <IconChat size={13} />
        이야기 {match.postCount}
      </div>
    </Link>
  )
}

function TeamLine({ name, score }: { name: string; score: number | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate font-semibold">{name}</span>
      <span className="text-base font-bold tabular-nums">{score ?? '-'}</span>
    </div>
  )
}

export function MiniMatchRow({ match }: { match: Match }) {
  return (
    <Link to={`/matches/${match.id}`} className="block rounded-lg px-2 py-2 hover:bg-card-hover">
      <div className="flex items-center justify-between gap-2 text-xs text-dim">
        <span className="truncate">
          {formatTime(match.kickoffAt)} · {match.leagueName}
        </span>
        <MatchStatusPill status={match.status} />
      </div>
      <div className="mt-1 truncate text-sm font-semibold">
        {match.homeTeam} <span className="px-1 text-muted">{hasScore(match) ? scoreText(match) : 'vs'}</span>{' '}
        {match.awayTeam}
      </div>
    </Link>
  )
}