import { Link } from 'react-router'
import { CATEGORY_LABELS, formatDateTime } from '../lib/format'
import type { PostSummary } from '../lib/types'

export default function PostList({ posts }: { posts: PostSummary[] }) {
  return (
    <ul className="divide-y divide-gray-100 rounded border border-gray-200 bg-white">
      {posts.map((post) => (
        <li key={post.id}>
          <Link to={`/board/${post.id}`} className="block px-4 py-3 text-sm hover:bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                {CATEGORY_LABELS[post.category]}
              </span>
              <span className="truncate font-medium">{post.title}</span>
              {post.commentCount > 0 && (
                <span className="shrink-0 text-xs text-blue-600">[{post.commentCount}]</span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
              <span>{post.author}</span>
              <span>{formatDateTime(post.createdAt)}</span>
              <span>조회 {post.views}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
