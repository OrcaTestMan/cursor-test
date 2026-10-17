import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, ilike, type SQL } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { pageParams } from '../common/pagination.js';
import { likePattern } from '../common/text.js';
import { commentColumns, type ContentStatus } from '../db/columns.js';
import { DbService } from '../db/db.service.js';
import { comments, posts, users } from '../db/schema.js';
import { AdminListCommentsDto, CreateCommentDto } from './dto/post.dto.js';
import { canManage, PostsService } from './posts.service.js';

const NOT_FOUND = '댓글을 찾을 수 없습니다.';

@Injectable()
export class CommentsService {
  constructor(
    private readonly dbService: DbService,
    private readonly postsService: PostsService,
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

  async create(postId: number, user: AuthUser, dto: CreateCommentDto) {
    const [post] = await this.dbService.db
      .select({ authorId: posts.authorId, status: posts.status })
      .from(posts)
      .where(eq(posts.id, postId));
    if (!post || (post.status !== 'visible' && !canManage(user, post.authorId))) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    const [comment] = await this.dbService.db
      .insert(comments)
      .values({
        postId,
        authorId: user.id,
        body: dto.body,
        status: await this.postsService.initialStatus(user),
      })
      .returning({ id: comments.id });
    return this.get(comment.id);
  }

  async remove(id: number, user: AuthUser) {
    const [comment] = await this.dbService.db
      .select({ authorId: comments.authorId, status: comments.status })
      .from(comments)
      .where(eq(comments.id, id));
    if (!comment) {
      throw new NotFoundException(NOT_FOUND);
    }
    if (!canManage(user, comment.authorId)) {
      if (comment.status !== 'visible') {
        throw new NotFoundException(NOT_FOUND);
      }
      throw new ForbiddenException('본인이 쓴 댓글만 지울 수 있습니다.');
    }
    await this.dbService.db.delete(comments).where(eq(comments.id, id));
  }

  async listAdmin(query: AdminListCommentsDto) {
    const { page, pageSize, offset } = pageParams(query);
    const conditions: SQL[] = [];
    if (query.status) {
      conditions.push(eq(comments.status, query.status));
    }
    if (query.q) {
      conditions.push(ilike(comments.body, likePattern(query.q)));
    }
    const where = and(...conditions);
    const db = this.dbService.db;
    const [items, [{ total }]] = await Promise.all([
      db
        .select({ ...commentColumns, postTitle: posts.title })
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .innerJoin(posts, eq(comments.postId, posts.id))
        .where(where)
        .orderBy(desc(comments.createdAt), desc(comments.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(comments).where(where),
    ]);
    return { items, total, page, pageSize };
  }

  async setStatus(id: number, status: ContentStatus) {
    const [updated] = await this.dbService.db
      .update(comments)
      .set({ status })
      .where(eq(comments.id, id))
      .returning({ id: comments.id });
    if (!updated) {
      throw new NotFoundException(NOT_FOUND);
    }
    return this.get(id);
  }

  async adminRemove(id: number) {
    const [deleted] = await this.dbService.db
      .delete(comments)
      .where(eq(comments.id, id))
      .returning({ id: comments.id });
    if (!deleted) {
      throw new NotFoundException(NOT_FOUND);
    }
  }
}
