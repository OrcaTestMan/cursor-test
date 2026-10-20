import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  notInArray,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js';
import { extractMentionNicknames } from '../common/mention.js';
import { pageParams, type PaginationQueryDto } from '../common/pagination.js';
import { andTokens, anyField, idFromToken, searchTokens, tokenPattern } from '../common/search-query.js';
import {
  adminPostSummaryColumns,
  commentColumns,
  isBestSql,
  postSummaryColumns,
  type Category,
  type ContentStatus,
} from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import { bookmarks, commentLikes, comments, postLikes, postPolls, posts, postTeams, teams, uploads, userFollows, users } from '../db/schema.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { tagsForCategory } from '../settings/tags.js';
import { MatchesService } from '../matches/matches.service.js';
import { AuditService } from '../moderation/audit.service.js';
import { ModerationService } from '../moderation/moderation.service.js';
import {
  NotificationsService,
  quoteTitle,
} from '../notifications/notifications.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { SocialService } from '../social/social.service.js';
import { BadgesService } from '../users/badges.service.js';
import { PollsService } from './polls.service.js';
import {
  AdminListPostsDto,
  AdminUpdatePostDto,
  CreatePostDto,
  ListMinePostsDto,
  ListPostsDto,
  UpdatePostDto,
} from './dto/post.dto.js';

const NOT_FOUND = '게시글을 찾을 수 없습니다.';
const VIEW_DEDUPE_MS = 30 * 60 * 1000;

const STATUS_ACTIONS: Record<ContentStatus, string> = {
  hidden: 'hide',
  visible: 'visible',
  pending: 'pending',
};

export function statusAction(status: ContentStatus) {
  return STATUS_ACTIONS[status];
}

export function canManage(user: AuthUser | undefined, authorId: number) {
  return !!user && (user.role === 'admin' || user.id === authorId);
}

@Injectable()
export class PostsService {
  constructor(
    private readonly dbService: DbService,
    private readonly matchesService: MatchesService,
    private readonly settingsService: SettingsService,
    private readonly moderationService: ModerationService,
    private readonly auditService: AuditService,
    private readonly uploadsService: UploadsService,
    private readonly socialService: SocialService,
    private readonly notificationsService: NotificationsService,
    private readonly pollsService: PollsService,
    private readonly badgesService: BadgesService,
  ) {}

  async initialStatus(user: AuthUser): Promise<ContentStatus> {
    if (user.role === 'admin') {
      return 'visible';
    }
    const settings = await this.settingsService.get();
    return settings.postApprovalRequired ? 'pending' : 'visible';
  }

  private postOrder(sort: 'latest' | 'oldest' | 'likes' | 'views' | 'comments') {
    const commentCountSql = sql`(select count(*)::int from "comments" where "comments"."post_id" = "posts"."id" and "comments"."status" = 'visible' and "comments"."deleted_at" is null)`;
    if (sort === 'likes') return [desc(posts.likeCount), desc(posts.createdAt), desc(posts.id)];
    if (sort === 'oldest') return [asc(posts.createdAt), asc(posts.id)];
    if (sort === 'views') return [desc(posts.views), desc(posts.id)];
    if (sort === 'comments') return [sql`${commentCountSql} desc`, desc(posts.id)];
    return [desc(posts.createdAt), desc(posts.id)];
  }

  private async page(
    where: SQL | undefined,
    query: PaginationQueryDto,
    sort: 'latest' | 'oldest' | 'likes' | 'views' | 'comments' = 'latest',
  ) {
    const { page, pageSize, offset } = pageParams(query);
    const db = this.dbService.db;
    const [items, [{ total }]] = await Promise.all([
      db
        .select(postSummaryColumns)
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(where)
        .orderBy(...this.postOrder(sort))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(where),
    ]);
    return { items, total, page, pageSize };
  }

