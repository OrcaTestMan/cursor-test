import { Link } from 'react-router'
import { STATUS_LABELS, formatTime, scoreText } from '../lib/format'
import type { Match } from '../lib/types'

export default function MatchList({ matches }: { matches: Match[] }) {
  return (
    <ul className="divide-y divide-gray-100 rounded border border-gray-200 bg-white">
      {matches.map((match) => (
        <li key={match.id}>
          <Link
            to={`/matches/${match.id}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-gray-50"
          >
            <span className="w-12 font-mono text-gray-600">{formatTime(match.kickoffAt)}</span>
            <span className="w-24 truncate text-xs text-gray-500">{match.leagueName}</span>
            <span className="flex flex-1 items-center justify-center gap-2 font-medium">
              <span className="text-right">{match.homeTeam}</span>
              <span className="min-w-12 text-center text-gray-700">{scoreText(match)}</span>
              <span>{match.awayTeam}</span>
            </span>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {STATUS_LABELS[match.status]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
