import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, gte, ilike, isNull, sql, type SQL } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js';
import { pageParams } from '../common/pagination.js';
import { extractMentionNicknames } from '../common/mention.js';
import { andTokens, anyField, idFromToken, searchTokens, tokenPattern } from '../common/search-query.js';
import {
  adminCommentColumns,
  authorColumns,
  commentColumns,
  type ContentStatus,
} from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import { commentLikes, comments, posts, users } from '../db/schema.js';
import { AuditService } from '../moderation/audit.service.js';
import { ModerationService } from '../moderation/moderation.service.js';
import {
  NotificationsService,
  quoteTitle,
} from '../notifications/notifications.service.js';
import { SocialService } from '../social/social.service.js';
import { AdminListCommentsDto, CreateCommentDto } from './dto/post.dto.js';
import { canManage, PostsService, statusAction } from './posts.service.js';

const NOT_FOUND = '댓글을 찾을 수 없습니다.';
const REPLY_DEPTH = '답글에는 답글을 달 수 없습니다.';

@Injectable()
export class CommentsService {
  constructor(
    private readonly dbService: DbService,
    private readonly postsService: PostsService,
    private readonly moderationService: ModerationService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly socialService: SocialService,
  ) {}

  private async get(id: number) {
    const [comment] = await this.dbService.db
      .select(commentColumns)
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .where(eq(comments.id, id));
    if (!comment) {
      throw new NotFoundException(NOT_FOUND);
    }
    return comment;
  }

  private async findParent(postId: number, parentId: number) {
    const [parent] = await this.dbService.db
      .select({
        postId: comments.postId,
        parentId: comments.parentId,
        authorId: comments.authorId,
        status: comments.status,
        deletedAt: comments.deletedAt,
      })
      .from(comments)
      .where(eq(comments.id, parentId));
    if (
      !parent ||
      parent.postId !== postId ||
      parent.status !== 'visible' ||
      parent.deletedAt !== null ||
      parent.parentId !== null
    ) {
      throw new BadRequestException(REPLY_DEPTH);
    }
    return parent;
  }

  async create(postId: number, user: AuthUser, dto: CreateCommentDto) {
    const [post] = await this.dbService.db
      .select({ authorId: posts.authorId, status: posts.status, title: posts.title })
      .from(posts)
      .where(eq(posts.id, postId));
    if (!post || (post.status !== 'visible' && !canManage(user, post.authorId))) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    const parentId = dto.parentId ?? null;
    const parent = parentId === null ? null : await this.findParent(postId, parentId);
    await this.moderationService.assertClean(dto.body);
    await this.moderationService.assertCooldown(user, 'comment');

    const status = await this.postsService.initialStatus(user);
    const [comment] = await this.dbService.db
      .insert(comments)
      .values({ postId, parentId, authorId: user.id, body: dto.body, status })
      .returning({ id: comments.id });

    if (status === 'visible') {
      await this.notifyNewComment(
        user,
        postId,
        post.title,
        post.authorId,
        comment.id,
        dto.body,
        parent?.authorId ?? null,
      );
    }
    await this.socialService.subscribe(user, postId);
    return this.get(comment.id);
  }

  private async notifyNewComment(
    user: { id: number; nickname: string },
    postId: number,
    title: string,
    postAuthorId: number,
    commentId: number,
    body: string,
    parentAuthorId: number | null,
  ) {
    const link = `/posts/${postId}#comment-${commentId}`;
    const skip = new Set<number>([user.id]);
    if (parentAuthorId !== null) {
      await this.notificationsService.notify(
        parentAuthorId,
        'reply',
        quoteTitle(title, `의 내 댓글에 ${user.nickname}님이 답글을 남겼습니다.`),
        link,
        user.id,
      );
      skip.add(parentAuthorId);
    }
    if (parentAuthorId === null || parentAuthorId !== postAuthorId) {
      await this.notificationsService.notify(
        postAuthorId,
        'comment',
        quoteTitle(title, `에 ${user.nickname}님이 댓글을 남겼습니다.`),
        link,
        user.id,
      );
      skip.add(postAuthorId);
    }
    const mentioned = await this.socialService.usersByNicknames(
      extractMentionNicknames(body),
    );
    const mentionIds = mentioned
      .map((item) => item.id)
      .filter((id) => !skip.has(id));
    await this.notificationsService.notifyMany(
      mentionIds,
      'mention',
      quoteTitle(title, `에서 ${user.nickname}님이 회원님을 언급했습니다.`),
      link,
      user.id,
    );
    for (const id of mentionIds) skip.add(id);
    const subscribers = await this.socialService.subscriberIds(postId);
    await this.notificationsService.notifyMany(
      subscribers.filter((id) => !skip.has(id)),
      'subscribe',
      quoteTitle(title, `에 ${user.nickname}님이 댓글을 남겼습니다.`),
      link,
      user.id,
    );
  }

