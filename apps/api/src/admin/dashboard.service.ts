import { Injectable } from '@nestjs/common';
import { and, count, eq, gt, gte, lt, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { kstDayRange, kstToday } from '../common/kst.js';
import { DbService } from '../db/db.service.js';
import { comments, inquiries, matchMessages, matches, postPolls, posts, reports, users } from '../db/schema.js';
import { InquiriesService } from '../inquiries/inquiries.service.js';
import { PostsService } from '../posts/posts.service.js';
import { UsersService } from '../users/users.service.js';

const RECENT_LIMIT = 5;

@Injectable()
export class DashboardService {
  constructor(
    private readonly dbService: DbService,
    private readonly postsService: PostsService,
    private readonly inquiriesService: InquiriesService,
    private readonly usersService: UsersService,
  ) {}

  private async count(table: PgTable, where?: SQL) {
    const [{ total }] = await this.dbService.db
      .select({ total: count() })
      .from(table)
      .where(where);
    return total;
  }

  /** 처리 대기 신고가 있는 대상(글·댓글) 수 */
  private async pendingReportTargets() {
    const [{ total }] = await this.dbService.db
      .select({
        total: sql<number>`count(distinct (${reports.targetType}, ${reports.targetId}))::int`.mapWith(
          Number,
        ),
      })
      .from(reports)
      .where(eq(reports.status, 'pending'));
    return total;
  }

  async get() {
    const { start, end } = kstDayRange(kstToday());
    const [
      usersTotal,
      todaySignups,
      blocked,
      postsToday,
      postsPending,
      commentsToday,
      commentsPending,
      inquiriesWaiting,
      reportsPending,
      matchesToday,
      matchesLive,
      chatToday,
      openPolls,
      recentPosts,
      recentInquiries,
      recentUsers,
    ] = await Promise.all([
      this.count(users),
      this.count(
        users,
        and(gte(users.createdAt, start), lt(users.createdAt, end)),
      ),
      this.count(users, eq(users.status, 'blocked')),
      this.count(
        posts,
        and(gte(posts.createdAt, start), lt(posts.createdAt, end)),
      ),
      this.count(posts, eq(posts.status, 'pending')),
      this.count(
        comments,
        and(gte(comments.createdAt, start), lt(comments.createdAt, end)),
      ),
      this.count(comments, eq(comments.status, 'pending')),
      this.count(inquiries, eq(inquiries.status, 'waiting')),
      this.pendingReportTargets(),
      this.count(
        matches,
        and(gte(matches.kickoffAt, start), lt(matches.kickoffAt, end)),
      ),
      this.count(matches, eq(matches.status, 'live')),
      this.count(
        matchMessages,
        and(gte(matchMessages.createdAt, start), lt(matchMessages.createdAt, end)),
      ),
      this.count(postPolls, gt(postPolls.closesAt, new Date())),
      this.postsService.recent(RECENT_LIMIT),
      this.inquiriesService.recent(RECENT_LIMIT),
      this.usersService.recent(RECENT_LIMIT),
    ]);

    return {
      users: { total: usersTotal, todaySignups, blocked },
      posts: { today: postsToday, pending: postsPending },
      comments: { today: commentsToday, pending: commentsPending },
      inquiries: { waiting: inquiriesWaiting },
      reports: { pending: reportsPending },
      matches: { today: matchesToday, live: matchesLive },
      chat: { today: chatToday },
      polls: { open: openPolls },
      recentPosts,
      recentInquiries,
      recentUsers,
    };
  }
}
