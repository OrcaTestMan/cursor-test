import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { hashPassword } from '../auth/password.js';
import { adminUserViewColumns } from '../auth/user-columns.js';
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js';
import { pageParams } from '../common/pagination.js';
import { andTokens, anyField, idFromToken, searchTokens, tokenPattern } from '../common/search-query.js';
import { postSummaryColumns } from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import { comments, posts, sessions, users, userTeams } from '../db/schema.js';
import { FansService } from '../fans/fans.service.js';
import { AuditService } from '../moderation/audit.service.js';
import { SocialService } from '../social/social.service.js';
import { TeamsService } from '../teams/teams.service.js';
import { BadgesService } from './badges.service.js';
import {
  AdminListUsersDto,
  AdminLookupUsersDto,
  UpdateProfileDto,
  UpdateUserDto,
} from './dto/user.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const TEMP_PASSWORD_LENGTH = 12;
const LETTERS = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';

function randomFrom(chars: string) {
  return chars[randomInt(chars.length)];
}

export function createTempPassword(): string {
  const all = LETTERS + DIGITS;
  const chars = [randomFrom(LETTERS), randomFrom(DIGITS)];
  while (chars.length < TEMP_PASSWORD_LENGTH) {
    chars.push(randomFrom(all));
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

@Injectable()
export class UsersService {
  constructor(
    private readonly dbService: DbService,
    private readonly auditService: AuditService,
    private readonly fansService: FansService,
    private readonly teamsService: TeamsService,
    private readonly socialService: SocialService,
    private readonly badgesService: BadgesService,
  ) {}

  /** 기간이 끝난 차단을 푼다. */
  async releaseExpiredBlocks() {
    await this.dbService.db
      .update(users)
      .set({ status: 'active', blockedReason: null, blockedUntil: null })
      .where(
        and(
          eq(users.status, 'blocked'),
          isNotNull(users.blockedUntil),
          lte(users.blockedUntil, new Date()),
        ),
      );
  }

  async list(query: AdminListUsersDto, options?: { skipDate?: boolean }) {
    await this.releaseExpiredBlocks();
    if (
      query.minPosts !== undefined &&
      query.maxPosts !== undefined &&
      query.minPosts > query.maxPosts
    ) {
      throw new BadRequestException('글 수 최솟값이 최댓값보다 큽니다.');
    }
    if (
      query.minComments !== undefined &&
      query.maxComments !== undefined &&
      query.minComments > query.maxComments
    ) {
      throw new BadRequestException('댓글 수 최솟값이 최댓값보다 큽니다.');
    }
    const { page, pageSize, offset } = pageParams(query);
    const dateField =
      query.dateField === 'lastLogin' || query.dateField === 'blocked'
        ? query.dateField
        : 'created';
    const range = options?.skipDate
      ? resolveDateRange({ range: 'all' })
      : resolveDateRange(query);
    const conditions: SQL[] = [];
    const tokens = searchTokens(query.q);
    conditions.push(
      ...andTokens(tokens, (token) => {
        const pattern = tokenPattern(token);
        const id = idFromToken(token);
        return anyField([
          ilike(users.username, pattern),
          ilike(users.nickname, pattern),
          ilike(users.blockedReason, pattern),
          id ? eq(users.id, id) : undefined,
        ]);
      }),
    );
    if (query.status) conditions.push(eq(users.status, query.status));
    if (query.role) conditions.push(eq(users.role, query.role));
    const dateCol =
      dateField === 'lastLogin'
        ? users.lastLoginAt
        : dateField === 'blocked'
          ? users.blockedAt
          : users.createdAt;
    const bounded = dateCondition(dateCol, range);
    if (bounded) {
      conditions.push(bounded);
      if (dateField !== 'created') conditions.push(isNotNull(dateCol));
    }
    if (query.blockKind === 'permanent') conditions.push(isNull(users.blockedUntil));
    if (query.blockKind === 'timed') conditions.push(isNotNull(users.blockedUntil));
    if (query.expireWithinHours) {
      const until = new Date(Date.now() + query.expireWithinHours * 60 * 60 * 1000);
      conditions.push(
        isNotNull(users.blockedUntil),
        gte(users.blockedUntil, new Date()),
        lt(users.blockedUntil, until),
      );
    }
    if (query.hasLogin === true) conditions.push(isNotNull(users.lastLoginAt));
    if (query.hasLogin === false) conditions.push(isNull(users.lastLoginAt));
    if (query.inactiveDays) {
      const since = new Date(Date.now() - query.inactiveDays * DAY_MS);
      conditions.push(isNotNull(users.lastLoginAt), lt(users.lastLoginAt, since));
    }
    const postCountSql = sql`(select count(*)::int from "posts" where "posts"."author_id" = "users"."id")`;
    const commentCountSql = sql`(select count(*)::int from "comments" where "comments"."author_id" = "users"."id")`;
    if (query.minPosts !== undefined) conditions.push(sql`${postCountSql} >= ${query.minPosts}`);
    if (query.maxPosts !== undefined) conditions.push(sql`${postCountSql} <= ${query.maxPosts}`);
    if (query.minComments !== undefined) {
      conditions.push(sql`${commentCountSql} >= ${query.minComments}`);
    }
    if (query.maxComments !== undefined) {
      conditions.push(sql`${commentCountSql} <= ${query.maxComments}`);
    }
    if (query.teamId) {
      conditions.push(
        exists(
          this.dbService.db
            .select({ userId: userTeams.userId })
            .from(userTeams)
            .where(and(eq(userTeams.userId, users.id), eq(userTeams.teamId, query.teamId))),
        ),
      );
    }
    if (query.hasBio === true) conditions.push(ne(users.bio, ''));
    if (query.hasBio === false) conditions.push(eq(users.bio, ''));
    if (query.hasAvatar === true) conditions.push(isNotNull(users.avatarUploadId));
    if (query.hasAvatar === false) conditions.push(isNull(users.avatarUploadId));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const sort = query.sort ?? 'created_desc';
    const order =
      sort === 'created_asc'
        ? [asc(users.createdAt), asc(users.id)]
        : sort === 'login_desc'
          ? [sql`${users.lastLoginAt} desc nulls last`, desc(users.id)]
          : sort === 'login_asc'
            ? [sql`${users.lastLoginAt} asc nulls last`, desc(users.id)]
            : sort === 'posts_desc'
              ? [sql`${postCountSql} desc`, desc(users.id)]
              : sort === 'comments_desc'
                ? [sql`${commentCountSql} desc`, desc(users.id)]
                : [desc(users.createdAt), desc(users.id)];
    const exact = tokens.length === 1 ? tokens[0] : '';
    const exactId = exact ? idFromToken(exact) : null;
    const orderWithExact =
      sort === 'created_desc' && exact
        ? [
            sql`(case when ${users.username} = ${exact} or ${users.nickname} = ${exact} or ${exactId ? sql`${users.id} = ${exactId}` : sql`false`} then 0 else 1 end)`,
            ...order,
          ]
        : order;
    const db = this.dbService.db;
    const [items, [{ total }]] = await Promise.all([
      db
        .select(adminUserViewColumns)
        .from(users)
        .where(where)
        .orderBy(...orderWithExact)
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(users).where(where),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
      filter: { ...rangeMeta(range), dateField },
    };
  }

  lookup(query: AdminLookupUsersDto) {
    return this.list(
      {
        q: query.q,
        page: query.page,
        pageSize: query.pageSize,
        status: 'active',
        range: 'all',
      },
      { skipDate: true },
    );
  }

  recent(limit: number) {
    return this.dbService.db
      .select(adminUserViewColumns)
      .from(users)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(limit);
  }

  async get(id: number) {
    const [user] = await this.dbService.db
      .select(adminUserViewColumns)
      .from(users)
      .where(eq(users.id, id));
    if (!user) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }
    return user;
  }

  async update(admin: AuthUser, id: number, dto: UpdateUserDto) {
    await this.releaseExpiredBlocks();
    const before = await this.get(id);
    if (before.status === 'deleted') {
      throw new BadRequestException('탈퇴한 회원은 바꿀 수 없습니다.');
    }
    if (
      admin.id === id &&
      (dto.status === 'blocked' || dto.role === 'user')
    ) {
      throw new BadRequestException(
        '자기 자신은 차단하거나 권한을 내릴 수 없습니다.',
      );
    }

    let blockedReason: string | null | undefined;
    let blockedUntil: Date | null | undefined;
    let blockedAt: Date | null | undefined;
    if (dto.status === 'active') {
      blockedReason = null;
      blockedUntil = null;
    } else if (dto.blockedReason !== undefined) {
      blockedReason = dto.blockedReason || null;
    }
    const blocking =
      dto.status === 'blocked' ||
      (dto.status === undefined && before.status === 'blocked');
    if (blocking && (dto.status === 'blocked' || dto.blockDays !== undefined)) {
      blockedUntil = dto.blockDays
        ? new Date(Date.now() + dto.blockDays * DAY_MS)
        : null;
    }
    if (dto.status === 'blocked') {
      blockedAt = new Date();
    }

    await this.dbService.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          role: dto.role,
          status: dto.status,
          blockedReason,
          blockedUntil,
          blockedAt,
        })
        .where(eq(users.id, id));
      if (dto.status === 'blocked') {
        await tx.delete(sessions).where(eq(sessions.userId, id));
      }
    });
    const after = await this.get(id);
    await this.logUpdate(admin, before, after, dto);
    return after;
  }

  private async logUpdate(
    admin: AuthUser,
    before: Awaited<ReturnType<UsersService['get']>>,
    after: Awaited<ReturnType<UsersService['get']>>,
    dto: UpdateUserDto,
  ) {
    const who = `${after.nickname}(${after.username})`;
    if (before.role !== after.role) {
      await this.auditService.log(
        admin,
        'user.role',
        'user',
        after.id,
        `${who} 권한: ${before.role} → ${after.role}`,
      );
    }
    if (after.status === 'blocked' && dto.status === 'blocked') {
      const period = dto.blockDays ? `${dto.blockDays}일` : '영구';
      await this.auditService.log(
        admin,
        'user.block',
        'user',
        after.id,
        `${who} 기간: ${period}, 사유: ${after.blockedReason ?? '없음'}`,
      );
    } else if (before.status === 'blocked' && after.status === 'active') {
      await this.auditService.log(admin, 'user.unblock', 'user', after.id, who);
    } else if (
      before.blockedReason !== after.blockedReason ||
      before.blockedUntil?.getTime() !== after.blockedUntil?.getTime()
    ) {
      await this.auditService.log(
        admin,
        'user.update',
        'user',
        after.id,
        `${who} 차단 정보 수정`,
      );
    }
  }

  async getPublic(nickname: string, viewer?: AuthUser) {
    const [user] = await this.dbService.db
      .select({
        id: users.id,
        nickname: users.nickname,
        bio: users.bio,
        avatarUploadId: users.avatarUploadId,
        createdAt: users.createdAt,
        status: users.status,
      })
      .from(users)
      .where(eq(users.nickname, nickname));
    if (!user || user.status !== 'active') {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    const db = this.dbService.db;
    const [recentPosts, postCountRows, commentCountRows, prediction, likeRows, userTeams, stats] =
      await Promise.all([
        db
          .select(postSummaryColumns)
          .from(posts)
          .innerJoin(users, eq(posts.authorId, users.id))
          .where(and(eq(posts.authorId, user.id), eq(posts.status, 'visible')))
          .orderBy(desc(posts.createdAt), desc(posts.id))
          .limit(8),
        db
          .select({ total: count() })
          .from(posts)
          .where(and(eq(posts.authorId, user.id), eq(posts.status, 'visible'))),
        db
          .select({ total: count() })
          .from(comments)
          .where(
            and(
              eq(comments.authorId, user.id),
              eq(comments.status, 'visible'),
              isNull(comments.deletedAt),
            ),
          ),
        this.fansService.summaryForUser(user.id),
        db
          .select({ total: sql<number>`coalesce(sum(${posts.likeCount}), 0)` })
          .from(posts)
          .where(and(eq(posts.authorId, user.id), eq(posts.status, 'visible'))),
        this.teamsService.listForUser(user.id),
        this.socialService.profileStats(user.id, viewer?.id),
      ]);

    const postCount = Number(postCountRows[0]?.total ?? 0);
    const likeReceived = Number(likeRows[0]?.total ?? 0);
    await this.badgesService.recompute(user.id);
    const badges = await this.badgesService.listForUser(user.id);

    return {
      id: user.id,
      nickname: user.nickname,
      bio: user.bio,
      avatarUploadId: user.avatarUploadId,
      createdAt: user.createdAt,
      postCount,
      commentCount: Number(commentCountRows[0]?.total ?? 0),
      likeReceived,
      teams: userTeams,
      badges,
      recentPosts,
      prediction,
      followerCount: stats.followerCount,
      followingCount: stats.followingCount,
      followed: stats.followed,
      muted: stats.muted,
    };
  }

  listTeams(userId: number) {
    return this.teamsService.listForUser(userId);
  }

  async updateProfile(user: AuthUser, dto: UpdateProfileDto) {
    if (dto.bio !== undefined) {
      await this.dbService.db
        .update(users)
        .set({ bio: dto.bio })
        .where(eq(users.id, user.id));
    }
    if (dto.teamIds) {
      await this.teamsService.setForUser(
        user,
        dto.teamIds,
        dto.primaryTeamId ?? null,
      );
    }
    const [row] = await this.dbService.db
      .select({
        bio: users.bio,
        avatarUploadId: users.avatarUploadId,
      })
      .from(users)
      .where(eq(users.id, user.id));
    return {
      bio: row.bio,
      avatarUploadId: row.avatarUploadId,
      teams: await this.teamsService.listForUser(user.id),
    };
  }

  async resetPassword(admin: AuthUser, id: number) {
    const user = await this.get(id);
    if (user.status === 'deleted') {
      throw new BadRequestException('탈퇴한 회원은 바꿀 수 없습니다.');
    }
    const tempPassword = createTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    await this.dbService.db.transaction(async (tx) => {
      await tx.update(users).set({ passwordHash }).where(eq(users.id, id));
      await tx.delete(sessions).where(eq(sessions.userId, id));
    });
    await this.auditService.log(
      admin,
      'user.reset_password',
      'user',
      id,
      `${user.nickname}(${user.username}) 임시 비밀번호 발급`,
    );
    return { tempPassword };
  }
}