  private unifiedSearch(q?: string) {
    return andTokens(searchTokens(q), (token) => {
      const pattern = tokenPattern(token);
      const id = idFromToken(token);
      return anyField([
        ilike(posts.title, pattern),
        ilike(posts.body, pattern),
        ilike(users.nickname, pattern),
        exists(
          this.dbService.db
            .select({ postId: postTeams.postId })
            .from(postTeams)
            .innerJoin(teams, eq(postTeams.teamId, teams.id))
            .where(and(eq(postTeams.postId, posts.id), ilike(teams.name, pattern))),
        ),
        id ? eq(posts.id, id) : undefined,
      ]);
    });
  }

  async list(query: ListPostsDto, viewer?: AuthUser) {
    if (query.followed && !viewer) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    const range = resolveDateRange(query);
    const conditions: (SQL | undefined)[] = [eq(posts.status, 'visible'), dateCondition(posts.createdAt, range)];
    if (query.category) {
      conditions.push(eq(posts.category, query.category));
    } else if (!query.includeNotice) {
      conditions.push(ne(posts.category, 'notice'));
    }
    if (query.matchId) {
      conditions.push(eq(posts.matchId, query.matchId));
    }
    if (query.tag) {
      conditions.push(eq(posts.tag, query.tag));
    }
    if (query.best) {
      conditions.push(isBestSql);
    }
    conditions.push(...this.unifiedSearch(query.q));
    if (query.teamId) {
      conditions.push(
        exists(
          this.dbService.db
            .select({ id: postTeams.postId })
            .from(postTeams)
            .where(
              and(
                eq(postTeams.postId, posts.id),
                eq(postTeams.teamId, query.teamId),
              ),
            ),
        ),
      );
    }
    if (query.hasImage === true) {
      conditions.push(
        exists(
          this.dbService.db
            .select({ id: uploads.id })
            .from(uploads)
            .where(and(eq(uploads.postId, posts.id), eq(uploads.kind, 'post'))),
        ),
      );
    }
    if (query.hasImage === false) {
      conditions.push(
        sql`not exists (select 1 from "uploads" where "uploads"."post_id" = "posts"."id" and "uploads"."kind" = 'post')`,
      );
    }
    if (query.hasComments === true) {
      conditions.push(
        exists(
          this.dbService.db
            .select({ id: comments.id })
            .from(comments)
            .where(
              and(eq(comments.postId, posts.id), eq(comments.status, 'visible'), isNull(comments.deletedAt)),
            ),
        ),
      );
    }
    if (query.hasComments === false) {
      conditions.push(
        sql`not exists (select 1 from "comments" where "comments"."post_id" = "posts"."id" and "comments"."status" = 'visible' and "comments"."deleted_at" is null)`,
      );
    }
    if (query.minLikes !== undefined) conditions.push(gte(posts.likeCount, query.minLikes));
    if (query.minCommentCount !== undefined) {
      conditions.push(
        sql`(select count(*)::int from "comments" where "comments"."post_id" = "posts"."id" and "comments"."status" = 'visible' and "comments"."deleted_at" is null) >= ${query.minCommentCount}`,
      );
    }
    if (query.poll === 'none') {
      conditions.push(
        sql`not exists (select 1 from "post_polls" where "post_polls"."post_id" = "posts"."id")`,
      );
    }
    if (query.poll === 'open') {
      conditions.push(
        exists(
          this.dbService.db
            .select({ postId: postPolls.postId })
            .from(postPolls)
            .where(and(eq(postPolls.postId, posts.id), gt(postPolls.closesAt, new Date()))),
        ),
      );
    }
    if (query.poll === 'closed') {
      conditions.push(
        exists(
          this.dbService.db
            .select({ postId: postPolls.postId })
            .from(postPolls)
            .where(and(eq(postPolls.postId, posts.id), lte(postPolls.closesAt, new Date()))),
        ),
      );
    }
    if (query.authorId) {
      conditions.push(eq(posts.authorId, query.authorId));
    }
    if (query.followed && viewer) {
      conditions.push(
        exists(
          this.dbService.db
            .select({ followerId: userFollows.followerId })
            .from(userFollows)
            .where(
              and(
                eq(userFollows.followerId, viewer.id),
                eq(userFollows.followeeId, posts.authorId),
              ),
            ),
        ),
      );
    }
    if (viewer) {
      const mutedIds = await this.socialService.mutedIds(viewer.id);
      if (mutedIds.length > 0) {
        conditions.push(notInArray(posts.authorId, mutedIds));
      }
    }
    const result = await this.page(and(...conditions), query, query.sort ?? 'latest');
    return { ...result, filter: rangeMeta(range) };
  }

