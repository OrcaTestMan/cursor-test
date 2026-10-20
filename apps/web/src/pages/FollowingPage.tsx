import { Link } from 'react-router'
import { EmptyFilterActions, ListFilterBar, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../components/filters'
import { IconUsers } from '../components/icons'
import { PostTable } from '../components/posts'
import { EmptyState, ErrorBox, Loading, PageHeader, Pagination } from '../components/ui'
import { buildQuery, useApi } from '../lib/api'
import { dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../lib/list-query'
import { useQueryState } from '../lib/params'
import { btnPrimary } from '../lib/styles'
import { useTitle } from '../lib/title'
import type { Paged, PostSummary } from '../lib/types'

export default function FollowingPage() {
  useTitle('팔로우한 글')
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs)
  const { data, loading, error, reload } = useApi<Paged<PostSummary>>(
    `/posts${buildQuery({
      followed: 'true',
      ...dateFilterQuery(appliedDates),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )

  const apply = (dates = draft) => qs.update({ ...serializeDateFilter(dates) })
  const reset = () => {
    const dates = emptyDateFilter()
    setDraft(dates)
    qs.update({ ...serializeDateFilter(dates) }, { replace: true })
  }
  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates)))]
  const total = data?.total ?? 0

  return (
    <div>
      <PageHeader icon={<IconUsers size={20} />} title="팔로우한 글" subtitle="팔로우한 회원이 쓴 공개 글입니다." />
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
        summary={<p className="text-xs text-dim">{resultCountText(total, qs.page, qs.pageSize, '건')}</p>}
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<IconUsers size={20} />}
          title="선택한 작성일 기간과 검색어에 맞는 글이 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={
            <div className="flex flex-wrap gap-2">
              <EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates))} onReset={reset} />
              <Link to="/search" className={btnPrimary}>
                회원·글 검색
              </Link>
            </div>
          }
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
    </div>
  )
}
