import type { Category, PublicSettings } from './types'

export const CATEGORIES: Category[] = ['notice', 'free', 'match', 'humor', 'review', 'news']

export const WRITE_CATEGORIES: Category[] = ['free', 'match', 'humor', 'review', 'news']

export const BOARD_SUBTITLES: Record<Category, string> = {
  notice: '운영진이 전하는 소식입니다.',
  free: '스포츠에 관한 자유로운 이야기를 나눠요.',
  match: '경기를 보며 생각을 나눠요.',
  humor: '경기장 안팎의 웃긴 장면과 이슈를 나눠요.',
  review: '직관과 경기 후기를 남겨 주세요.',
  news: '구단 소식과 속보를 모아요.',
}

export function isCategory(value: string | undefined): value is Category {
  return value !== undefined && CATEGORIES.includes(value as Category)
}

export function tagsForCategory(settings: PublicSettings, category: Category): string[] {
  if (category === 'free') return settings.freeTags ?? []
  if (category === 'match') return settings.matchTags ?? []
  if (category === 'humor') return settings.humorTags ?? []
  if (category === 'review') return settings.reviewTags ?? []
  if (category === 'news') return settings.newsTags ?? []
  return []
}

export function profilePath(nickname: string): string {
  return `/u/${encodeURIComponent(nickname)}`
}
