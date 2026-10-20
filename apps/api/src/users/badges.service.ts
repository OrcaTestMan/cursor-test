import { Injectable } from '@nestjs/common';
import { and, count, eq, inArray, max } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { posts, userBadges } from '../db/schema.js';

export const BADGE_RULES = [
  {
    id: 'first_post',
    label: '첫 글',
    description: '공개된 게시글이 1개 이상이면 지급한다. 공개 글이 0개가 되면 회수한다.',
  },
  {
    id: 'liked',
    label: '추천받은 글',
    description:
      '공개 글 중 추천 수가 5 이상인 글이 1개 이상이면 지급한다. 추천 취소·삭제·숨김으로 조건이 깨지면 회수한다.',
  },
  {
    id: 'regular',
    label: '꾸준한 참여',
    description: '공개 글이 5개 이상이면 지급한다. 4개 이하가 되면 회수한다.',
  },
] as const;

@Injectable()
export class BadgesService {
  constructor(private readonly dbService: DbService) {}

  async listForUser(userId: number) {
    const rows = await this.dbService.db
      .select({
        id: userBadges.badgeId,
        awardedAt: userBadges.awardedAt,
      })
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
    const awarded = new Set(rows.map((row) => row.id));
    return BADGE_RULES.filter((rule) => awarded.has(rule.id)).map((rule) => ({
      id: rule.id,
      label: rule.label,
    }));
  }

  async recompute(userId: number) {
    const [[{ postCount }], [{ maxLikes }]] = await Promise.all([
      this.dbService.db
        .select({ postCount: count() })
        .from(posts)
        .where(and(eq(posts.authorId, userId), eq(posts.status, 'visible'))),
      this.dbService.db
        .select({ maxLikes: max(posts.likeCount) })
        .from(posts)
        .where(and(eq(posts.authorId, userId), eq(posts.status, 'visible'))),
    ]);
    const visible = Number(postCount);
    const topLikes = Number(maxLikes ?? 0);
    const earned = new Set<string>();
    if (visible >= 1) earned.add('first_post');
    if (topLikes >= 5) earned.add('liked');
    if (visible >= 5) earned.add('regular');

    const existing = await this.dbService.db
      .select({ id: userBadges.badgeId })
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
    const have = new Set(existing.map((row) => row.id));
    const toAdd = [...earned].filter((id) => !have.has(id));
    const toRemove = [...have].filter((id) => !earned.has(id));
    if (toAdd.length > 0) {
      await this.dbService.db
        .insert(userBadges)
        .values(toAdd.map((badgeId) => ({ userId, badgeId })))
        .onConflictDoNothing();
    }
    if (toRemove.length > 0) {
      await this.dbService.db
        .delete(userBadges)
        .where(and(eq(userBadges.userId, userId), inArray(userBadges.badgeId, toRemove)));
    }
  }
}
