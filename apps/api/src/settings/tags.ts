import type { Category } from '../db/columns.js';

export type BoardTags = {
  freeTags: string[];
  matchTags: string[];
  humorTags: string[];
  reviewTags: string[];
  newsTags: string[];
};

export function tagsForCategory(
  config: BoardTags | undefined,
  category: Category,
): string[] {
  if (!config) return [];
  if (category === 'free') return config.freeTags;
  if (category === 'match') return config.matchTags;
  if (category === 'humor') return config.humorTags;
  if (category === 'review') return config.reviewTags;
  if (category === 'news') return config.newsTags;
  return [];
}
