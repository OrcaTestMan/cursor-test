import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, type SQL } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js';
import { pageParams, type PaginationQueryDto } from '../common/pagination.js';
import { andTokens, anyField, searchTokens, tokenPattern } from '../common/search-query.js';
import { authorColumns } from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import {
  postSubscriptions,
  posts,
  userFollows,
  userMutes,
  users,
} from '../db/schema.js';
import type { ListMineFollowingDto } from './dto/social.dto.js';

const NOT_FOUND = '회원을 찾을 수 없습니다.';
const SELF_FOLLOW = '자기 자신은 팔로우할 수 없습니다.';
const SELF_MUTE = '자기 자신은 숨길 수 없습니다.';

@Injectable()
export class SocialService {
  constructor(private readonly dbService: DbService) {}

  private async findActive(nickname: string) {
    const [user] = await this.dbService.db
      .select({
        id: users.id,
        nickname: users.nickname,
        avatarUploadId: users.avatarUploadId,
        status: users.status,
      })
      .from(users)
      .where(eq(users.nickname, nickname));
    if (!user || user.status !== 'active') {
      throw new NotFoundException(NOT_FOUND);
    }
    return user;
  }

  async mutedIds(userId: number): Promise<number[]> {
    const rows = await this.dbService.db
      .select({ id: userMutes.mutedUserId })
      .from(userMutes)
      .where(eq(userMutes.userId, userId));
    return rows.map((row) => row.id);
  }

  async followerIds(userId: number): Promise<number[]> {
    const rows = await this.dbService.db
      .select({ id: userFollows.followerId })
      .from(userFollows)
      .where(eq(userFollows.followeeId, userId));
    return rows.map((row) => row.id);
  }

  async subscriberIds(postId: number): Promise<number[]> {
    const rows = await this.dbService.db
      .select({ id: postSubscriptions.userId })
      .from(postSubscriptions)
      .where(eq(postSubscriptions.postId, postId));
    return rows.map((row) => row.id);
  }

  async isSubscribed(userId: number, postId: number) {
    const [row] = await this.dbService.db
      .select({ userId: postSubscriptions.userId })
      .from(postSubscriptions)
      .where(
        and(
          eq(postSubscriptions.userId, userId),
          eq(postSubscriptions.postId, postId),
        ),
      );
    return !!row;
  }

  async profileStats(targetId: number, viewerId?: number) {
    const db = this.dbService.db;
    const [[{ followerCount }], [{ followingCount }], followed, muted] =
      await Promise.all([
        db
          .select({ followerCount: count() })
          .from(userFollows)
          .innerJoin(users, eq(userFollows.followerId, users.id))
          .where(
            and(eq(userFollows.followeeId, targetId), eq(users.status, 'active')),
          ),
        db
          .select({ followingCount: count() })
          .from(userFollows)
          .innerJoin(users, eq(userFollows.followeeId, users.id))
          .where(
            and(eq(userFollows.followerId, targetId), eq(users.status, 'active')),
          ),
        viewerId
          ? db
              .select({ followerId: userFollows.followerId })
              .from(userFollows)
              .where(
                and(
                  eq(userFollows.followerId, viewerId),
                  eq(userFollows.followeeId, targetId),
                ),
              )
          : Promise.resolve([]),
        viewerId
          ? db
              .select({ userId: userMutes.userId })
              .from(userMutes)
              .where(
                and(
                  eq(userMutes.userId, viewerId),
                  eq(userMutes.mutedUserId, targetId),
                ),
              )
          : Promise.resolve([]),
      ]);
    return {
      followerCount: Number(followerCount),
      followingCount: Number(followingCount),
      followed: followed.length > 0,
      muted: muted.length > 0,
    };
  }

  async follow(user: AuthUser, nickname: string) {
    const target = await this.findActive(nickname);
    if (target.id === user.id) {
      throw new BadRequestException(SELF_FOLLOW);
    }
    await this.dbService.db
      .insert(userFollows)
      .values({ followerId: user.id, followeeId: target.id })
      .onConflictDoNothing();
    return { following: true };
  }

  async unfollow(user: AuthUser, nickname: string) {
    const target = await this.findActive(nickname);
    await this.dbService.db
      .delete(userFollows)
      .where(
        and(
          eq(userFollows.followerId, user.id),
          eq(userFollows.followeeId, target.id),
        ),
      );
    return { following: false };
  }

