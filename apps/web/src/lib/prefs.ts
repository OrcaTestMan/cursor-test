import { WRITE_CATEGORIES } from './boards'
import type { Category } from './types'

const USERNAME_KEY = 'login-username'
const BOARD_KEY = 'last-write-board'
const RECENT_KEY = 'recent-posts'
const RECENT_EVENT = 'recent-posts-changed'
const RECENT_MAX = 12
const SEEN_COMMENT_PREFIX = 'seen-comments:'

export type RecentPost = {
  id: number
  title: string
  category: Category
}

export function loadLastUsername(): string {
  try {
    return localStorage.getItem(USERNAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveLastUsername(value: string) {
  try {
    localStorage.setItem(USERNAME_KEY, value)
  } catch {
    /* ignore */
  }
}

export function saveLastWriteBoard(category: Category) {
  if (!WRITE_CATEGORIES.includes(category)) return
  try {
    localStorage.setItem(BOARD_KEY, category)
  } catch {
    /* ignore */
  }
}

export function lastWritePath(): string {
  try {
    const category = localStorage.getItem(BOARD_KEY)
    if (category && WRITE_CATEGORIES.includes(category as Category)) return `/write?category=${category}`
  } catch {
    /* ignore */
  }
  return '/write'
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export function loadRecentPosts(): RecentPost[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item): item is RecentPost =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as RecentPost).id === 'number' &&
          typeof (item as RecentPost).title === 'string' &&
          typeof (item as RecentPost).category === 'string',
      )
      .slice(0, RECENT_MAX)
  } catch {
    return []
  }
}

export function recordRecentPost(post: RecentPost) {
  try {
    const items = loadRecentPosts().filter((item) => item.id !== post.id)
    items.unshift({ id: post.id, title: post.title, category: post.category })
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, RECENT_MAX)))
    window.dispatchEvent(new Event(RECENT_EVENT))
  } catch {
    /* ignore */
  }
}

export function onRecentPostsChange(handler: () => void) {
  window.addEventListener(RECENT_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(RECENT_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function loadSeenCommentMax(postId: number): number {
  try {
    const value = Number(localStorage.getItem(`${SEEN_COMMENT_PREFIX}${postId}`) ?? '0')
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

export function saveSeenCommentMax(postId: number, maxId: number) {
  try {
    localStorage.setItem(`${SEEN_COMMENT_PREFIX}${postId}`, String(maxId))
  } catch {
    /* ignore */
  }
}
