import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EmptyFilterActions, ListFilterBar, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../components/filters'
import { MiniMatchRow } from '../components/matches'
import { OpenPollList } from '../components/poll'
import { PostTable } from '../components/posts'
import { TeamBadge } from '../components/teams'
import { EmptyState, ErrorBox, Loading, PageHeader, Pagination, SegmentedTabs, type TabItem } from '../components/ui'
import { apiFetch, buildQuery, errorMessage, useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../lib/list-query'
import { useQueryState } from '../lib/params'
import { btnPrimary, btnSecondary, cardCls } from '../lib/styles'
import { useTitle } from '../lib/title'
import { toPositiveInt } from '../lib/format'
import type { Match, MeProfile, OpenPoll, Paged, PostSummary, Team } from '../lib/types'
import NotFoundPage from './NotFoundPage'

type PostTab = 'all' | 'best'
const TABS: TabItem<PostTab>[] = [
  { value: 'all', label: '글' },
  { value: 'best', label: '인기글' },
]

export default function TeamPage() {
  const id = toPositiveInt(useParams().id)
  if (!id) return <NotFoundPage />
  return <TeamSpace key={id} id={id} />
}

function TeamSpace({ id }: { id: number }) {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const team = useApi<Team>(`/teams/${id}`)
  const matches = useApi<Match[]>(`/matches${buildQuery({ teamId: id, range: 'all' })}`)
  const mine = useApi<Team[]>(user ? '/me/teams' : null)
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, 'all')
  const [tab, setTab] = useState<PostTab>('all')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const posts = useApi<Paged<PostSummary>>(
    `/posts${buildQuery({
      teamId: id,
      best: tab === 'best' ? 'true' : null,
      ...dateFilterQuery(appliedDates),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )
  const apply = (dates = draft) => qs.update({ ...serializeDateFilter(dates) })
  const reset = () => {
    const dates = { ...emptyDateFilter(), range: 'all' as const }
    setDraft(dates)
    qs.update({ ...serializeDateFilter(dates) }, { replace: true })
  }
  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates)))]
  const polls = useApi<{ items: OpenPoll[] }>(`/polls${buildQuery({ teamId: id })}`)
  useTitle(team.data ? team.data.name : '팀')

  if (team.loading) return <Loading />
  if (team.error || !team.data) return <ErrorBox message={team.error ?? '팀을 찾을 수 없습니다.'} onRetry={team.reload} />

  const following = mine.data?.some((item) => item.id === id) ?? false
  const grouped = {
    live: (matches.data ?? []).filter((item) => item.status === 'live'),
    scheduled: (matches.data ?? []).filter((item) => item.status === 'scheduled'),
    finished: (matches.data ?? []).filter((item) => item.status === 'finished'),
  }

  const onFollow = async () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/teams/${id}`)}`)
      return
    }
    setBusy(true)
    setActionError(null)
    try {
      const current = mine.data ?? []
      const nextIds = following ? current.filter((item) => item.id !== id).map((item) => item.id) : [...current.map((item) => item.id), id]
      const primary = following
        ? (current.find((item) => item.isPrimary && item.id !== id)?.id ?? nextIds[0] ?? null)
        : (current.find((item) => item.isPrimary)?.id ?? id)
      await apiFetch<MeProfile>('/me/profile', { method: 'PATCH', body: { teamIds: nextIds, primaryTeamId: primary } })
      await refresh()
      mine.reload()
    } catch (err) {
      setActionError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<TeamBadge team={team.data} size="md" />}
        title={team.data.name}
        subtitle={`${team.data.sport}${team.data.leagueId ? '' : ''}`}
        action={
          <div className="flex gap-2">
            <Link to={`/write?category=match`} className={btnSecondary}>
              글쓰기
            </Link>
            <button type="button" disabled={busy} onClick={() => void onFollow()} className={following ? btnSecondary : btnPrimary}>
              {busy ? '저장 중...' : following ? '응원팀 해제' : '응원팀으로 설정'}
            </button>
          </div>
        }
      />
      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      <section className={cardCls}>
        <div className="border-b border-edge-soft px-4 py-3">
          <h2 className="text-sm font-bold">경기</h2>
        </div>
        {matches.loading ? (
          <Loading />
        ) : matches.error ? (
          <div className="p-4">
            <ErrorBox message={matches.error} onRetry={matches.reload} />
          </div>
        ) : !matches.data || matches.data.length === 0 ? (
          <div className="p-4">
            <EmptyState title="연결된 경기가 없습니다" description="경기 팀 이름이 이 팀 이름과 같을 때만 여기에 모입니다." />
          </div>
        ) : (
          <div className="divide-y divide-edge-soft">
            {(['live', 'scheduled', 'finished'] as const).map((status) =>
              grouped[status].length === 0 ? null : (
                <div key={status} className="p-3">
                  <p className="mb-2 px-1 text-xs font-medium text-muted">
                    {status === 'live' ? '진행 중' : status === 'scheduled' ? '예정' : '종료'}
                  </p>
                  {grouped[status].map((match) => (
                    <MiniMatchRow key={match.id} match={match} />
                  ))}
                </div>
              ),
            )}
          </div>
        )}
      </section>

      <section className={cardCls}>
        <div className="border-b border-edge-soft px-4 py-3">
          <h2 className="text-sm font-bold">팀 투표</h2>
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
      </section>

      <section>
        <div className="mb-3">
          <SegmentedTabs items={TABS} value={tab} onChange={setTab} />
        </div>
        <ListFilterBar
          dateLabel="작성일 기준"
          searchPlaceholder="제목, 작성자 검색"
          draft={draft}
          applied={appliedDates}
          onDraft={setDraft}
          onSubmit={() => apply()}
          onReset={reset}
          restoreNotice={restoreNotice}
          chips={chips}
          summary={<p className="text-xs text-dim">{resultCountText(posts.data?.total ?? 0, qs.page, qs.pageSize, '건')}</p>}
        />
        {posts.loading ? (
          <Loading />
        ) : posts.error ? (
          <ErrorBox message={posts.error} onRetry={posts.reload} />
        ) : !posts.data || posts.data.items.length === 0 ? (
          <EmptyState
            title="선택한 작성일 기간과 검색어에 맞는 글이 없습니다."
            description="기간을 넓히거나 조건을 초기화해 보세요."
            action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates))} onReset={reset} />}
          />
        ) : (
          <>
            <PostTable posts={posts.data.items} showCategory />
            <Pagination
              page={qs.page}
              pageSize={qs.pageSize}
              total={posts.data.total}
              onPage={(p) => qs.update({ page: p }, true)}
              onPageSize={(size) => qs.update({ pageSize: size })}
            />
          </>
        )}
      </section>
    </div>
  )
}