  async listMine(user: AuthUser, query: ListMinePostsDto) {
    const range = resolveDateRange(query);
    const result = await this.page(
      and(
        eq(posts.authorId, user.id),
        dateCondition(posts.createdAt, range),
        ...this.unifiedSearch(query.q),
      ),
      query,
    );
    return { ...result, filter: rangeMeta(range) };
  }

  async listBookmarks(user: AuthUser, query: ListMinePostsDto) {
    const { page, pageSize, offset } = pageParams(query);
    const range = resolveDateRange(query);
    const db = this.dbService.db;
    const conditions: SQL[] = [
      eq(bookmarks.userId, user.id),
      eq(posts.status, 'visible'),
    ];
    const bounded = dateCondition(bookmarks.createdAt, range);
    if (bounded) conditions.push(bounded);
    conditions.push(...this.unifiedSearch(query.q));
    const where = and(...conditions);
    const [items, [{ total }]] = await Promise.all([
      db
        .select(postSummaryColumns)
        .from(bookmarks)
        .innerJoin(posts, eq(bookmarks.postId, posts.id))
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(where)
        .orderBy(desc(bookmarks.createdAt), desc(posts.id))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(bookmarks)
        .innerJoin(posts, eq(bookmarks.postId, posts.id))
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(where),
    ]);
    return { items, total, page, pageSize, filter: rangeMeta(range) };
  }

  async listAdmin(query: AdminListPostsDto) {
    const { page, pageSize, offset } = pageParams(query);
    const range = resolveDateRange(query);
    const conditions: SQL[] = [];
    const bounded = dateCondition(posts.createdAt, range);
    if (bounded) conditions.push(bounded);
    if (query.status) {
      conditions.push(eq(posts.status, query.status));
    }
    if (query.category) {
      conditions.push(eq(posts.category, query.category));
    }
    conditions.push(...this.unifiedSearch(query.q));
    if (query.authorId) conditions.push(eq(posts.authorId, query.authorId));
    if (query.hasImage === true) {
      conditions.push(
        exists(
          this.dbService.db
            .select({ id: uploads.id })
            .from(uploads)
            .where(and(eq(uploads.postId, posts.id), eq(uploads.kind, 'post'))),
        ),
      );
    }
    if (query.hasImage === false) {
      conditions.push(
        sql`not exists (select 1 from "uploads" where "uploads"."post_id" = "posts"."id" and "uploads"."kind" = 'post')`,
      );
    }
    if (query.minLikes !== undefined) conditions.push(gte(posts.likeCount, query.minLikes));
    if (query.bestExcluded === true) conditions.push(eq(posts.bestExcluded, true));
    if (query.bestExcluded === false) conditions.push(eq(posts.bestExcluded, false));
    const where = and(...conditions);
    const db = this.dbService.db;
    const [items, [{ total }]] = await Promise.all([
      db
        .select(adminPostSummaryColumns)
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(where)
        .orderBy(...this.postOrder(query.sort ?? 'latest'))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(where),
    ]);
    return { items, total, page, pageSize, filter: rangeMeta(range) };
  }

  async recent(limit: number) {
    return this.dbService.db
      .select(postSummaryColumns)
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(limit);
  }

