import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { IconFile, IconSearch } from '../../components/icons'
import { CategoryPill } from '../../components/posts'
import { ContentStatusPill, EmptyState, ErrorBox, FormError, Loading, PageHeader, Pagination, SegmentedTabs, type TabItem } from '../../components/ui'
import { useAdminContext } from '../../lib/admin'
import { apiFetch, buildQuery, errorMessage, useApi } from '../../lib/api'
import { CATEGORY_LABELS, formatShort, isCategory } from '../../lib/format'
import { useQueryState } from '../../lib/params'
import { btnSecondary, btnSmDanger, btnSmGold, btnSmPrimary, inputCls, selectCls, tdCls, thCls, trCls } from '../../lib/styles'
import type { AdminComment, Category, ContentStatus, Paged, PostSummary } from '../../lib/types'

type Kind = 'posts' | 'comments'
type StatusTab = ContentStatus | 'all'

const KIND_TABS: TabItem<Kind>[] = [
  { value: 'posts', label: '게시글' },
  { value: 'comments', label: '댓글' },
]

const STATUS_TABS: TabItem<StatusTab>[] = [
  { value: 'pending', label: '승인 대기' },
  { value: 'visible', label: '노출' },
  { value: 'hidden', label: '숨김' },
  { value: 'all', label: '전체' },
]

function toStatusTab(value: string): StatusTab {
  return value === 'visible' || value === 'hidden' || value === 'all' ? value : 'pending'
}

export default function AdminPostsPage() {
  const qs = useQueryState()
  const kind: Kind = qs.get('tab') === 'comments' ? 'comments' : 'posts'
  const status = toStatusTab(qs.get('status'))
  const categoryParam = qs.get('category')
  const category: Category | '' = isCategory(categoryParam) ? categoryParam : ''
  const q = qs.get('q')
  const [search, setSearch] = useState(q)

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    qs.update({ q: search.trim() || null })
  }

  return (
    <div>
      <PageHeader icon={<IconFile size={20} />} title="회원게시글 관리" subtitle="회원이 작성한 글/댓글을 확인하고 노출 여부를 정합니다." />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SegmentedTabs
          items={KIND_TABS}
          value={kind}
          onChange={(v) => {
            setSearch('')
            qs.update({ tab: v === 'posts' ? null : v, q: null, category: null })
          }}
        />
        <SegmentedTabs items={STATUS_TABS} value={status} onChange={(v) => qs.update({ status: v === 'pending' ? null : v })} />
      </div>
      <form onSubmit={onSearch} className="mb-4 flex flex-wrap gap-2">
        {kind === 'posts' && (
          <select aria-label="게시판" value={category} onChange={(e) => qs.update({ category: e.target.value || null })} className={selectCls}>
            <option value="">전체 게시판</option>
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        )}
        <div className="relative w-64">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={kind === 'posts' ? '제목 검색' : '내용 검색'}
            aria-label="검색어"
            className={`${inputCls} pl-9`}
          />
        </div>
        <button type="submit" className={btnSecondary}>
          검색
        </button>
      </form>
      {kind === 'posts' ? (
        <PostsTable status={status} category={category} q={q} />
      ) : (
        <CommentsTable status={status} q={q} />
      )}
    </div>
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

function PostsTable({ status, category, q }: { status: StatusTab; category: Category | ''; q: string }) {
  const qs = useQueryState()
  const list = useApi<Paged<PostSummary>>(
    `/admin/posts${buildQuery({ status: status === 'all' ? null : status, category: category || null, q: q || null, page: qs.page, pageSize: qs.pageSize })}`,
  )
  const { busyId, error, run } = useRowActions(list.reload)

  const onStatus = (id: number, next: ContentStatus) =>
    void run(id, () => apiFetch<PostSummary>(`/admin/posts/${id}`, { method: 'PATCH', body: { status: next } }))
  const onDelete = (id: number) =>
    void run(id, () => apiFetch<void>(`/admin/posts/${id}`, { method: 'DELETE' }), '이 글을 삭제할까요? 댓글도 함께 사라질 수 있습니다.')

  if (list.loading) return <Loading />
  if (list.error) return <ErrorBox message={list.error} onRetry={list.reload} />
  if (!list.data || list.data.items.length === 0)
    return <EmptyState icon={<IconFile size={20} />} title="해당하는 글이 없습니다" description="다른 상태나 검색어를 선택해 보세요." />

  return (
    <>
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
              <th className={`${thCls} text-right`}>조회</th>
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
                <td className={`${tdCls} text-right tabular-nums`}>{p.views}</td>
                <td className={tdCls}>
                  <ContentStatusPill status={p.status} />
                </td>
                <td className={`${tdCls} text-dim tabular-nums`}>{formatShort(p.createdAt)}</td>
                <td className={`${tdCls} text-right`}>
                  <RowActions id={p.id} status={p.status} busy={busyId === p.id} onStatus={onStatus} onDelete={onDelete} />
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
  )
}

function CommentsTable({ status, q }: { status: StatusTab; q: string }) {
  const qs = useQueryState()
  const list = useApi<Paged<AdminComment>>(
    `/admin/comments${buildQuery({ status: status === 'all' ? null : status, q: q || null, page: qs.page, pageSize: qs.pageSize })}`,
  )
  const { busyId, error, run } = useRowActions(list.reload)

  const onStatus = (id: number, next: ContentStatus) =>
    void run(id, () => apiFetch<unknown>(`/admin/comments/${id}`, { method: 'PATCH', body: { status: next } }))
  const onDelete = (id: number) =>
    void run(id, () => apiFetch<void>(`/admin/comments/${id}`, { method: 'DELETE' }), '이 댓글을 삭제할까요?')

  if (list.loading) return <Loading />
  if (list.error) return <ErrorBox message={list.error} onRetry={list.reload} />
  if (!list.data || list.data.items.length === 0)
    return <EmptyState icon={<IconFile size={20} />} title="해당하는 댓글이 없습니다" description="다른 상태나 검색어를 선택해 보세요." />

  return (
    <>
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
        onPage={(p) => qs.update({ page: p })}
        onPageSize={(size) => qs.update({ pageSize: size })}
      />
    </>
  )
}
