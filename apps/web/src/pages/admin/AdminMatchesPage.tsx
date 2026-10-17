import { useState, type FormEvent } from 'react'
import { IconBall, IconPlus, IconSearch } from '../../components/icons'
import { EmptyState, ErrorBox, Field, FormError, Loading, MatchStatusPill, Modal, PageHeader, Pagination, SegmentedTabs, type TabItem } from '../../components/ui'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { formatShort, fromKstInput, hasScore, isDay, isMatchStatus, MATCH_STATUS_LABELS, scoreText, toKstInput, toPositiveInt } from '../../lib/format'
import { useQueryState } from '../../lib/params'
import { btnPrimary, btnSecondary, btnSmDanger, btnSmSecondary, inputCls, selectCls, tdCls, thCls, trCls } from '../../lib/styles'
import type { League, Match, MatchStatus, Paged } from '../../lib/types'

type StatusTab = MatchStatus | 'all'

const STATUS_TABS: TabItem<StatusTab>[] = [
  { value: 'all', label: '전체' },
  ...(Object.keys(MATCH_STATUS_LABELS) as MatchStatus[]).map((s) => ({ value: s, label: MATCH_STATUS_LABELS[s] })),
]

export default function AdminMatchesPage() {
  const qs = useQueryState()
  const from = isDay(qs.get('from')) ? qs.get('from') : ''
  const to = isDay(qs.get('to')) ? qs.get('to') : ''
  const leagueId = toPositiveInt(qs.get('leagueId'))
  const statusParam = qs.get('status')
  const status: StatusTab = isMatchStatus(statusParam) ? statusParam : 'all'
  const q = qs.get('q')
  const [search, setSearch] = useState(q)
  const [editing, setEditing] = useState<Match | 'new' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const leagues = useApi<League[]>('/leagues')
  const list = useApi<Paged<Match>>(
    `/admin/matches${buildQuery({
      from: from || null,
      to: to || null,
      leagueId,
      status: status === 'all' ? null : status,
      q: q || null,
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    qs.update({ q: search.trim() || null })
  }

  const onDelete = async (match: Match) => {
    if (!window.confirm(`${match.homeTeam} vs ${match.awayTeam} 경기를 삭제할까요?\n연결된 글은 경기 연결만 풀립니다.`)) return
    setDeletingId(match.id)
    setActionError(null)
    try {
      await apiFetch<void>(`/admin/matches/${match.id}`, { method: 'DELETE' })
      list.reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        icon={<IconBall size={20} />}
        title="경기 관리"
        subtitle="경기 일정과 결과를 등록하고 고칩니다."
        action={
          <button type="button" onClick={() => setEditing('new')} className={btnPrimary}>
            <IconPlus /> 경기 등록
          </button>
        }
      />

      <div className="mb-3">
        <SegmentedTabs items={STATUS_TABS} value={status} onChange={(v) => qs.update({ status: v === 'all' ? null : v })} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input type="date" aria-label="시작일" value={from} onChange={(e) => qs.update({ from: e.target.value || null })} className={`${inputCls} w-40!`} />
        <span className="text-muted">~</span>
        <input type="date" aria-label="종료일" value={to} onChange={(e) => qs.update({ to: e.target.value || null })} className={`${inputCls} w-40!`} />
        <select
          aria-label="리그"
          value={leagueId ?? ''}
          onChange={(e) => qs.update({ leagueId: e.target.value || null })}
          className={selectCls}
        >
          <option value="">전체 리그</option>
          {leagues.data?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <form onSubmit={onSearch} className="flex gap-2">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="팀 이름" aria-label="팀 이름 검색" className={`${inputCls} w-44! pl-9`} />
          </div>
          <button type="submit" className={btnSecondary}>
            검색
          </button>
        </form>
      </div>

      {actionError && (
        <div className="mb-3">
          <FormError message={actionError} />
        </div>
      )}

      {list.loading ? (
        <Loading />
      ) : list.error ? (
        <ErrorBox message={list.error} onRetry={list.reload} />
      ) : !list.data || list.data.items.length === 0 ? (
        <EmptyState
          icon={<IconBall size={20} />}
          title="조건에 맞는 경기가 없습니다"
          description="필터를 바꾸거나 새 경기를 등록하세요."
          action={
            <button type="button" onClick={() => setEditing('new')} className={btnPrimary}>
              경기 등록
            </button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-edge bg-card">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-edge">
                <tr>
                  <th className={thCls}>ID</th>
                  <th className={thCls}>시작</th>
                  <th className={thCls}>리그</th>
                  <th className={`${thCls} text-right`}>홈</th>
                  <th className={`${thCls} text-center`}>점수</th>
                  <th className={thCls}>원정</th>
                  <th className={thCls}>경기장</th>
                  <th className={thCls}>상태</th>
                  <th className={`${thCls} text-right`}>글</th>
                  <th className={`${thCls} text-right`}>관리</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((m) => (
                  <tr key={m.id} className={trCls}>
                    <td className={`${tdCls} text-muted`}>#{m.id}</td>
                    <td className={`${tdCls} tabular-nums`}>{formatShort(m.kickoffAt)}</td>
                    <td className={`${tdCls} text-dim`}>{m.leagueName}</td>
                    <td className={`${tdCls} text-right font-semibold`}>{m.homeTeam}</td>
                    <td className={`${tdCls} text-center tabular-nums ${hasScore(m) ? 'font-bold' : 'text-muted'}`}>{scoreText(m)}</td>
                    <td className={`${tdCls} font-semibold`}>{m.awayTeam}</td>
                    <td className={`${tdCls} text-dim`}>{m.venue || '-'}</td>
                    <td className={tdCls}>
                      <MatchStatusPill status={m.status} />
                    </td>
                    <td className={`${tdCls} text-right tabular-nums`}>{m.postCount}</td>
                    <td className={`${tdCls} text-right`}>
                      <span className="inline-flex gap-1.5">
                        <button type="button" onClick={() => setEditing(m)} className={btnSmSecondary}>
                          수정
                        </button>
                        <button type="button" disabled={deletingId === m.id} onClick={() => void onDelete(m)} className={btnSmDanger}>
                          삭제
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={qs.page}
            pageSize={qs.pageSize}
            total={list.data.total}
            onPage={(p) => qs.update({ page: p })}
            onPageSize={(size) => qs.update({ pageSize: size })}
          />
        </>
      )}

      {editing && (
        <MatchForm
          match={editing === 'new' ? null : editing}
          leagues={leagues.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            list.reload()
          }}
        />
      )}
    </div>
  )
}

function parseScore(value: string): number | null | 'invalid' {
  const text = value.trim()
  if (text === '') return null
  if (!/^\d+$/.test(text)) return 'invalid'
  const n = Number(text)
  return n <= 999 ? n : 'invalid'
}

function MatchForm({
  match,
  leagues,
  onClose,
  onSaved,
}: {
  match: Match | null
  leagues: League[]
  onClose: () => void
  onSaved: () => void
}) {
  const [leagueId, setLeagueId] = useState(match ? String(match.leagueId) : leagues[0] ? String(leagues[0].id) : '')
  const [homeTeam, setHomeTeam] = useState(match?.homeTeam ?? '')
  const [awayTeam, setAwayTeam] = useState(match?.awayTeam ?? '')
  const [kickoff, setKickoff] = useState(match ? toKstInput(match.kickoffAt) : '')
  const [venue, setVenue] = useState(match?.venue ?? '')
  const [status, setStatus] = useState<MatchStatus>(match?.status ?? 'scheduled')
  const [homeScore, setHomeScore] = useState(match?.homeScore === null || !match ? '' : String(match.homeScore))
  const [awayScore, setAwayScore] = useState(match?.awayScore === null || !match ? '' : String(match.awayScore))
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const league = toPositiveInt(leagueId)
    const home = homeTeam.trim()
    const away = awayTeam.trim()
    const kickoffAt = fromKstInput(kickoff)
    const hs = parseScore(homeScore)
    const as = parseScore(awayScore)
    const problems: string[] = []
    if (!league) problems.push('리그를 선택해 주세요.')
    if (!home || home.length > 50) problems.push('홈 팀 이름은 1~50자로 입력해 주세요.')
    if (!away || away.length > 50) problems.push('원정 팀 이름은 1~50자로 입력해 주세요.')
    if (!kickoffAt) problems.push('시작 시각을 입력해 주세요.')
    if (venue.trim().length > 100) problems.push('경기장은 100자까지 쓸 수 있습니다.')
    if (hs === 'invalid' || as === 'invalid') problems.push('점수는 0~999 사이 정수로 입력하거나 비워 두세요.')
    if (problems.length > 0) return setError(problems.join('\n'))

    setSending(true)
    setError(null)
    try {
      if (match) {
        await apiFetch<Match>(`/admin/matches/${match.id}`, {
          method: 'PATCH',
          body: {
            leagueId: league,
            homeTeam: home,
            awayTeam: away,
            kickoffAt,
            venue: venue.trim(),
            status,
            homeScore: hs,
            awayScore: as,
          },
        })
      } else {
        await apiFetch<Match>('/admin/matches', {
          method: 'POST',
          body: { leagueId: league, homeTeam: home, awayTeam: away, kickoffAt, ...(venue.trim() ? { venue: venue.trim() } : {}) },
        })
      }
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
      setSending(false)
    }
  }

  return (
    <Modal title={match ? `경기 수정 #${match.id}` : '경기 등록'} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="리그">
            <select value={leagueId} onChange={(e) => setLeagueId(e.target.value)} className={`${selectCls} w-full`}>
              {leagues.length === 0 && <option value="">등록된 리그가 없습니다</option>}
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.sport})
                </option>
              ))}
            </select>
          </Field>
          <Field label="시작 시각 (한국 시간)">
            <input type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)} className={inputCls} />
          </Field>
          <Field label="홈 팀">
            <input value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)} maxLength={50} className={inputCls} />
          </Field>
          <Field label="원정 팀">
            <input value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)} maxLength={50} className={inputCls} />
          </Field>
          <Field label="경기장" hint="비워 둘 수 있습니다.">
            <input value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={100} className={inputCls} />
          </Field>
          {match && (
            <Field label="상태">
              <select
                value={status}
                onChange={(e) => {
                  const value = e.target.value
                  if (isMatchStatus(value)) setStatus(value)
                }}
                className={`${selectCls} w-full`}
              >
                {(Object.keys(MATCH_STATUS_LABELS) as MatchStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {MATCH_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {match && (
            <>
              <Field label="홈 점수" hint="비우면 점수 없음">
                <input inputMode="numeric" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} className={inputCls} />
              </Field>
              <Field label="원정 점수" hint="비우면 점수 없음">
                <input inputMode="numeric" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} className={inputCls} />
              </Field>
            </>
          )}
        </div>
        {!match && <p className="text-xs text-muted">상태와 점수는 등록한 뒤 수정 화면에서 바꿀 수 있습니다. 새 경기는 ‘예정’으로 등록됩니다.</p>}
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            취소
          </button>
          <button type="submit" disabled={sending} className={btnPrimary}>
            {sending ? '저장 중...' : match ? '저장' : '등록'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