  async getSummary(id: number) {
    const [post] = await this.dbService.db
      .select(postSummaryColumns)
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.id, id));
    if (!post) {
      throw new NotFoundException(NOT_FOUND);
    }
    return post;
  }

  async getAdminSummary(id: number) {
    const [post] = await this.dbService.db
      .select(adminPostSummaryColumns)
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.id, id));
    if (!post) {
      throw new NotFoundException(NOT_FOUND);
    }
    return post;
  }

  private readonly recentViews = new Map<string, number>();

  private isNewView(postId: number, viewerKey: string) {
    const now = Date.now();
    if (this.recentViews.size > 10_000) {
      for (const [key, at] of this.recentViews) {
        if (now - at > VIEW_DEDUPE_MS) this.recentViews.delete(key);
      }
    }
    const key = `${postId}:${viewerKey}`;
    const last = this.recentViews.get(key);
    if (last !== undefined && now - last < VIEW_DEDUPE_MS) return false;
    this.recentViews.set(key, now);
    return true;
  }

  async getDetail(
    id: number,
    viewer: AuthUser | undefined,
    viewerKey: string | null,
  ) {
    const db = this.dbService.db;
    const [post] = await db
      .select({
        ...postSummaryColumns,
        body: posts.body,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.id, id));
    if (!post) {
      throw new NotFoundException(NOT_FOUND);
    }
    if (post.status !== 'visible' && !canManage(viewer, post.author.id)) {
      throw new NotFoundException(NOT_FOUND);
    }

    if (viewerKey !== null && this.isNewView(id, viewerKey)) {
      const [updated] = await db
        .update(posts)
        .set({ views: sql`${posts.views} + 1` })
        .where(eq(posts.id, id))
        .returning({ views: posts.views });
      if (updated) {
        post.views = updated.views;
      }
    }

    let commentFilter: SQL | undefined = eq(comments.status, 'visible');
    if (viewer?.role === 'admin') {
      commentFilter = undefined;
    } else if (viewer) {
      commentFilter = or(
        eq(comments.status, 'visible'),
        eq(comments.authorId, viewer.id),
      );
    }

    const mutedIds = viewer ? await this.socialService.mutedIds(viewer.id) : [];
    const muteFilter =
      mutedIds.length > 0 ? notInArray(comments.authorId, mutedIds) : undefined;

    const [match, rows, liked, bookmarked, subscribed] = await Promise.all([
      post.matchId ? this.matchesService.findById(post.matchId) : null,
      db
        .select(commentColumns)
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .where(
          and(
            eq(comments.postId, id),
            or(
              and(isNull(comments.deletedAt), commentFilter, muteFilter),
              isNotNull(comments.deletedAt),
            ),
          ),
        )
        .orderBy(asc(comments.createdAt), asc(comments.id)),
      viewer ? this.hasRow('like', id, viewer.id) : false,
      viewer ? this.hasRow('bookmark', id, viewer.id) : false,
      viewer ? this.socialService.isSubscribed(viewer.id, id) : false,
    ]);

    const parentsWithReplies = new Set(
      rows
        .filter((c) => c.parentId !== null && !c.deleted && c.status === 'visible')
        .map((c) => c.parentId),
    );
    const postComments = rows.filter(
      (c) => !c.deleted || parentsWithReplies.has(c.id),
    );

    const likedCommentIds = new Set<number>();
    if (viewer && postComments.length > 0) {
      const likedRows = await db
        .select({ commentId: commentLikes.commentId })
        .from(commentLikes)
        .where(
          and(
            eq(commentLikes.userId, viewer.id),
            inArray(
              commentLikes.commentId,
              postComments.map((comment) => comment.id),
            ),
          ),
        );
      for (const row of likedRows) {
        likedCommentIds.add(row.commentId);
      }
    }

    const [images, postTeamRows, poll, nav] = await Promise.all([
      this.uploadsService.listByPost(id),
      db
        .select({
          id: teams.id,
          name: teams.name,
          sport: teams.sport,
          leagueId: teams.leagueId,
          active: teams.active,
        })
        .from(postTeams)
        .innerJoin(teams, eq(postTeams.teamId, teams.id))
        .where(eq(postTeams.postId, id)),
      this.pollsService.get(id, viewer),
      this.neighborsAndRelated(post),
    ]);

    return {
      ...post,
      match,
      liked,
      bookmarked,
      subscribed,
      poll,
      images,
      teams: postTeamRows,
      comments: postComments.map((comment) => ({
        ...comment,
        liked: likedCommentIds.has(comment.id),
      })),
      prev: nav.prev,
      next: nav.next,
      related: nav.related,
    };
  }

  private async neighborsAndRelated(post: {
    id: number;
    category: Category;
    tag: string | null;
    matchId: number | null;
    createdAt: Date | string;
  }) {
    const db = this.dbService.db;
    const createdAt = new Date(post.createdAt);
    const visibleSameBoard = and(
      eq(posts.status, 'visible'),
      eq(posts.category, post.category),
    );
    const older = and(
      visibleSameBoard,
      or(
        lt(posts.createdAt, createdAt),
        and(eq(posts.createdAt, createdAt), lt(posts.id, post.id)),
      ),
    );
    const newer = and(
      visibleSameBoard,
      or(
        gt(posts.createdAt, createdAt),
        and(eq(posts.createdAt, createdAt), gt(posts.id, post.id)),
      ),
    );
    const neighborColumns = {
      id: posts.id,
      title: posts.title,
      tag: posts.tag,
    };
    const relatedWhere = [
      eq(posts.status, 'visible'),
      eq(posts.category, post.category),
      ne(posts.id, post.id),
    ];
    const focused = Boolean(post.matchId || post.tag);
    if (post.matchId) relatedWhere.push(eq(posts.matchId, post.matchId));
    else if (post.tag) relatedWhere.push(eq(posts.tag, post.tag));

    const [prevRows, nextRows, relatedRows] = await Promise.all([
      db
        .select(neighborColumns)
        .from(posts)
        .where(older)
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(1),
      db
        .select(neighborColumns)
        .from(posts)
        .where(newer)
        .orderBy(asc(posts.createdAt), asc(posts.id))
        .limit(1),
      db
        .select(postSummaryColumns)
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(and(...relatedWhere))
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(5),
    ]);

    let related = relatedRows;
    if (focused && related.length < 5) {
      const exclude = [post.id, ...related.map((item) => item.id)];
      const extra = await db
        .select(postSummaryColumns)
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(
          and(
            eq(posts.status, 'visible'),
            eq(posts.category, post.category),
            notInArray(posts.id, exclude),
          ),
        )
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(5 - related.length);
      related = [...related, ...extra];
    }

    return {
      prev: prevRows[0] ?? null,
      next: nextRows[0] ?? null,
      related,
    };
  }

  private async hasRow(kind: 'like' | 'bookmark', postId: number, userId: number) {
    const db = this.dbService.db;
    const rows =
      kind === 'like'
        ? await db
            .select({ postId: postLikes.postId })
            .from(postLikes)
            .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
        : await db
            .select({ postId: bookmarks.postId })
            .from(bookmarks)
            .where(and(eq(bookmarks.postId, postId), eq(bookmarks.userId, userId)));
    return rows.length > 0;
  }

  private async resolveTag(
    category: Category,
    tag: string | null | undefined,
  ): Promise<string | null> {
    if (category === 'notice') return null;
    const config = await this.settingsService.getModeration();
    const allowed = tagsForCategory(config, category);
    if (allowed.length === 0 || tag === undefined || tag === null) return null;
    if (!allowed.includes(tag)) {
      throw new BadRequestException('말머리가 올바르지 않습니다.');
    }
    return tag;
  }

  async create(user: AuthUser, dto: CreatePostDto) {
    const matchId = dto.matchId ?? null;
    const category = matchId ? 'match' : dto.category;
    if (category === 'notice' && user.role !== 'admin') {
      throw new ForbiddenException('공지는 관리자만 쓸 수 있습니다.');
    }
    if (matchId) {
      await this.matchesService.get(matchId);
    }
    const tag = await this.resolveTag(category, dto.tag);
    await this.moderationService.assertClean(dto.title, dto.body);
    await this.moderationService.assertCooldown(user, 'post');

    const [post] = await this.dbService.db
      .insert(posts)
      .values({
        category,
        matchId,
        authorId: user.id,
        tag,
        title: dto.title,
        body: dto.body,
        status: await this.initialStatus(user),
      })
      .returning({ id: posts.id });
    if (dto.imageIds?.length) {
      await this.uploadsService.attachToPost(user, post.id, dto.imageIds);
    }
    if (dto.teamIds) {
      await this.setPostTeams(post.id, dto.teamIds);
    }
    if (dto.poll) {
      await this.pollsService.attach(post.id, dto.poll);
    }
    await this.badgesService.recompute(user.id);
    const detail = await this.getDetail(post.id, user, null);
    if (detail.status === 'visible') {
      await this.notifyNewPost(user, detail.id, detail.title, detail.body);
    }
    return detail;
  }

  private async findOwned(id: number, user: AuthUser) {
    const [post] = await this.dbService.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        status: posts.status,
        category: posts.category,
        title: posts.title,
      })
      .from(posts)
      .where(eq(posts.id, id));
    if (!post) {
      throw new NotFoundException(NOT_FOUND);
    }
    if (!canManage(user, post.authorId)) {
      if (post.status !== 'visible') {
        throw new NotFoundException(NOT_FOUND);
      }
      throw new ForbiddenException('본인이 쓴 글만 고치거나 지울 수 있습니다.');
    }
    return post;
  }

  async update(id: number, user: AuthUser, dto: UpdatePostDto) {
    const post = await this.findOwned(id, user);
    const tag =
      dto.tag === undefined ? undefined : await this.resolveTag(post.category, dto.tag);
    await this.moderationService.assertClean(dto.title, dto.body);
    if (dto.title !== undefined || dto.body !== undefined || tag !== undefined) {
      await this.dbService.db
        .update(posts)
        .set({ title: dto.title, body: dto.body, tag, updatedAt: new Date() })
        .where(eq(posts.id, id));
    }
    if (dto.imageIds) {
      await this.uploadsService.attachToPost(user, id, dto.imageIds);
    }
    if (dto.teamIds) {
      await this.setPostTeams(id, dto.teamIds);
    }
    if (dto.poll === null) {
      await this.pollsService.removeIfEmpty(id);
    } else if (dto.poll) {
      await this.pollsService.attach(id, dto.poll);
    }
    return this.getDetail(id, user, null);
  }

  private async setPostTeams(postId: number, teamIds: number[]) {
    const unique = [...new Set(teamIds)];
    if (unique.length > 0) {
      const rows = await this.dbService.db
        .select({ id: teams.id, active: teams.active })
        .from(teams)
        .where(inArray(teams.id, unique));
      if (rows.length !== unique.length || rows.some((row) => !row.active)) {
        throw new BadRequestException('팀 번호가 올바르지 않습니다.');
      }
    }
    await this.dbService.db.delete(postTeams).where(eq(postTeams.postId, postId));
    if (unique.length > 0) {
      await this.dbService.db
        .insert(postTeams)
        .values(unique.map((teamId) => ({ postId, teamId })));
    }
  }

  async remove(id: number, user: AuthUser) {
    const post = await this.findOwned(id, user);
    await this.uploadsService.deleteForPost(id);
    await this.dbService.db.delete(posts).where(eq(posts.id, id));
    await this.badgesService.recompute(post.authorId);
    if (post.authorId !== user.id) {
      await this.auditService.log(user, 'post.delete', 'post', id, post.title);
    }
  }

  private async findLikeable(id: number) {
    const [post] = await this.dbService.db
      .select({ authorId: posts.authorId, likeCount: posts.likeCount })
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.status, 'visible')));
    if (!post) {
      throw new NotFoundException(NOT_FOUND);
    }
    return post;
  }

  async like(id: number, user: AuthUser) {
    const post = await this.findLikeable(id);
    if (post.authorId === user.id) {
      throw new BadRequestException('내 글은 추천할 수 없습니다.');
    }
    return this.dbService.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(postLikes)
        .values({ postId: id, userId: user.id })
        .onConflictDoNothing()
        .returning({ postId: postLikes.postId });
      if (inserted.length === 0) {
        const [row] = await tx
          .select({ likeCount: posts.likeCount })
          .from(posts)
          .where(eq(posts.id, id));
        return { liked: true, likeCount: row?.likeCount ?? post.likeCount };
      }
      const [row] = await tx
        .update(posts)
        .set({ likeCount: sql`${posts.likeCount} + 1` })
        .where(eq(posts.id, id))
        .returning({ likeCount: posts.likeCount });
      return { liked: true, likeCount: row.likeCount };
    }).then(async (result) => {
      await this.badgesService.recompute(post.authorId);
      return result;
    });
  }

  async unlike(id: number, user: AuthUser) {
    const post = await this.findLikeable(id);
    return this.dbService.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(postLikes)
        .where(and(eq(postLikes.postId, id), eq(postLikes.userId, user.id)))
        .returning({ postId: postLikes.postId });
      if (deleted.length === 0) {
        const [row] = await tx
          .select({ likeCount: posts.likeCount })
          .from(posts)
          .where(eq(posts.id, id));
        return { liked: false, likeCount: row?.likeCount ?? post.likeCount };
      }
      const [row] = await tx
        .update(posts)
        .set({ likeCount: sql`greatest(${posts.likeCount} - 1, 0)` })
        .where(eq(posts.id, id))
        .returning({ likeCount: posts.likeCount });
      return { liked: false, likeCount: row.likeCount };
    }).then(async (result) => {
      await this.badgesService.recompute(post.authorId);
      return result;
    });
  }

  async bookmark(id: number, user: AuthUser) {
    await this.findLikeable(id);
    await this.dbService.db
      .insert(bookmarks)
      .values({ userId: user.id, postId: id })
      .onConflictDoNothing();
    return { bookmarked: true };
  }

  async unbookmark(id: number, user: AuthUser) {
    await this.dbService.db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, user.id), eq(bookmarks.postId, id)));
    return { bookmarked: false };
  }

  async adminUpdate(id: number, admin: AuthUser, dto: AdminUpdatePostDto) {
    const before = await this.getAdminSummary(id);
    if (dto.status !== undefined || dto.bestExcluded !== undefined) {
      await this.dbService.db
        .update(posts)
        .set({ status: dto.status, bestExcluded: dto.bestExcluded })
        .where(eq(posts.id, id));
    }
    if (dto.status !== undefined && dto.status !== before.status) {
      await this.auditService.log(
        admin,
        `post.${statusAction(dto.status)}`,
        'post',
        id,
        before.title,
      );
      if (dto.status === 'visible' && before.status !== 'visible') {
        await this.notifyNewPost(
          { id: before.author.id, nickname: before.author.nickname },
          id,
          before.title,
          '',
        );
      }
      await this.badgesService.recompute(before.author.id);
    }
    if (dto.bestExcluded !== undefined && dto.bestExcluded !== before.bestExcluded) {
      await this.auditService.log(
        admin,
        dto.bestExcluded ? 'post.best_exclude' : 'post.best_include',
        'post',
        id,
        before.title,
      );
    }
    return this.getAdminSummary(id);
  }

  async adminRemove(id: number, admin: AuthUser) {
    const [target] = await this.dbService.db
      .select({ authorId: posts.authorId, title: posts.title })
      .from(posts)
      .where(eq(posts.id, id));
    await this.uploadsService.deleteForPost(id);
    const [deleted] = await this.dbService.db
      .delete(posts)
      .where(eq(posts.id, id))
      .returning({ id: posts.id, title: posts.title });
    if (!deleted) {
      throw new NotFoundException(NOT_FOUND);
    }
    if (target) await this.badgesService.recompute(target.authorId);
    await this.auditService.log(admin, 'post.delete', 'post', id, deleted.title);
  }

  private async notifyNewPost(
    author: { id: number; nickname: string },
    postId: number,
    title: string,
    body: string,
  ) {
    const link = `/posts/${postId}`;
    const mentioned = await this.socialService.usersByNicknames(
      extractMentionNicknames(body),
    );
    const mentionedIds = new Set(mentioned.map((item) => item.id));
    const followers = await this.socialService.followerIds(author.id);
    await this.notificationsService.notifyMany(
      followers.filter((id) => !mentionedIds.has(id)),
      'follow',
      quoteTitle(title, `을 ${author.nickname}님이 올렸습니다.`),
      link,
      author.id,
    );
    await this.notificationsService.notifyMany(
      mentioned.map((item) => item.id),
      'mention',
      quoteTitle(title, `에서 ${author.nickname}님이 회원님을 언급했습니다.`),
      link,
      author.id,
    );
  }
}
