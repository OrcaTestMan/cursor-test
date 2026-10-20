import { useEffect, useState } from 'react'
import { EmptyFilterActions, ListFilterBar, OptionButtons, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../components/filters'
import { IconFire } from '../components/icons'
import { PostTable } from '../components/posts'
import { EmptyState, ErrorBox, Loading, PageHeader, Pagination } from '../components/ui'
import { buildQuery, useApi } from '../lib/api'
import { CATEGORY_LABELS, isCategory } from '../lib/format'
import { applyQuickRange, dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../lib/list-query'
import { useQueryState } from '../lib/params'
import { useSettings } from '../lib/settings'
import { useTitle } from '../lib/title'
import type { Category, Paged, PostSummary } from '../lib/types'

type Extra = { category: Category | '' }

const EMPTY_EXTRA: Extra = { category: '' }

function extraFromParams(get: (key: string) => string): Extra {
  const categoryParam = get('category')
  return { category: isCategory(categoryParam) && (categoryParam === 'free' || categoryParam === 'match') ? categoryParam : '' }
}

export default function BestPage() {
  useTitle('인기글')
  const { settings } = useSettings()
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs)
  const appliedExtra = extraFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const { data, loading, error, reload } = useApi<Paged<PostSummary>>(
    `/posts${buildQuery({
      best: 'true',
      category: appliedExtra.category || null,
      ...dateFilterQuery(appliedDates),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )

  const apply = (dates = draft, nextExtra = extra) => {
    qs.update({ ...serializeDateFilter(dates), category: nextExtra.category || null })
  }
  const reset = () => {
    const dates = emptyDateFilter()
    setDraft(dates)
    setExtra(EMPTY_EXTRA)
    qs.update({ ...serializeDateFilter(dates), category: null }, { replace: true })
  }
  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.category) {
    chips.push({
      key: 'category',
      label: `게시판: ${CATEGORY_LABELS[appliedExtra.category]}`,
      onRemove: () => apply(appliedDates, { category: '' }),
    })
  }

  const total = data?.total ?? 0

  return (
    <div>
      <PageHeader icon={<IconFire size={20} />} title="인기글" subtitle={`추천 ${settings.bestThreshold}개 이상 받은 글을 모았습니다.`} />
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
        presets={[
          { id: 'today', label: '오늘' },
          { id: 'd7', label: '최근 7일' },
          { id: 'all', label: '전체기간' },
        ]}
        onPreset={(id) => {
          const dates = applyQuickRange(id === 'd7' ? 'd7' : id === 'all' ? 'all' : 'today', draft.q)
          setDraft(dates)
          apply(dates, extra)
        }}
        basic={
          <OptionButtons
            label="게시판"
            value={extra.category}
            onChange={(value) => setExtra({ category: value === 'free' || value === 'match' ? value : '' })}
            items={[
              { value: '', label: '전체' },
              { value: 'free', label: CATEGORY_LABELS.free },
              { value: 'match', label: CATEGORY_LABELS.match },
            ]}
          />
        }
        summary={<p className="text-xs text-dim">{resultCountText(total, qs.page, qs.pageSize, '건')}</p>}
      />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<IconFire size={20} />}
          title="선택한 작성일 기간과 검색어에 맞는 인기글이 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates), appliedExtra)} onReset={reset} />}
        />
      ) : (
        <>
          <PostTable posts={data.items} showCategory={!appliedExtra.category} />
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