  async remove(id: number, user: AuthUser) {
    const [comment] = await this.dbService.db
      .select({ authorId: comments.authorId, status: comments.status })
      .from(comments)
      .where(and(eq(comments.id, id), isNull(comments.deletedAt)));
    if (!comment) {
      throw new NotFoundException(NOT_FOUND);
    }
    if (!canManage(user, comment.authorId)) {
      if (comment.status !== 'visible') {
        throw new NotFoundException(NOT_FOUND);
      }
      throw new ForbiddenException('본인이 쓴 댓글만 지울 수 있습니다.');
    }
    await this.softDelete(id);
    if (comment.authorId !== user.id) {
      await this.auditService.log(user, 'comment.delete', 'comment', id);
    }
  }

  private async softDelete(id: number) {
    return this.dbService.db
      .update(comments)
      .set({ deletedAt: new Date() })
      .where(and(eq(comments.id, id), isNull(comments.deletedAt)))
      .returning({ id: comments.id });
  }

  async listAdmin(query: AdminListCommentsDto) {
    const { page, pageSize, offset } = pageParams(query);
    const range = resolveDateRange(query);
    const conditions: SQL[] = [];
    const bounded = dateCondition(comments.createdAt, range);
    if (bounded) conditions.push(bounded);
    if (query.status) {
      conditions.push(eq(comments.status, query.status));
    }
    conditions.push(
      ...andTokens(searchTokens(query.q), (token) => {
        const pattern = tokenPattern(token);
        const id = idFromToken(token);
        return anyField([
          ilike(comments.body, pattern),
          ilike(users.nickname, pattern),
          ilike(posts.title, pattern),
          id ? eq(comments.id, id) : undefined,
        ]);
      }),
    );
    if (query.authorId) conditions.push(eq(comments.authorId, query.authorId));
    if (query.postId) conditions.push(eq(comments.postId, query.postId));
    if (query.reply === true) conditions.push(sql`${comments.parentId} is not null`);
    if (query.reply === false) conditions.push(isNull(comments.parentId));
    if (query.deleted === true) conditions.push(sql`${comments.deletedAt} is not null`);
    if (query.deleted === false) conditions.push(isNull(comments.deletedAt));
    const where = and(...conditions);
    const db = this.dbService.db;
    const [items, [{ total }]] = await Promise.all([
      db
        .select(adminCommentColumns)
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .innerJoin(posts, eq(comments.postId, posts.id))
        .where(where)
        .orderBy(desc(comments.createdAt), desc(comments.id))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ total: count() })
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .innerJoin(posts, eq(comments.postId, posts.id))
        .where(where),
    ]);
    return { items, total, page, pageSize, filter: rangeMeta(range) };
  }

  async setStatus(id: number, admin: AuthUser, status: ContentStatus) {
    const [before] = await this.dbService.db
      .select({ status: comments.status })
      .from(comments)
      .where(eq(comments.id, id));
    if (!before) {
      throw new NotFoundException(NOT_FOUND);
    }
    await this.dbService.db
      .update(comments)
      .set({ status })
      .where(eq(comments.id, id));
    if (before.status !== status) {
      await this.auditService.log(
        admin,
        `comment.${statusAction(status)}`,
        'comment',
        id,
      );
    }
    if (before.status !== 'visible' && status === 'visible') {
      const [row] = await this.dbService.db
        .select({
          postId: comments.postId,
          parentId: comments.parentId,
          authorId: comments.authorId,
          body: comments.body,
          title: posts.title,
          postAuthorId: posts.authorId,
          nickname: users.nickname,
        })
        .from(comments)
        .innerJoin(posts, eq(comments.postId, posts.id))
        .innerJoin(users, eq(comments.authorId, users.id))
        .where(eq(comments.id, id));
      if (row) {
        let parentAuthorId: number | null = null;
        if (row.parentId) {
          const [parent] = await this.dbService.db
            .select({ authorId: comments.authorId })
            .from(comments)
            .where(eq(comments.id, row.parentId));
          parentAuthorId = parent?.authorId ?? null;
        }
        await this.notifyNewComment(
          { id: row.authorId, nickname: row.nickname },
          row.postId,
          row.title,
          row.postAuthorId,
          id,
          row.body,
          parentAuthorId,
        );
      }
    }
    return this.get(id);
  }

  async listHot() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const items = await this.dbService.db
      .select({
        id: comments.id,
        postId: comments.postId,
        postTitle: posts.title,
        author: authorColumns,
        body: comments.body,
        likeCount: comments.likeCount,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .innerJoin(users, eq(comments.authorId, users.id))
      .innerJoin(posts, eq(comments.postId, posts.id))
      .where(
        and(
          eq(comments.status, 'visible'),
          isNull(comments.deletedAt),
          eq(posts.status, 'visible'),
          gte(comments.createdAt, since),
        ),
      )
      .orderBy(desc(comments.likeCount), desc(comments.createdAt), desc(comments.id))
      .limit(10);
    return { items };
  }

  private async findLikeable(id: number) {
    const [comment] = await this.dbService.db
      .select({
        authorId: comments.authorId,
        likeCount: comments.likeCount,
        deletedAt: comments.deletedAt,
        status: comments.status,
      })
      .from(comments)
      .where(eq(comments.id, id));
    if (!comment || comment.deletedAt !== null || comment.status !== 'visible') {
      throw new NotFoundException(NOT_FOUND);
    }
    return comment;
  }

  async like(id: number, user: AuthUser) {
    const comment = await this.findLikeable(id);
    if (comment.authorId === user.id) {
      throw new BadRequestException('내 댓글은 추천할 수 없습니다.');
    }
    return this.dbService.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(commentLikes)
        .values({ commentId: id, userId: user.id })
        .onConflictDoNothing()
        .returning({ commentId: commentLikes.commentId });
      if (inserted.length === 0) {
        const [row] = await tx
          .select({ likeCount: comments.likeCount })
          .from(comments)
          .where(eq(comments.id, id));
        return { liked: true, likeCount: row?.likeCount ?? comment.likeCount };
      }
      const [row] = await tx
        .update(comments)
        .set({ likeCount: sql`${comments.likeCount} + 1` })
        .where(eq(comments.id, id))
        .returning({ likeCount: comments.likeCount });
      return { liked: true, likeCount: row.likeCount };
    });
  }

  async unlike(id: number, user: AuthUser) {
    const comment = await this.findLikeable(id);
    return this.dbService.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(commentLikes)
        .where(
          and(eq(commentLikes.commentId, id), eq(commentLikes.userId, user.id)),
        )
        .returning({ commentId: commentLikes.commentId });
      if (deleted.length === 0) {
        const [row] = await tx
          .select({ likeCount: comments.likeCount })
          .from(comments)
          .where(eq(comments.id, id));
        return { liked: false, likeCount: row?.likeCount ?? comment.likeCount };
      }
      const [row] = await tx
        .update(comments)
        .set({ likeCount: sql`greatest(${comments.likeCount} - 1, 0)` })
        .where(eq(comments.id, id))
        .returning({ likeCount: comments.likeCount });
      return { liked: false, likeCount: row.likeCount };
    });
  }

  async adminRemove(id: number, admin: AuthUser) {
    const [exists] = await this.dbService.db
      .select({ id: comments.id })
      .from(comments)
      .where(eq(comments.id, id));
    if (!exists) {
      throw new NotFoundException(NOT_FOUND);
    }
    await this.softDelete(id);
    await this.auditService.log(admin, 'comment.delete', 'comment', id);
  }
}
