import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, sql, type SQL } from 'drizzle-orm';
import { DbService } from '../db/db.service.js';
import { comments, matches, posts } from '../db/schema.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { ListPostsDto, POST_PAGE_SIZE } from './dto/list-posts.dto.js';

@Injectable()
export class PostsService {
  constructor(private readonly dbService: DbService) {}

  async list(query: ListPostsDto) {
    const page = query.page ?? 1;
    const conditions: SQL[] = [];
    if (query.category) {
      conditions.push(eq(posts.category, query.category));
    }
    if (query.matchId) {
      conditions.push(eq(posts.matchId, query.matchId));
    }
    const where = and(...conditions);

    const commentCount = this.dbService.db
      .select({ postId: comments.postId, total: count().as('total') })
      .from(comments)
      .groupBy(comments.postId)
      .as('comment_count');

    const [items, [{ total }]] = await Promise.all([
      this.dbService.db
        .select({
          id: posts.id,
          category: posts.category,
          matchId: posts.matchId,
          author: posts.author,
          title: posts.title,
          views: posts.views,
          createdAt: posts.createdAt,
          commentCount: sql<number>`coalesce(${commentCount.total}, 0)`.mapWith(
            Number,
          ),
        })
        .from(posts)
        .leftJoin(commentCount, eq(commentCount.postId, posts.id))
        .where(where)
        .orderBy(desc(posts.createdAt), desc(posts.id))
        .limit(POST_PAGE_SIZE)
        .offset((page - 1) * POST_PAGE_SIZE),
      this.dbService.db.select({ total: count() }).from(posts).where(where),
    ]);

    return { items, total, page, pageSize: POST_PAGE_SIZE };
  }

  async get(id: number) {
    const [post] = await this.dbService.db
      .update(posts)
      .set({ views: sql`${posts.views} + 1` })
      .where(eq(posts.id, id))
      .returning();
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    const postComments = await this.dbService.db
      .select()
      .from(comments)
      .where(eq(comments.postId, id))
      .orderBy(asc(comments.createdAt), asc(comments.id));

    return { ...post, comments: postComments };
  }

  async create(dto: CreatePostDto) {
    if (dto.matchId) {
      const [match] = await this.dbService.db
        .select({ id: matches.id })
        .from(matches)
        .where(eq(matches.id, dto.matchId));
      if (!match) {
        throw new NotFoundException('경기를 찾을 수 없습니다.');
      }
    }

    const [post] = await this.dbService.db
      .insert(posts)
      .values({
        category: dto.matchId ? 'match' : dto.category,
        matchId: dto.matchId,
        author: dto.author,
        title: dto.title,
        body: dto.body,
      })
      .returning();
    return post;
  }

  async remove(id: number) {
    const [deleted] = await this.dbService.db
      .delete(posts)
      .where(eq(posts.id, id))
      .returning({ id: posts.id });
    if (!deleted) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
  }

  async addComment(postId: number, dto: CreateCommentDto) {
    const [post] = await this.dbService.db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, postId));
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }

    const [comment] = await this.dbService.db
      .insert(comments)
      .values({ postId, author: dto.author, body: dto.body })
      .returning();
    return comment;
  }
}
