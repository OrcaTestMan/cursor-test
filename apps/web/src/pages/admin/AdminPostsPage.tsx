import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { EmptyFilterActions, FilterChoice, ListFilterBar, OptionButtons, dateRangeChip, useRestoredDateFilter, type FilterChip } from '../../components/filters'
import { IconFile } from '../../components/icons'
import { CategoryPill } from '../../components/posts'
import { ContentStatusPill, EmptyState, ErrorBox, Field, FormError, Loading, PageHeader, Pagination, Pill, SegmentedTabs, type TabItem } from '../../components/ui'
import { useAdminContext } from '../../lib/admin'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { CATEGORY_LABELS, formatShort, isCategory } from '../../lib/format'
import { dateFilterQuery, emptyDateFilter, optionalIntError, parseDateFilter, resultCountText, serializeDateFilter, withAllPeriod, withToday } from '../../lib/list-query'
import { useQueryState } from '../../lib/params'
import { btnSmDanger, btnSmGold, btnSmPrimary, btnSmSecondary, inputCls, tdCls, thCls, trCls } from '../../lib/styles'
import type { AdminComment, AdminPostSummary, Category, ContentStatus, Paged } from '../../lib/types'

type Kind = 'posts' | 'comments'
type StatusTab = ContentStatus | 'all'

const KIND_TABS: TabItem<Kind>[] = [
  { value: 'posts', label: '게시글' },
  { value: 'comments', label: '댓글' },
]

const STATUS_ITEMS: { value: StatusTab; label: string }[] = [
  { value: 'pending', label: '승인 대기' },
  { value: 'visible', label: '노출' },
  { value: 'hidden', label: '숨김' },
  { value: 'all', label: '전체 상태' },
]

function toStatusTab(value: string): StatusTab {
  return value === 'visible' || value === 'hidden' || value === 'all' ? value : 'pending'
}

function statusLabel(status: StatusTab) {
  return STATUS_ITEMS.find((item) => item.value === status)?.label ?? '승인 대기'
}

type PostExtra = {
  status: StatusTab
  category: Category | ''
  authorId: string
  hasImage: '' | 'true' | 'false'
  minLikes: string
  bestExcluded: '' | 'true' | 'false'
  sort: string
}

type CommentExtra = {
  status: StatusTab
  authorId: string
  postId: string
  reply: '' | 'true' | 'false'
  deleted: '' | 'true' | 'false'
}

const EMPTY_POST: PostExtra = {
  status: 'pending',
  category: '',
  authorId: '',
  hasImage: '',
  minLikes: '',
  bestExcluded: '',
  sort: 'created_desc',
}

const EMPTY_COMMENT: CommentExtra = {
  status: 'pending',
  authorId: '',
  postId: '',
  reply: '',
  deleted: '',
}

function postFromParams(get: (key: string) => string): PostExtra {
  const categoryParam = get('category')
  const hasImage = get('hasImage')
  const bestExcluded = get('bestExcluded')
  return {
    status: toStatusTab(get('status')),
    category: isCategory(categoryParam) ? categoryParam : '',
    authorId: get('authorId'),
    hasImage: hasImage === 'true' || hasImage === 'false' ? hasImage : '',
    minLikes: get('minLikes'),
    bestExcluded: bestExcluded === 'true' || bestExcluded === 'false' ? bestExcluded : '',
    sort: get('sort') || 'created_desc',
  }
}

function commentFromParams(get: (key: string) => string): CommentExtra {
  const reply = get('reply')
  const deleted = get('deleted')
  return {
    status: toStatusTab(get('status')),
    authorId: get('authorId'),
    postId: get('postId'),
    reply: reply === 'true' || reply === 'false' ? reply : '',
    deleted: deleted === 'true' || deleted === 'false' ? deleted : '',
  }
}

function postQuery(extra: PostExtra): Record<string, string | null> {
  return {
    status: extra.status === 'pending' ? null : extra.status,
    category: extra.category || null,
    authorId: extra.authorId || null,
    hasImage: extra.hasImage || null,
    minLikes: extra.minLikes || null,
    bestExcluded: extra.bestExcluded || null,
    sort: extra.sort === 'created_desc' ? null : extra.sort,
    postId: null,
    reply: null,
    deleted: null,
  }
}

function commentQuery(extra: CommentExtra): Record<string, string | null> {
  return {
    status: extra.status === 'pending' ? null : extra.status,
    authorId: extra.authorId || null,
    postId: extra.postId || null,
    reply: extra.reply || null,
    deleted: extra.deleted || null,
    category: null,
    hasImage: null,
    minLikes: null,
    bestExcluded: null,
    sort: null,
  }
}

