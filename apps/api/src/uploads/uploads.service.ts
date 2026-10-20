import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { and, count, eq, inArray, isNull, lt } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { DbService } from '../db/db.service.js';
import { posts, uploads, users } from '../db/schema.js';
import {
  extensionOf,
  MAX_IMAGE_BYTES,
  MAX_POST_IMAGES,
  sniffImageMime,
} from './file-type.js';

const NOT_FOUND = '파일을 찾을 수 없습니다.';
const NOT_IMAGE = 'JPEG, PNG, WebP, GIF만 올릴 수 있습니다.';
const TOO_BIG = '파일은 5MB까지 올릴 수 있습니다.';
const TOO_MANY = `이미지는 글 하나당 ${MAX_POST_IMAGES}장까지 올릴 수 있습니다.`;

export type UploadView = {
  id: number;
  url: string;
  mime: string;
  size: number;
  originalName: string;
  sortOrder: number;
};

@Injectable()
export class UploadsService {
  constructor(private readonly dbService: DbService) {}

  dir() {
    return resolve(process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'));
  }

  urlOf(id: number) {
    return `/api/files/${id}`;
  }

  toView(row: {
    id: number;
    mime: string;
    size: number;
    originalName: string;
    sortOrder: number;
  }): UploadView {
    return {
      id: row.id,
      url: this.urlOf(row.id),
      mime: row.mime,
      size: row.size,
      originalName: row.originalName,
      sortOrder: row.sortOrder,
    };
  }

  private pathOf(storedName: string) {
    return join(this.dir(), storedName);
  }

  async save(user: AuthUser, file: Express.Multer.File | undefined, kind: 'post' | 'avatar') {
    if (!file?.buffer?.length) {
      throw new BadRequestException('파일을 선택해 주세요.');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new BadRequestException(TOO_BIG);
    }
    const mime = sniffImageMime(file.buffer);
    if (!mime) {
      throw new BadRequestException(NOT_IMAGE);
    }
    if (kind === 'post') {
      await this.cleanupOrphans(user.id);
      await this.assertPostQuota(user.id, null);
    }

    await mkdir(this.dir(), { recursive: true });
    const storedName = `${randomUUID()}${extensionOf(mime)}`;
    const fullPath = this.pathOf(storedName);
    await writeFile(fullPath, file.buffer);

    try {
      const [row] = await this.dbService.db
        .insert(uploads)
        .values({
          userId: user.id,
          kind,
          storedName,
          originalName: file.originalname?.slice(0, 200) || `image${extensionOf(mime)}`,
          mime,
          size: file.size,
        })
        .returning();
      if (kind === 'avatar') {
        await this.replaceAvatar(user.id, row.id);
      }
      return this.toView(row);
    } catch (err) {
      await unlink(fullPath).catch(() => undefined);
      throw err;
    }
  }

  private async replaceAvatar(userId: number, nextId: number) {
    const [current] = await this.dbService.db
      .select({ avatarUploadId: users.avatarUploadId })
      .from(users)
      .where(eq(users.id, userId));
    const previousId = current?.avatarUploadId;
    await this.dbService.db
      .update(users)
      .set({ avatarUploadId: nextId })
      .where(eq(users.id, userId));
    if (previousId && previousId !== nextId) {
      await this.deleteFileRow(previousId);
    }
  }

  private async assertPostQuota(userId: number, postId: number | null) {
    const conditions = [
      eq(uploads.userId, userId),
      eq(uploads.kind, 'post'),
      postId === null
        ? isNull(uploads.postId)
        : eq(uploads.postId, postId),
    ];
    const [{ total }] = await this.dbService.db
      .select({ total: count() })
      .from(uploads)
      .where(and(...conditions));
    if (Number(total) >= MAX_POST_IMAGES) {
      throw new BadRequestException(TOO_MANY);
    }
  }

  async listByPost(postId: number) {
    const rows = await this.dbService.db
      .select()
      .from(uploads)
      .where(and(eq(uploads.postId, postId), eq(uploads.kind, 'post')))
      .orderBy(uploads.sortOrder, uploads.id);
    return rows.map((row) => this.toView(row));
  }

  async attachToPost(user: AuthUser, postId: number, imageIds: number[]) {
    if (imageIds.length > MAX_POST_IMAGES) {
      throw new BadRequestException(TOO_MANY);
    }
    const unique = [...new Set(imageIds)];
    if (unique.length !== imageIds.length) {
      throw new BadRequestException('같은 이미지가 두 번 들어 있습니다.');
    }

    const [post] = await this.dbService.db
      .select({ id: posts.id, authorId: posts.authorId })
      .from(posts)
      .where(eq(posts.id, postId));
    if (!post) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    if (post.authorId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('작성자와 관리자만 이미지를 바꿀 수 있습니다.');
    }

    if (unique.length > 0) {
      const rows = await this.dbService.db
        .select({
          id: uploads.id,
          userId: uploads.userId,
          kind: uploads.kind,
          postId: uploads.postId,
        })
        .from(uploads)
        .where(inArray(uploads.id, unique));
      if (rows.length !== unique.length) {
        throw new BadRequestException('이미지 번호가 올바르지 않습니다.');
      }
      for (const row of rows) {
        if (row.kind !== 'post') {
          throw new BadRequestException('글에 붙일 수 있는 이미지가 아닙니다.');
        }
        if (row.userId !== post.authorId) {
          throw new ForbiddenException('다른 회원의 이미지는 쓸 수 없습니다.');
        }
        if (row.postId !== null && row.postId !== postId) {
          throw new BadRequestException('이미 다른 글에 붙은 이미지입니다.');
        }
      }
    }

    const attached = await this.dbService.db
      .select({ id: uploads.id })
      .from(uploads)
      .where(and(eq(uploads.postId, postId), eq(uploads.kind, 'post')));
    const keep = new Set(unique);
    for (const row of attached) {
      if (!keep.has(row.id)) {
        await this.deleteFileRow(row.id);
      }
    }
    for (const [index, id] of unique.entries()) {
      await this.dbService.db
        .update(uploads)
        .set({ postId, sortOrder: index })
        .where(eq(uploads.id, id));
    }
    return this.listByPost(postId);
  }

  async removeOwn(user: AuthUser, id: number) {
    const [row] = await this.dbService.db
      .select()
      .from(uploads)
      .where(eq(uploads.id, id));
    if (!row) {
      throw new NotFoundException(NOT_FOUND);
    }
    if (row.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('본인이 올린 파일만 지울 수 있습니다.');
    }
    if (row.kind === 'avatar') {
      await this.dbService.db
        .update(users)
        .set({ avatarUploadId: null })
        .where(and(eq(users.id, row.userId), eq(users.avatarUploadId, id)));
    }
    await this.deleteFileRow(id);
  }

  async open(id: number) {
    const [row] = await this.dbService.db
      .select()
      .from(uploads)
      .where(eq(uploads.id, id));
    if (!row) {
      throw new NotFoundException(NOT_FOUND);
    }
    const path = this.pathOf(row.storedName);
    if (!existsSync(path)) {
      throw new NotFoundException(NOT_FOUND);
    }
    return { row, stream: createReadStream(path) };
  }

  async deleteForPost(postId: number) {
    const rows = await this.dbService.db
      .select({ id: uploads.id })
      .from(uploads)
      .where(eq(uploads.postId, postId));
    for (const row of rows) {
      await this.deleteFileRow(row.id);
    }
  }

  async cleanupOrphans(userId: number) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await this.dbService.db
      .select({ id: uploads.id })
      .from(uploads)
      .where(
        and(
          eq(uploads.userId, userId),
          eq(uploads.kind, 'post'),
          isNull(uploads.postId),
          lt(uploads.createdAt, cutoff),
        ),
      );
    for (const row of rows) {
      await this.deleteFileRow(row.id);
    }
  }

  private async deleteFileRow(id: number) {
    const [row] = await this.dbService.db
      .select({ storedName: uploads.storedName })
      .from(uploads)
      .where(eq(uploads.id, id));
    if (!row) return;
    await this.dbService.db.delete(uploads).where(eq(uploads.id, id));
    await unlink(this.pathOf(row.storedName)).catch(() => undefined);
  }
}
