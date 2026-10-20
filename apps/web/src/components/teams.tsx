import { chipCls } from '../lib/styles'
import type { Team } from '../lib/types'

export function TeamBadge({ team, size = 'sm' }: { team: Pick<Team, 'name' | 'sport'>; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'h-6 px-2 text-xs' : 'h-5 px-1.5 text-[11px]'
  return (
    <span
      className={`inline-flex items-center rounded-md bg-accent-soft font-semibold text-accent ${cls}`}
      title={team.sport}
    >
      {team.name}
    </span>
  )
}

export function TeamPicker({
  teams,
  selectedIds,
  primaryId,
  onChange,
  max = 10,
}: {
  teams: Team[]
  selectedIds: number[]
  primaryId: number | null
  onChange: (ids: number[], primary: number | null) => void
  max?: number
}) {
  const grouped = new Map<string, Team[]>()
  for (const team of teams) {
    const list = grouped.get(team.sport) ?? []
    list.push(team)
    grouped.set(team.sport, list)
  }

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      const ids = selectedIds.filter((item) => item !== id)
      const primary = primaryId === id ? (ids[0] ?? null) : primaryId
      onChange(ids, primary)
      return
    }
    if (selectedIds.length >= max) return
    const ids = [...selectedIds, id]
    onChange(ids, primaryId ?? id)
  }

  return (
    <div className="space-y-4">
      {selectedIds.length >= max && (
        <p className="text-xs text-gold">응원팀은 {max}개까지 고를 수 있습니다.</p>
      )}
      {[...grouped.entries()].map(([sport, list]) => (
        <div key={sport}>
          <p className="mb-2 text-xs font-medium text-muted">{sport}</p>
          <div className="flex flex-wrap gap-2">
            {list.map((team) => (
              <button key={team.id} type="button" className={chipCls(selectedIds.includes(team.id))} onClick={() => toggle(team.id)}>
                {team.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      {selectedIds.length > 1 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted">대표 응원팀</p>
          <div className="flex flex-wrap gap-2">
            {teams
              .filter((team) => selectedIds.includes(team.id))
              .map((team) => (
                <button key={team.id} type="button" className={chipCls(primaryId === team.id)} onClick={() => onChange(selectedIds, team.id)}>
                  {team.name}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
