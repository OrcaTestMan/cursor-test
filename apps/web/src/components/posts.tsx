import { Link } from 'react-router'
import { CATEGORY_LABELS, formatShort } from '../lib/format'
import { tdCls, thCls, trCls } from '../lib/styles'
import type { PostSummary } from '../lib/types'
import { ContentStatusPill, Pill } from './ui'

export function PostTable({
  posts,
  showCategory,
  showStatus,
}: {
  posts: PostSummary[]
  showCategory?: boolean
  showStatus?: boolean
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-edge bg-card">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b border-edge">
          <tr>
            <th className={`${thCls} w-16`}>번호</th>
            {showCategory && <th className={`${thCls} w-24`}>분류</th>}
            <th className={thCls}>제목</th>
            <th className={`${thCls} w-28`}>작성자</th>
            {showStatus && <th className={`${thCls} w-20`}>상태</th>}
            <th className={`${thCls} w-24`}>작성일</th>
            <th className={`${thCls} w-16 text-right`}>조회</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post.id} className={trCls}>
              <td className={`${tdCls} text-muted`}>#{post.id}</td>
              {showCategory && (
                <td className={tdCls}>
                  <CategoryPill category={post.category} />
                </td>
              )}
              <td className={`${tdCls} max-w-0 w-full`}>
                <Link to={`/posts/${post.id}`} className="flex min-w-0 items-center gap-1.5 hover:text-accent">
                  <span className="truncate font-medium">{post.title}</span>
                  {post.commentCount > 0 && (
                    <span className="shrink-0 text-xs font-semibold text-accent">[{post.commentCount}]</span>
                  )}
                </Link>
              </td>
              <td className={`${tdCls} text-dim`}>{post.author.nickname}</td>
              {showStatus && (
                <td className={tdCls}>
                  <ContentStatusPill status={post.status} />
                </td>
              )}
              <td className={`${tdCls} text-dim tabular-nums`}>{formatShort(post.createdAt)}</td>
              <td className={`${tdCls} text-right text-dim tabular-nums`}>{post.views.toLocaleString('ko-KR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CategoryPill({ category }: { category: PostSummary['category'] }) {
  const tone = category === 'notice' ? 'gold' : category === 'match' ? 'blue' : 'gray'
  return <Pill tone={tone}>{CATEGORY_LABELS[category]}</Pill>
}

export function PostLine({ post }: { post: PostSummary }) {
  return (
    <Link
      to={`/posts/${post.id}`}
      className="flex items-center gap-3 border-b border-edge-soft px-4 py-2.5 last:border-b-0 hover:bg-card-hover"
    >
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate">{post.title}</span>
        {post.commentCount > 0 && <span className="shrink-0 text-xs font-semibold text-accent">[{post.commentCount}]</span>}
      </span>
      <span className="hidden shrink-0 text-xs text-dim sm:inline">{post.author.nickname}</span>
      <span className="shrink-0 text-xs text-muted tabular-nums">{formatShort(post.createdAt)}</span>
    </Link>
  )
}
