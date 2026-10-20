import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import type { AuthUser } from '../auth/auth.types.js';
import { DbService } from '../db/db.service.js';
import {
  postPollOptions,
  postPolls,
  postPollVotes,
  posts,
} from '../db/schema.js';

const NOT_FOUND = '투표를 찾을 수 없습니다.';
const CLOSED = '마감된 투표입니다.';
const OPTIONS_LOCKED = '표가 있는 투표는 선택지를 바꿀 수 없습니다.';
const OPTION_RANGE = '선택지는 2~10개여야 합니다.';
const OPTION_LABEL = '선택지는 1~40자로 입력해 주세요.';
const PAST = '마감 시각은 현재 이후여야 합니다.';

export type PollInput = {
  options: string[];
  closesAt: string;
};

@Injectable()
export class PollsService {
  constructor(private readonly dbService: DbService) {}

  normalize(input: PollInput) {
    const options = input.options.map((item) => item.trim()).filter(Boolean);
    if (options.length < 2 || options.length > 10) {
      throw new BadRequestException(OPTION_RANGE);
    }
    if (options.some((item) => item.length > 40)) {
      throw new BadRequestException(OPTION_LABEL);
    }
    const closesAt = new Date(input.closesAt);
    if (Number.isNaN(closesAt.getTime())) {
      throw new BadRequestException('마감 시각이 올바르지 않습니다.');
    }
    return { options, closesAt };
  }

  async attach(postId: number, input: PollInput, allowPast = false) {
    const { options, closesAt } = this.normalize(input);
    if (!allowPast && closesAt.getTime() <= Date.now()) {
      throw new BadRequestException(PAST);
    }
    const votes = await this.voteCount(postId);
    if (votes > 0) {
      throw new BadRequestException(OPTIONS_LOCKED);
    }
    await this.dbService.db.transaction(async (tx) => {
      await tx.delete(postPolls).where(eq(postPolls.postId, postId));
      await tx.insert(postPolls).values({ postId, closesAt });
      await tx.insert(postPollOptions).values(
        options.map((label, sortOrder) => ({ postId, label, sortOrder })),
      );
    });
  }

  async removeIfEmpty(postId: number) {
    const votes = await this.voteCount(postId);
    if (votes > 0) {
      throw new BadRequestException('표가 있는 투표는 지울 수 없습니다.');
    }
    await this.dbService.db.delete(postPolls).where(eq(postPolls.postId, postId));
  }

  private async voteCount(postId: number) {
    const [row] = await this.dbService.db
      .select({ total: count() })
      .from(postPollVotes)
      .where(eq(postPollVotes.postId, postId));
    return Number(row?.total ?? 0);
  }

  async get(postId: number, viewer?: AuthUser) {
    const [poll] = await this.dbService.db
      .select()
      .from(postPolls)
      .where(eq(postPolls.postId, postId));
    if (!poll) return null;
    const [options, voteRows, mine] = await Promise.all([
      this.dbService.db
        .select()
        .from(postPollOptions)
        .where(eq(postPollOptions.postId, postId))
        .orderBy(postPollOptions.sortOrder, postPollOptions.id),
      this.dbService.db
        .select({
          optionId: postPollVotes.optionId,
          total: count(),
        })
        .from(postPollVotes)
        .where(eq(postPollVotes.postId, postId))
        .groupBy(postPollVotes.optionId),
      viewer
        ? this.dbService.db
            .select({ optionId: postPollVotes.optionId })
            .from(postPollVotes)
            .where(
              and(
                eq(postPollVotes.postId, postId),
                eq(postPollVotes.userId, viewer.id),
              ),
            )
        : Promise.resolve([] as { optionId: number }[]),
    ]);
    const counts = new Map(voteRows.map((row) => [row.optionId, Number(row.total)]));
    const totalVotes = [...counts.values()].reduce((sum, n) => sum + n, 0);
    return {
      closesAt: poll.closesAt,
      closed: poll.closesAt.getTime() <= Date.now(),
      totalVotes,
      myOptionId: mine[0]?.optionId ?? null,
      options: options.map((option) => {
        const votes = counts.get(option.id) ?? 0;
        return {
          id: option.id,
          label: option.label,
          sortOrder: option.sortOrder,
          votes,
          percent: totalVotes === 0 ? 0 : Math.round((votes * 100) / totalVotes),
        };
      }),
    };
  }

  async vote(postId: number, user: AuthUser, optionId: number) {
    const poll = await this.get(postId, user);
    if (!poll) throw new NotFoundException(NOT_FOUND);
    if (poll.closed) throw new BadRequestException(CLOSED);
    if (!poll.options.some((option) => option.id === optionId)) {
      throw new BadRequestException('선택지가 올바르지 않습니다.');
    }
    await this.dbService.db
      .insert(postPollVotes)
      .values({
        postId,
        userId: user.id,
        optionId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [postPollVotes.postId, postPollVotes.userId],
        set: { optionId, updatedAt: new Date() },
      });
    return this.get(postId, user);
  }

  async listOpen(limit = 5, teamId?: number) {
    const now = new Date();
    const rows = await this.dbService.db
      .select({
        postId: posts.id,
        title: posts.title,
        closesAt: postPolls.closesAt,
        totalVotes: sql<number>`(select count(*)::int from "post_poll_votes" where "post_poll_votes"."post_id" = "posts"."id")`.mapWith(
          Number,
        ),
      })
      .from(postPolls)
      .innerJoin(posts, eq(postPolls.postId, posts.id))
      .where(
        and(
          eq(posts.status, 'visible'),
          gt(postPolls.closesAt, now),
          ...(teamId
            ? [
                sql`exists (select 1 from "post_teams" where "post_teams"."post_id" = "posts"."id" and "post_teams"."team_id" = ${teamId})`,
              ]
            : []),
        ),
      )
      .orderBy(
        desc(
          sql`(select count(*) from "post_poll_votes" where "post_poll_votes"."post_id" = "posts"."id")`,
        ),
        desc(postPolls.closesAt),
      )
      .limit(limit);
    const ids = rows.map((row) => row.postId);
    const options =
      ids.length === 0
        ? []
        : await this.dbService.db
            .select()
            .from(postPollOptions)
            .where(inArray(postPollOptions.postId, ids))
            .orderBy(postPollOptions.sortOrder, postPollOptions.id);
    const byPost = new Map<number, { id: number; label: string }[]>();
    for (const option of options) {
      const list = byPost.get(option.postId) ?? [];
      list.push({ id: option.id, label: option.label });
      byPost.set(option.postId, list);
    }
    return {
      items: rows.map((row) => ({
        postId: row.postId,
        title: row.title,
        closesAt: row.closesAt,
        totalVotes: row.totalVotes,
        options: byPost.get(row.postId) ?? [],
      })),
    };
  }
}