  async mute(user: AuthUser, nickname: string) {
    const target = await this.findActive(nickname);
    if (target.id === user.id) {
      throw new BadRequestException(SELF_MUTE);
    }
    await this.dbService.db
      .insert(userMutes)
      .values({ userId: user.id, mutedUserId: target.id })
      .onConflictDoNothing();
    return { muted: true };
  }

  async unmute(user: AuthUser, nickname: string) {
    const target = await this.findActive(nickname);
    await this.dbService.db
      .delete(userMutes)
      .where(
        and(eq(userMutes.userId, user.id), eq(userMutes.mutedUserId, target.id)),
      );
    return { muted: false };
  }

  async subscribe(user: AuthUser, postId: number) {
    const [post] = await this.dbService.db
      .select({ id: posts.id, status: posts.status, authorId: posts.authorId })
      .from(posts)
      .where(eq(posts.id, postId));
    if (!post || (post.status !== 'visible' && post.authorId !== user.id && user.role !== 'admin')) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    await this.dbService.db
      .insert(postSubscriptions)
      .values({ userId: user.id, postId })
      .onConflictDoNothing();
    return { subscribed: true };
  }

  async unsubscribe(user: AuthUser, postId: number) {
    await this.dbService.db
      .delete(postSubscriptions)
      .where(
        and(
          eq(postSubscriptions.userId, user.id),
          eq(postSubscriptions.postId, postId),
        ),
      );
    return { subscribed: false };
  }

  async listFollowers(nickname: string, query: PaginationQueryDto) {
    const target = await this.findActive(nickname);
    return this.listRelation('followers', target.id, query);
  }

  async listFollowing(nickname: string, query: PaginationQueryDto) {
    const target = await this.findActive(nickname);
    return this.listRelation('following', target.id, query);
  }

  listMyFollowers(user: AuthUser, query: PaginationQueryDto) {
    return this.listRelation('followers', user.id, query);
  }

  listMyFollowing(user: AuthUser, query: ListMineFollowingDto) {
    return this.listRelation('following', user.id, query, { mine: true });
  }

  async listMyMutes(user: AuthUser, query: PaginationQueryDto) {
    const { page, pageSize, offset } = pageParams(query);
    const db = this.dbService.db;
    const where = eq(userMutes.userId, user.id);
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          ...authorColumns,
          createdAt: userMutes.createdAt,
        })
        .from(userMutes)
        .innerJoin(users, eq(userMutes.mutedUserId, users.id))
        .where(and(where, eq(users.status, 'active')))
        .orderBy(desc(userMutes.createdAt), desc(users.id))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(userMutes)
        .innerJoin(users, eq(userMutes.mutedUserId, users.id))
        .where(and(where, eq(users.status, 'active'))),
    ]);
    return { items, total, page, pageSize };
  }

  async usersByNicknames(nicknames: string[]) {
    const unique = [...new Set(nicknames)];
    if (unique.length === 0) return [];
    return this.dbService.db
      .select({
        id: users.id,
        nickname: users.nickname,
      })
      .from(users)
      .where(and(inArray(users.nickname, unique), eq(users.status, 'active')));
  }

  private async listRelation(
    kind: 'followers' | 'following',
    userId: number,
    query: PaginationQueryDto & { q?: string; range?: string; from?: string; to?: string },
    options?: { mine?: boolean },
  ) {
    const { page, pageSize, offset } = pageParams(query);
    const db = this.dbService.db;
    const joinId =
      kind === 'followers' ? userFollows.followerId : userFollows.followeeId;
    const whereId =
      kind === 'followers' ? userFollows.followeeId : userFollows.followerId;
    const conditions: SQL[] = [eq(whereId, userId), eq(users.status, 'active')];
    const range = options?.mine
      ? resolveDateRange(query)
      : resolveDateRange({ range: 'all' });
    const bounded = dateCondition(userFollows.createdAt, range);
    if (bounded) conditions.push(bounded);
    if (options?.mine) {
      conditions.push(
        ...andTokens(searchTokens(query.q), (token) => {
          const pattern = tokenPattern(token);
          return anyField([ilike(users.nickname, pattern), ilike(users.username, pattern)]);
        }),
      );
    }
    const where = and(...conditions);
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          ...authorColumns,
          createdAt: userFollows.createdAt,
        })
        .from(userFollows)
        .innerJoin(users, eq(joinId, users.id))
        .where(where)
        .orderBy(desc(userFollows.createdAt), desc(users.id))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(userFollows)
        .innerJoin(users, eq(joinId, users.id))
        .where(where),
    ]);
    return options?.mine
      ? { items, total, page, pageSize, filter: rangeMeta(range) }
      : { items, total, page, pageSize };
  }
}
