import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { pageParams, type PaginationQueryDto } from '../common/pagination.js';
import { likePattern } from '../common/text.js';
import {
  commentColumns,
  postSummaryColumns,
  type ContentStatus,
} from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import { comments, posts, users } from '../db/schema.js';
import { MatchesService } from '../matches/matches.service.js';
import { SettingsService } from '../settings/settings.service.js';
import {
  AdminListPostsDto,
  CreatePostDto,
  ListPostsDto,
  UpdatePostDto,
} from './dto/post.dto.js';

const NOT_FOUND = '게시글을 찾을 수 없습니다.';
const VIEW_DEDUPE_MS = 30 * 60 * 1000;

export function canManage(user: AuthUser | undefined, authorId: number) {
  return !!user && (user.role === 'admin' || user.id === authorId);
}

@Injectable()
export class PostsService {
  constructor(
    private readonly dbService: DbService,
    private readonly matchesService: MatchesService,
    private readonly settingsService: SettingsService,
  ) {}

  async initialStatus(user: AuthUser): Promise<ContentStatus> {
    if (user.role === 'admin') {
      return 'visible';
    }
    const settings = await this.settingsService.get();
    return settings.postApprovalRequired ? 'pending' : 'visible';
  }

  private async page(where: SQL | undefined, query: PaginationQueryDto) {
    const { page, pageSize, offset } = pageParams(query);
    const db = this.dbService.db;
    const [items, [{ total }]] = await Promise.all([
      db
        .select(postSummaryColumns)
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(where)
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(posts).where(where),
    ]);
    return { items, total, page, pageSize };
  }

  list(query: ListPostsDto) {
    const conditions: SQL[] = [eq(posts.status, 'visible')];
    if (query.category) {
      conditions.push(eq(posts.category, query.category));
    } else {
      conditions.push(ne(posts.category, 'notice'));
    }
    if (query.matchId) {
      conditions.push(eq(posts.matchId, query.matchId));
    }
    if (query.q) {
      conditions.push(ilike(posts.title, likePattern(query.q)));
    }
    return this.page(and(...conditions), query);
  }

  listMine(user: AuthUser, query: PaginationQueryDto) {
    return this.page(eq(posts.authorId, user.id), query);
  }

  listAdmin(query: AdminListPostsDto) {
    const conditions: SQL[] = [];
    if (query.status) {
      conditions.push(eq(posts.status, query.status));
    }
    if (query.category) {
      conditions.push(eq(posts.category, query.category));
    }
    if (query.q) {
      conditions.push(ilike(posts.title, likePattern(query.q)));
    }
    return this.page(and(...conditions), query);
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

    const [match, postComments] = await Promise.all([
      post.matchId ? this.matchesService.findById(post.matchId) : null,
      db
        .select(commentColumns)
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .where(and(eq(comments.postId, id), commentFilter))
        .orderBy(asc(comments.createdAt), asc(comments.id)),
    ]);

    return { ...post, match, comments: postComments };
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

    const [post] = await this.dbService.db
      .insert(posts)
      .values({
        category,
        matchId,
        authorId: user.id,
        title: dto.title,
        body: dto.body,
        status: await this.initialStatus(user),
      })
      .returning({ id: posts.id });
    return this.getDetail(post.id, user, null);
  }

  private async findOwned(id: number, user: AuthUser) {
    const [post] = await this.dbService.db
      .select({ id: posts.id, authorId: posts.authorId, status: posts.status })
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
    await this.findOwned(id, user);
    if (dto.title !== undefined || dto.body !== undefined) {
      await this.dbService.db
        .update(posts)
        .set({ title: dto.title, body: dto.body, updatedAt: new Date() })
        .where(eq(posts.id, id));
    }
    return this.getDetail(id, user, null);
  }

  async remove(id: number, user: AuthUser) {
    await this.findOwned(id, user);
    await this.dbService.db.delete(posts).where(eq(posts.id, id));
  }

  async setStatus(id: number, status: ContentStatus) {
    const [updated] = await this.dbService.db
      .update(posts)
      .set({ status })
      .where(eq(posts.id, id))
      .returning({ id: posts.id });
    if (!updated) {
      throw new NotFoundException(NOT_FOUND);
    }
    return this.getSummary(id);
  }

  async adminRemove(id: number) {
    const [deleted] = await this.dbService.db
      .delete(posts)
      .where(eq(posts.id, id))
      .returning({ id: posts.id });
    if (!deleted) {
      throw new NotFoundException(NOT_FOUND);
    }
  }
}
