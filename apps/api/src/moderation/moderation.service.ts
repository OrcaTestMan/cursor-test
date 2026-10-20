import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, type SQL } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { dateCondition, rangeMeta, resolveDateRange } from '../common/date-range.js';
import { pageParams } from '../common/pagination.js';
import { andTokens, anyField, searchTokens, tokenPattern } from '../common/search-query.js';
import { DbService } from '../db/db.service.js';
import { comments, forbiddenWords, posts } from '../db/schema.js';
import { SettingsService } from '../settings/settings.service.js';
import { AuditService } from './audit.service.js';
import {
  AdminListForbiddenWordsDto,
  CreateForbiddenWordDto,
} from './dto/moderation.dto.js';

const WORDS_CACHE_MS = 30_000;

export type WriteKind = 'post' | 'comment';

@Injectable()
export class ModerationService {
  private words: string[] = [];
  private wordsLoadedAt = 0;

  constructor(
    private readonly dbService: DbService,
    private readonly settingsService: SettingsService,
    private readonly auditService: AuditService,
  ) {}

  invalidateWords() {
    this.wordsLoadedAt = 0;
  }

  private async loadWords() {
    if (Date.now() - this.wordsLoadedAt < WORDS_CACHE_MS) return this.words;
    const rows = await this.dbService.db
      .select({ word: forbiddenWords.word })
      .from(forbiddenWords);
    this.words = rows.map((r) => r.word.toLowerCase()).filter(Boolean);
    this.wordsLoadedAt = Date.now();
    return this.words;
  }

  async findForbidden(...texts: (string | null | undefined)[]) {
    const words = await this.loadWords();
    if (words.length === 0) return null;
    const haystack = texts
      .filter((t): t is string => !!t)
      .join('\n')
      .toLowerCase()
      .replace(/\s+/g, '');
    return words.find((w) => haystack.includes(w.replace(/\s+/g, ''))) ?? null;
  }

  /** 금칙어가 있으면 400. 관리자도 검사한다. */
  async assertClean(...texts: (string | null | undefined)[]) {
    const word = await this.findForbidden(...texts);
    if (word) {
      throw new BadRequestException(`사용할 수 없는 단어가 포함되어 있습니다: "${word}"`);
    }
  }

  /** 마지막 글·댓글 작성 후 설정한 시간이 지나지 않았으면 429. 관리자는 건너뛴다. */
  async assertCooldown(user: AuthUser, kind: WriteKind) {
    if (user.role === 'admin') return;
    const config = await this.settingsService.getModeration();
    const seconds = kind === 'post' ? config.postCooldownSec : config.commentCooldownSec;
    if (seconds <= 0) return;

    const table = kind === 'post' ? posts : comments;
    const [last] = await this.dbService.db
      .select({ createdAt: table.createdAt })
      .from(table)
      .where(eq(table.authorId, user.id))
      .orderBy(desc(table.createdAt))
      .limit(1);
    if (!last) return;

    const remaining = Math.ceil(
      (last.createdAt.getTime() + seconds * 1000 - Date.now()) / 1000,
    );
    if (remaining > 0) {
      throw new HttpException(
        `${remaining}초 뒤에 다시 쓸 수 있습니다.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async listWords(query: AdminListForbiddenWordsDto) {
    const { page, pageSize, offset } = pageParams(query);
    const range = resolveDateRange(query);
    const conditions: SQL[] = [];
    const bounded = dateCondition(forbiddenWords.createdAt, range);
    if (bounded) conditions.push(bounded);
    conditions.push(
      ...andTokens(searchTokens(query.q), (token) => {
        const pattern = tokenPattern(token);
        return anyField([ilike(forbiddenWords.word, pattern)]);
      }),
    );
    const where = and(...conditions);
    const db = this.dbService.db;
    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          id: forbiddenWords.id,
          word: forbiddenWords.word,
          createdAt: forbiddenWords.createdAt,
        })
        .from(forbiddenWords)
        .where(where)
        .orderBy(asc(forbiddenWords.word), asc(forbiddenWords.id))
        .limit(pageSize)
        .offset(offset),
      db.select({ total: count() }).from(forbiddenWords).where(where),
    ]);
    return { items, total, page, pageSize, filter: rangeMeta(range) };
  }

  async createWord(admin: AuthUser, dto: CreateForbiddenWordDto) {
    const [created] = await this.dbService.db
      .insert(forbiddenWords)
      .values({ word: dto.word })
      .onConflictDoNothing()
      .returning({
        id: forbiddenWords.id,
        word: forbiddenWords.word,
        createdAt: forbiddenWords.createdAt,
      });
    if (!created) {
      throw new ConflictException('이미 등록된 금칙어입니다.');
    }
    this.invalidateWords();
    await this.auditService.log(admin, 'word.create', 'word', created.id, created.word);
    return created;
  }

  async removeWord(admin: AuthUser, id: number) {
    const [deleted] = await this.dbService.db
      .delete(forbiddenWords)
      .where(eq(forbiddenWords.id, id))
      .returning({ id: forbiddenWords.id, word: forbiddenWords.word });
    if (!deleted) {
      throw new NotFoundException('금칙어를 찾을 수 없습니다.');
    }
    this.invalidateWords();
    await this.auditService.log(admin, 'word.delete', 'word', id, deleted.word);
  }
}
