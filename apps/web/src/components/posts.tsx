import { Link } from 'react-router'
import { profilePath } from '../lib/boards'
import { CATEGORY_LABELS, formatNumber, formatShort } from '../lib/format'
import { tdCls, thCls, trCls } from '../lib/styles'
import type { Category, PostSummary } from '../lib/types'
import { IconEye, IconThumbUp } from './icons'
import { PostThumbnail } from './media'
import { ContentStatusPill, Pill } from './ui'

const CATEGORY_TONES: Record<Category, 'gold' | 'blue' | 'green' | 'red' | 'gray'> = {
  notice: 'gold',
  match: 'blue',
  humor: 'green',
  review: 'red',
  news: 'blue',
  free: 'gray',
}

export function AuthorLink({ nickname, className }: { nickname: string; className?: string }) {
  return (
    <Link to={profilePath(nickname)} className={`hover:text-accent ${className ?? ''}`}>
      {nickname}
    </Link>
  )
}

export function TagLabel({ tag }: { tag: string | null }) {
  if (!tag) return null
  return <span className="shrink-0 text-xs font-semibold text-info">[{tag}]</span>
}

export function BestPill() {
  return <Pill tone="red">BEST</Pill>
}

function PostTitle({ post }: { post: PostSummary }) {
  return (
    <>
      <TagLabel tag={post.tag} />
      <span className="truncate font-medium">{post.title}</span>
      {post.commentCount > 0 && <span className="shrink-0 text-xs font-semibold text-accent">[{post.commentCount}]</span>}
      {post.isBest && (
        <span className="shrink-0">
          <BestPill />
        </span>
      )}
    </>
  )
}

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
    <div className="overflow-hidden rounded-xl border border-edge bg-card">
      <table className="hidden w-full text-sm md:table">
        <thead className="border-b border-edge">
          <tr>
            <th className={`${thCls} w-16`}>번호</th>
            {showCategory && <th className={`${thCls} w-24`}>분류</th>}
            <th className={thCls}>제목</th>
            <th className={`${thCls} w-28`}>작성자</th>
            {showStatus && <th className={`${thCls} w-20`}>상태</th>}
            <th className={`${thCls} w-24`}>작성일</th>
            <th className={`${thCls} w-14 text-right`}>추천</th>
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
                <Link to={`/posts/${post.id}`} className="flex min-w-0 items-center gap-2 hover:text-accent">
                  <PostThumbnail id={post.thumbnailId} title={post.title} />
                  <span className="flex min-w-0 items-center gap-1.5">
                    <PostTitle post={post} />
                  </span>
                </Link>
              </td>
              <td className={`${tdCls} max-w-28 truncate text-dim`}>
                <AuthorLink nickname={post.author.nickname} />
              </td>
              {showStatus && (
                <td className={tdCls}>
                  <ContentStatusPill status={post.status} />
                </td>
              )}
              <td className={`${tdCls} text-dim tabular-nums`}>{formatShort(post.createdAt)}</td>
              <td className={`${tdCls} text-right tabular-nums ${post.likeCount > 0 ? 'text-fg' : 'text-dim'}`}>
                {formatNumber(post.likeCount)}
              </td>
              <td className={`${tdCls} text-right text-dim tabular-nums`}>{formatNumber(post.views)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="md:hidden">
        {posts.map((post) => (
          <li key={post.id} className="border-b border-edge-soft last:border-b-0">
            <Link to={`/posts/${post.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-card-hover">
              <PostThumbnail id={post.thumbnailId} title={post.title} />
              <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-1.5">
                <PostTitle post={post} />
              </span>
              <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dim">
                {showCategory && <CategoryPill category={post.category} />}
                {showStatus && <ContentStatusPill status={post.status} />}
                <span className="max-w-32 truncate">{post.author.nickname}</span>
                <span className="tabular-nums">{formatShort(post.createdAt)}</span>
                <span className="flex items-center gap-1 tabular-nums">
                  <IconThumbUp size={12} /> {formatNumber(post.likeCount)}
                </span>
                <span className="flex items-center gap-1 tabular-nums">
                  <IconEye size={12} /> {formatNumber(post.views)}
                </span>
              </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CategoryPill({ category }: { category: PostSummary['category'] }) {
  return <Pill tone={CATEGORY_TONES[category]}>{CATEGORY_LABELS[category]}</Pill>
}

export function PostLine({ post }: { post: PostSummary }) {
  return (
    <Link
      to={`/posts/${post.id}`}
      className="flex items-center gap-3 border-b border-edge-soft px-4 py-2.5 last:border-b-0 hover:bg-card-hover"
    >
      <PostThumbnail id={post.thumbnailId} title={post.title} />
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <PostTitle post={post} />
      </span>
      {post.likeCount > 0 && (
        <span className="hidden shrink-0 items-center gap-1 text-xs text-dim tabular-nums sm:flex">
          <IconThumbUp size={12} /> {post.likeCount}
        </span>
      )}
      <span className="hidden max-w-24 shrink-0 truncate text-xs text-dim sm:inline">{post.author.nickname}</span>
      <span className="shrink-0 text-xs text-muted tabular-nums">{formatShort(post.createdAt)}</span>
    </Link>
  )
}
