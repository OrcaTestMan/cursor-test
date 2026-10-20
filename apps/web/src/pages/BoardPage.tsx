import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { EmptyFilterActions, ListFilterBar, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../components/filters'
import { IconBall, IconChat, IconMegaphone, IconNews, IconSmile, IconTicket } from '../components/icons'
import { PostTable } from '../components/posts'
import { EmptyState, ErrorBox, Loading, PageHeader, Pagination, SegmentedTabs, type TabItem } from '../components/ui'
import { buildQuery, useApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { BOARD_SUBTITLES, tagsForCategory } from '../lib/boards'
import { saveLastWriteBoard } from '../lib/prefs'
import { CATEGORY_LABELS, isCategory } from '../lib/format'
import { dateFilterQuery, emptyDateFilter, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../lib/list-query'
import { useQueryState } from '../lib/params'
import { useSettings } from '../lib/settings'
import { btnPrimary, btnSecondary, btnSmSecondary, chipCls } from '../lib/styles'
import { useTitle } from '../lib/title'
import type { Category, Paged, PostSummary } from '../lib/types'
import NotFoundPage from './NotFoundPage'

const ICONS: Record<Category, typeof IconChat> = {
  notice: IconMegaphone,
  free: IconChat,
  match: IconBall,
  humor: IconSmile,
  review: IconTicket,
  news: IconNews,
}

type ListTab = 'all' | 'best'
const LIST_TABS: TabItem<ListTab>[] = [
  { value: 'all', label: '전체' },
  { value: 'best', label: '인기글' },
]

export default function BoardPage() {
  const { category } = useParams()
  if (!isCategory(category)) return <NotFoundPage />
  return <Board key={category} category={category} />
}

function Board({ category }: { category: Category }) {
  const { user } = useAuth()
  const { settings } = useSettings()
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, category === 'notice' ? 'all' : 'today')
  const best = qs.get('best') === 'true'
  const tag = qs.get('tag')
  const authorId = qs.get('authorId')

  useTitle(CATEGORY_LABELS[category])
  useEffect(() => {
    saveLastWriteBoard(category)
  }, [category])

  const tags = tagsForCategory(settings, category)
  const { data, loading, error, reload } = useApi<Paged<PostSummary>>(
    `/posts${buildQuery({
      category,
      best: best ? 'true' : null,
      tag: tag || null,
      authorId: authorId || null,
      ...dateFilterQuery(appliedDates),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )

  const canWrite = category !== 'notice' || user?.role === 'admin'
  const Icon = ICONS[category]

  const apply = (dates = draft) => {
    qs.update({ ...serializeDateFilter(dates) })
  }
  const reset = () => {
    const dates = category === 'notice' ? { ...emptyDateFilter(), range: 'all' as const } : emptyDateFilter()
    setDraft(dates)
    qs.update({ ...serializeDateFilter(dates), tag: null, best: null, authorId: null }, { replace: true })
  }

  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates)))]
  if (best) {
    chips.push({ key: 'best', label: '인기글', onRemove: () => qs.update({ best: null }) })
  }
  if (tag) {
    chips.push({ key: 'tag', label: `말머리: ${tag}`, onRemove: () => qs.update({ tag: null }) })
  }
  if (authorId) {
    chips.push({ key: 'authorId', label: `작성자: #${authorId}`, onRemove: () => qs.update({ authorId: null }) })
  }

  const searchLink = (() => {
    const params = new URLSearchParams()
    const serialized = serializeDateFilter(appliedDates)
    for (const [key, value] of Object.entries(serialized)) {
      if (value) params.set(key, value)
    }
    return `/search?${params.toString()}`
  })()

  const writeButton = canWrite ? (
    <Link to={`/write?category=${category}`} className={btnPrimary}>
      글쓰기
    </Link>
  ) : null
  const total = data?.total ?? 0

  return (
    <div>
      <PageHeader icon={<Icon size={20} />} title={CATEGORY_LABELS[category]} subtitle={BOARD_SUBTITLES[category]} action={writeButton} />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SegmentedTabs items={LIST_TABS} value={best ? 'best' : 'all'} onChange={(v) => qs.update({ best: v === 'best' ? 'true' : null })} />
        {best && <span className="text-xs text-dim">추천 {settings.bestThreshold}개 이상 받은 글</span>}
        <button type="button" onClick={() => reload()} className={`${btnSecondary} ml-auto h-8 px-3 text-xs`}>
          새로고침
        </button>
      </div>

      {tags.length > 0 && (
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="말머리">
          <button type="button" className={chipCls(!tag)} onClick={() => qs.update({ tag: null })}>
            전체
          </button>
          {tags.map((t) => (
            <button key={t} type="button" className={chipCls(tag === t)} onClick={() => qs.update({ tag: t })}>
              {t}
            </button>
          ))}
        </div>
      )}

      <ListFilterBar
        dateLabel="작성일 기준"
        searchPlaceholder="제목, 내용, 작성자 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        chips={chips}
        extraActions={
          <Link to={searchLink} className={`${btnSmSecondary} hidden sm:inline-flex`}>
            전체 게시판에서 검색
          </Link>
        }
        summary={<p className="text-xs text-dim">{resultCountText(total, qs.page, qs.pageSize, '건')}</p>}
      />

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<Icon size={20} />}
          title="선택한 작성일 기간과 검색어에 맞는 글이 없습니다."
          description="기간을 넓히거나 조건을 초기화해 보세요."
          action={<EmptyFilterActions onAllPeriod={() => apply(withAllPeriod(appliedDates))} onReset={reset} />}
        />
      ) : (
        <>
          <PostTable posts={data.items} />
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