function postAdvancedCount(extra: PostExtra) {
  return [extra.authorId, extra.hasImage, extra.minLikes, extra.bestExcluded].filter(Boolean).length
}

function commentAdvancedCount(extra: CommentExtra) {
  return [extra.authorId, extra.postId, extra.reply, extra.deleted].filter(Boolean).length
}

export default function AdminPostsPage() {
  const qs = useQueryState()
  const kind: Kind = qs.get('tab') === 'comments' ? 'comments' : 'posts'
  return (
    <div>
      <PageHeader icon={<IconFile size={20} />} title="회원게시글 관리" subtitle="회원이 작성한 글/댓글을 확인하고 노출 여부를 정합니다." />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SegmentedTabs
          items={KIND_TABS}
          value={kind}
          onChange={(v) => {
            qs.update(
              {
                tab: v === 'posts' ? null : v,
                ...serializeDateFilter(emptyDateFilter()),
                ...postQuery(EMPTY_POST),
                ...commentQuery(EMPTY_COMMENT),
                status: null,
              },
              { replace: true },
            )
          }}
        />
      </div>
      {kind === 'posts' ? <PostsPanel /> : <CommentsPanel />}
    </div>
  )
}

function PostsPanel() {
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs, 'today', { keys: ['minLikes'] })
  const appliedExtra = postFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)
  const [filterAlert, setFilterAlert] = useState<string | null>(null)

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const apply = (dates = draft, nextExtra = extra) => {
    setFilterAlert(null)
    qs.update({ ...serializeDateFilter(dates), ...postQuery(nextExtra) })
  }
  const submit = () => {
    const message = optionalIntError(extra.minLikes, '추천 수')
    if (message) {
      setFilterAlert(message)
      return
    }
    apply()
  }
  const reset = () => {
    const dates = emptyDateFilter()
    setDraft(dates)
    setExtra(EMPTY_POST)
    qs.update({ ...serializeDateFilter(dates), ...postQuery(EMPTY_POST) }, { replace: true })
  }

  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.status !== 'pending') {
    chips.push({
      key: 'status',
      label: `상태: ${statusLabel(appliedExtra.status)}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, status: 'pending' }),
    })
  }
  if (appliedExtra.category) {
    chips.push({
      key: 'category',
      label: `게시판: ${CATEGORY_LABELS[appliedExtra.category]}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, category: '' }),
    })
  }
  if (appliedExtra.authorId) {
    chips.push({
      key: 'authorId',
      label: `작성자: #${appliedExtra.authorId}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, authorId: '' }),
    })
  }
  if (appliedExtra.hasImage) {
    chips.push({
      key: 'hasImage',
      label: appliedExtra.hasImage === 'true' ? '이미지 있음' : '이미지 없음',
      onRemove: () => apply(appliedDates, { ...appliedExtra, hasImage: '' }),
    })
  }
  if (appliedExtra.minLikes) {
    chips.push({
      key: 'minLikes',
      label: `추천 ${appliedExtra.minLikes}개 이상`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, minLikes: '' }),
    })
  }
  if (appliedExtra.bestExcluded) {
    chips.push({
      key: 'bestExcluded',
      label: appliedExtra.bestExcluded === 'true' ? '인기글 제외됨' : '인기글 제외 아님',
      onRemove: () => apply(appliedDates, { ...appliedExtra, bestExcluded: '' }),
    })
  }

  return (
    <>
      <ListFilterBar
        dateLabel="작성일 기준"
        searchPlaceholder="제목, 작성자 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={submit}
        onReset={reset}
        restoreNotice={restoreNotice}
        alert={filterAlert}
        advancedCount={postAdvancedCount(appliedExtra)}
        chips={chips}
        basic={
          <>
            <OptionButtons label="상태" value={extra.status} onChange={(value) => setExtra({ ...extra, status: value || 'pending' })} items={STATUS_ITEMS} />
            <OptionButtons
              label="게시판"
              value={extra.category}
              onChange={(value) => setExtra({ ...extra, category: value })}
              items={[{ value: '', label: '전체 게시판' }, ...(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))]}
            />
            <FilterChoice
              label="정렬"
              value={extra.sort}
              onChange={(value) => setExtra({ ...extra, sort: value || 'created_desc' })}
              items={[
                { value: 'created_desc', label: '작성 최신순' },
                { value: 'created_asc', label: '작성 오래된 순' },
                { value: 'likes_desc', label: '추천순' },
                { value: 'comments_desc', label: '댓글순' },
              ]}
            />
          </>
        }
        advanced={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="작성자 회원번호">
              <input value={extra.authorId} onChange={(e) => setExtra({ ...extra, authorId: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 12" />
            </Field>
            <Field label="이미지">
              <FilterChoice
                label="이미지"
                value={extra.hasImage}
                onChange={(value) => setExtra({ ...extra, hasImage: value })}
                items={[
                  { value: '', label: '제한 없음' },
                  { value: 'true', label: '있음' },
                  { value: 'false', label: '없음' },
                ]}
              />
            </Field>
            <Field label="추천 수 이상">
              <input value={extra.minLikes} onChange={(e) => setExtra({ ...extra, minLikes: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 5" />
            </Field>
            <Field label="인기글 제외">
              <FilterChoice
                label="인기글 제외"
                value={extra.bestExcluded}
                onChange={(value) => setExtra({ ...extra, bestExcluded: value })}
                items={[
                  { value: '', label: '제한 없음' },
                  { value: 'true', label: '제외됨' },
                  { value: 'false', label: '제외 아님' },
                ]}
              />
            </Field>
          </div>
        }
      />
      <PostsTable applyAll={() => apply(withAllPeriod(appliedDates), appliedExtra)} onReset={reset} />
    </>
  )
}

function CommentsPanel() {
  const qs = useQueryState()
  const { applied: appliedDates, draft, setDraft, restoreNotice } = useRestoredDateFilter(qs)
  const appliedExtra = commentFromParams(qs.get)
  const [extra, setExtra] = useState(appliedExtra)

  useEffect(() => {
    setExtra(appliedExtra)
  }, [qs.params.toString()])

  const apply = (dates = draft, nextExtra = extra) => {
    qs.update({ ...serializeDateFilter(dates), ...commentQuery(nextExtra) })
  }
  const reset = () => {
    const dates = emptyDateFilter()
    setDraft(dates)
    setExtra(EMPTY_COMMENT)
    qs.update({ ...serializeDateFilter(dates), ...commentQuery(EMPTY_COMMENT) }, { replace: true })
  }

  const chips: FilterChip[] = [dateRangeChip(appliedDates, () => apply(withToday(appliedDates), appliedExtra))]
  if (appliedExtra.status !== 'pending') {
    chips.push({
      key: 'status',
      label: `상태: ${statusLabel(appliedExtra.status)}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, status: 'pending' }),
    })
  }
  if (appliedExtra.authorId) {
    chips.push({
      key: 'authorId',
      label: `작성자: #${appliedExtra.authorId}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, authorId: '' }),
    })
  }
  if (appliedExtra.postId) {
    chips.push({
      key: 'postId',
      label: `글: #${appliedExtra.postId}`,
      onRemove: () => apply(appliedDates, { ...appliedExtra, postId: '' }),
    })
  }
  if (appliedExtra.reply) {
    chips.push({
      key: 'reply',
      label: appliedExtra.reply === 'true' ? '답글만' : '원댓글만',
      onRemove: () => apply(appliedDates, { ...appliedExtra, reply: '' }),
    })
  }
  if (appliedExtra.deleted) {
    chips.push({
      key: 'deleted',
      label: appliedExtra.deleted === 'true' ? '삭제됨' : '삭제 아님',
      onRemove: () => apply(appliedDates, { ...appliedExtra, deleted: '' }),
    })
  }

  return (
    <>
      <ListFilterBar
        dateLabel="작성일 기준"
        searchPlaceholder="댓글 내용, 작성자 검색"
        draft={draft}
        applied={appliedDates}
        onDraft={setDraft}
        onSubmit={() => apply()}
        onReset={reset}
        restoreNotice={restoreNotice}
        advancedCount={commentAdvancedCount(appliedExtra)}
        chips={chips}
        basic={
          <OptionButtons label="상태" value={extra.status} onChange={(value) => setExtra({ ...extra, status: value || 'pending' })} items={STATUS_ITEMS} />
        }
        advanced={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="작성자 회원번호">
              <input value={extra.authorId} onChange={(e) => setExtra({ ...extra, authorId: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 12" />
            </Field>
            <Field label="글 번호">
              <input value={extra.postId} onChange={(e) => setExtra({ ...extra, postId: e.target.value })} inputMode="numeric" className={inputCls} placeholder="예: 100" />
            </Field>
            <Field label="답글">
              <FilterChoice
                label="답글"
                value={extra.reply}
                onChange={(value) => setExtra({ ...extra, reply: value })}
                items={[
                  { value: '', label: '제한 없음' },
                  { value: 'true', label: '답글만' },
                  { value: 'false', label: '원댓글만' },
                ]}
              />
            </Field>
            <Field label="삭제">
              <FilterChoice
                label="삭제"
                value={extra.deleted}
                onChange={(value) => setExtra({ ...extra, deleted: value })}
                items={[
                  { value: '', label: '제한 없음' },
                  { value: 'true', label: '삭제됨' },
                  { value: 'false', label: '삭제 아님' },
                ]}
              />
            </Field>
          </div>
        }
      />
      <CommentsTable applyAll={() => apply(withAllPeriod(appliedDates), appliedExtra)} onReset={reset} />
    </>
  )
}

function useRowActions(reload: () => void) {
  const { refreshCounts } = useAdminContext()
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (id: number, action: () => Promise<unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return
    setBusyId(id)
    setError(null)
    try {
      await action()
      reload()
      refreshCounts()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return { busyId, error, run }
}

function RowActions({
  id,
  status,
  busy,
  onStatus,
  onDelete,
}: {
  id: number
  status: ContentStatus
  busy: boolean
  onStatus: (id: number, status: ContentStatus) => void
  onDelete: (id: number) => void
}) {
  return (
    <span className="inline-flex gap-1.5">
      <button type="button" disabled={busy || status === 'visible'} onClick={() => onStatus(id, 'visible')} className={btnSmPrimary}>
        노출
      </button>
      <button type="button" disabled={busy || status === 'hidden'} onClick={() => onStatus(id, 'hidden')} className={btnSmGold}>
        숨김
      </button>
      <button type="button" disabled={busy} onClick={() => onDelete(id)} className={btnSmDanger}>
        삭제
      </button>
    </span>
  )
}

function ReportCount({ count }: { count: number }) {
  return count > 0 ? <Pill tone="red">{count}</Pill> : <span className="text-muted">0</span>
}

function PostsTable({ applyAll, onReset }: { applyAll: () => void; onReset: () => void }) {
  const qs = useQueryState()
  const dates = parseDateFilter(qs.params)
  const extra = postFromParams(qs.get)
  const list = useApi<Paged<AdminPostSummary>>(
    `/admin/posts${buildQuery({
      ...dateFilterQuery(dates),
      ...postQuery(extra),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )
  const { busyId, error, run } = useRowActions(list.reload)

  const onStatus = (id: number, next: ContentStatus) =>
    void run(id, () => apiFetch<AdminPostSummary>(`/admin/posts/${id}`, { method: 'PATCH', body: { status: next } }))
  const onBest = (post: AdminPostSummary) =>
    void run(
      post.id,
      () => apiFetch<AdminPostSummary>(`/admin/posts/${post.id}`, { method: 'PATCH', body: { bestExcluded: !post.bestExcluded } }),
      post.bestExcluded ? undefined : '이 글을 인기글에서 제외할까요? 추천 수와 관계없이 인기글 목록에 나오지 않습니다.',
    )
  const onDelete = (id: number) =>
    void run(id, () => apiFetch<void>(`/admin/posts/${id}`, { method: 'DELETE' }), '이 글을 삭제할까요? 댓글도 함께 사라질 수 있습니다.')

  if (list.loading) return <Loading />
  if (list.error) return <ErrorBox message={list.error} onRetry={list.reload} />
  if (!list.data || list.data.items.length === 0) {
    return (
      <EmptyState
        icon={<IconFile size={20} />}
        title="선택한 작성일 기간과 검색어에 맞는 글이 없습니다."
        description="기간을 넓히거나 조건을 초기화해 보세요."
        action={<EmptyFilterActions onAllPeriod={applyAll} onReset={onReset} />}
      />
    )
  }

  return (
    <>
      <p className="-mt-2 mb-3 text-xs text-dim">{resultCountText(list.data.total, qs.page, qs.pageSize, '건')}</p>
      {error && (
        <div className="mb-3">
          <FormError message={error} />
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-edge bg-card">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="border-b border-edge">
            <tr>
              <th className={thCls}>ID</th>
              <th className={thCls}>분류</th>
              <th className={thCls}>제목</th>
              <th className={thCls}>작성자</th>
              <th className={`${thCls} text-right`}>댓글</th>
              <th className={`${thCls} text-right`}>추천</th>
              <th className={`${thCls} text-right`}>신고</th>
              <th className={thCls}>상태</th>
              <th className={thCls}>작성</th>
              <th className={`${thCls} text-right`}>관리</th>
            </tr>
          </thead>
          <tbody>
            {list.data.items.map((p) => (
              <tr key={p.id} className={trCls}>
                <td className={`${tdCls} text-muted`}>#{p.id}</td>
                <td className={tdCls}>
                  <CategoryPill category={p.category} />
                </td>
                <td className={`${tdCls} max-w-72`}>
                  <Link to={`/posts/${p.id}`} className="block truncate font-medium hover:text-accent">
                    {p.title}
                  </Link>
                </td>
                <td className={`${tdCls} text-dim`}>{p.author.nickname}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{p.commentCount}</td>
                <td className={`${tdCls} text-right tabular-nums`}>{p.likeCount}</td>
                <td className={`${tdCls} text-right`}>
                  <ReportCount count={p.reportCount} />
                </td>
                <td className={tdCls}>
                  <ContentStatusPill status={p.status} />
                </td>
                <td className={`${tdCls} text-dim tabular-nums`}>{formatShort(p.createdAt)}</td>
                <td className={`${tdCls} text-right`}>
                  <span className="inline-flex flex-wrap justify-end gap-1.5">
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => onBest(p)}
                      className={p.bestExcluded ? btnSmGold : btnSmSecondary}
                    >
                      {p.bestExcluded ? '인기글 제외됨' : '인기글 제외'}
                    </button>
                    <RowActions id={p.id} status={p.status} busy={busyId === p.id} onStatus={onStatus} onDelete={onDelete} />
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
        onPage={(p) => qs.update({ page: p }, true)}
        onPageSize={(size) => qs.update({ pageSize: size })}
      />
    </>
  )
}

function CommentsTable({ applyAll, onReset }: { applyAll: () => void; onReset: () => void }) {
  const qs = useQueryState()
  const dates = parseDateFilter(qs.params)
  const extra = commentFromParams(qs.get)
  const list = useApi<Paged<AdminComment>>(
    `/admin/comments${buildQuery({
      ...dateFilterQuery(dates),
      ...commentQuery(extra),
      page: qs.page,
      pageSize: qs.pageSize,
    })}`,
  )
  const { busyId, error, run } = useRowActions(list.reload)

  const onStatus = (id: number, next: ContentStatus) =>
    void run(id, () => apiFetch<unknown>(`/admin/comments/${id}`, { method: 'PATCH', body: { status: next } }))
  const onDelete = (id: number) =>
    void run(id, () => apiFetch<void>(`/admin/comments/${id}`, { method: 'DELETE' }), '이 댓글을 삭제할까요?')

  if (list.loading) return <Loading />
  if (list.error) return <ErrorBox message={list.error} onRetry={list.reload} />
  if (!list.data || list.data.items.length === 0) {
    return (
      <EmptyState
        icon={<IconFile size={20} />}
        title="선택한 작성일 기간과 검색어에 맞는 댓글이 없습니다."
        description="기간을 넓히거나 조건을 초기화해 보세요."
        action={<EmptyFilterActions onAllPeriod={applyAll} onReset={onReset} />}
      />
    )
  }

  return (
    <>
      <p className="-mt-2 mb-3 text-xs text-dim">{resultCountText(list.data.total, qs.page, qs.pageSize, '건')}</p>
      {error && (
        <div className="mb-3">
          <FormError message={error} />
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-edge bg-card">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="border-b border-edge">
            <tr>
              <th className={thCls}>ID</th>
              <th className={thCls}>내용</th>
              <th className={thCls}>글</th>
              <th className={thCls}>작성자</th>
              <th className={`${thCls} text-right`}>신고</th>
              <th className={thCls}>상태</th>
              <th className={thCls}>작성</th>
              <th className={`${thCls} text-right`}>관리</th>
            </tr>
          </thead>
          <tbody>
            {list.data.items.map((c) => (
              <tr key={c.id} className={trCls}>
                <td className={`${tdCls} text-muted`}>#{c.id}</td>
                <td className={`${tdCls} max-w-80 truncate`} title={c.body}>
                  {c.body}
                </td>
                <td className={`${tdCls} max-w-56`}>
                  <Link to={`/posts/${c.postId}`} className="block truncate text-dim hover:text-accent">
                    {c.postTitle}
                  </Link>
                </td>
                <td className={`${tdCls} text-dim`}>{c.author.nickname}</td>
                <td className={`${tdCls} text-right`}>
                  <ReportCount count={c.reportCount} />
                </td>
                <td className={tdCls}>
                  <ContentStatusPill status={c.status} />
                </td>
                <td className={`${tdCls} text-dim tabular-nums`}>{formatShort(c.createdAt)}</td>
                <td className={`${tdCls} text-right`}>
                  <RowActions id={c.id} status={c.status} busy={busyId === c.id} onStatus={onStatus} onDelete={onDelete} />
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
        onPage={(p) => qs.update({ page: p }, true)}
        onPageSize={(size) => qs.update({ pageSize: size })}
      />
    </>
  )
}
