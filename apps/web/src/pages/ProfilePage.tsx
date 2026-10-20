import { useParams, useSearchParams } from 'react-router'
import { EmptyFilterActions, ListFilterBar, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../components/filters'
import { IconUser, IconUsers } from '../components/icons'
import { PostTable } from '../components/posts'
import { FollowMuteButtons, SocialUserList } from '../components/social'
import { TeamBadge } from '../components/teams'
import { Avatar, EmptyState, ErrorBox, Loading, PageHeader, Pagination, Pill } from '../components/ui'
import { buildQuery, useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { profilePath } from '../lib/boards'
import { formatDate, formatNumber } from '../lib/format'
import { dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../lib/list-query'
import { useQueryState } from '../lib/params'
import { useTitle } from '../lib/title'
import type { Paged, PostSummary, PublicProfile } from '../lib/types'

function rateText(rate: number, decided: number): string {
  if (decided === 0) return '-'
  return `${Math.round(rate * 100)}%`
}

export default function ProfilePage() {
  const nickname = useParams().nickname ?? ''
  const decoded = decodeURIComponent(nickname)
  const [params, setParams] = useSearchParams()
  const people = params.get('people')
  const { user } = useAuth()
  const { data, loading, error, reload } = useApi<PublicProfile>(
    decoded ? `/profiles/${encodeURIComponent(decoded)}` : null,
  )
  useTitle(data ? `${data.nickname} 프로필` : '프로필')

  if (loading) return <Loading />
  if (error || !data) return <ErrorBox message={error ?? '회원을 찾을 수 없습니다.'} onRetry={reload} />

  const primary = data.teams.find((team) => team.isPrimary) ?? data.teams[0] ?? null
  const isSelf = !!user && user.id === data.id
  const encoded = encodeURIComponent(data.nickname)

  if (people === 'followers' || people === 'following') {
    const isFollowers = people === 'followers'
    return (
      <div className="space-y-5">
        <PageHeader
          icon={<IconUsers size={20} />}
          title={isFollowers ? `${data.nickname}의 팔로워` : `${data.nickname}의 팔로잉`}
          backTo={profilePath(data.nickname)}
        />
        <SocialUserList
          path={`/profiles/${encoded}/${isFollowers ? 'followers' : 'following'}`}
          emptyTitle={isFollowers ? '아직 팔로워가 없습니다' : '아직 팔로우한 회원이 없습니다'}
          emptyDescription={
            isFollowers ? '다른 회원이 이 프로필을 팔로우하면 여기에 보입니다.' : '이 회원이 다른 회원을 팔로우하면 여기에 보입니다.'
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<IconUser size={20} />} title={data.nickname} subtitle={`${formatDate(data.createdAt)} 가입`} />

      <div className="flex items-start gap-4 rounded-xl border border-edge bg-card p-5">
        <Avatar name={data.nickname} uploadId={data.avatarUploadId} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
            {data.nickname}
            {primary && <TeamBadge team={primary} size="md" />}
          </p>
          {data.bio ? <p className="mt-2 text-sm leading-6 text-fg/90">{data.bio}</p> : <p className="mt-2 text-sm text-dim">아직 자기소개가 없습니다.</p>}
          {data.teams.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.teams.map((team) => (
                <TeamBadge key={team.id} team={team} />
              ))}
            </div>
          )}
          <p className="mt-3 text-sm text-dim">
            글 {formatNumber(data.postCount)} · 댓글 {formatNumber(data.commentCount)} · 받은 추천 {formatNumber(data.likeReceived)} · 예측 적중률{' '}
            {rateText(data.prediction.rate, data.prediction.decided)}
            {data.prediction.decided > 0 && (
              <span className="text-muted">
                {' '}
                ({data.prediction.hits}/{data.prediction.decided})
              </span>
            )}
          </p>
          <p className="mt-2 flex flex-wrap gap-3 text-sm">
            <button type="button" onClick={() => setParams({ people: 'followers' })} className="font-semibold hover:text-accent">
              팔로워 {formatNumber(data.followerCount)}
            </button>
            <button type="button" onClick={() => setParams({ people: 'following' })} className="font-semibold hover:text-accent">
              팔로잉 {formatNumber(data.followingCount)}
            </button>
          </p>
          {data.badges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.badges.map((badge) => (
                <Pill key={badge.id} tone="gold">
                  {badge.label}
                </Pill>
              ))}
            </div>
          )}
          <div className="mt-4">
            <FollowMuteButtons
              nickname={data.nickname}
              followed={data.followed}
              muted={data.muted}
              isSelf={isSelf}
              onChanged={reload}
            />
          </div>
        </div>
      </div>

      <ProfilePosts authorId={data.id} />
    </div>
  )
}

function ProfilePosts({ authorId }: { authorId: number }) {
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, 'all')
  const { data, loading, error, reload } = useApi<Paged<PostSummary>>(
    `/posts${buildQuery({
      authorId,
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

  return (
    <section>
      <h2 className="mb-3 font-bold">작성 글</h2>
      <ListFilterBar
        dateLabel="작성일 기준"
        searchPlaceholder="제목 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        chips={chips}
        summary={<p className="text-xs text-dim">{resultCountText(data?.total ?? 0, qs.page, qs.pageSize, '건')}</p>}
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<IconUser size={20} />}
          title="선택한 작성일 기간과 검색어에 맞는 글이 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates))} onReset={reset} />}
        />
      ) : (
        <>
          <PostTable posts={data.items} showCategory />
          <Pagination
            page={qs.page}
            pageSize={qs.pageSize}
            total={data.total}
            onPage={(p) => qs.update({ page: p }, true)}
            onPageSize={(size) => qs.update({ pageSize: size })}
          />
        </>
      )}
    </section>
  )
}
