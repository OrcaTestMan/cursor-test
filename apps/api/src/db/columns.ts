import {
  getTableName,
  sql,
  type Column,
  type SQL,
  type Table,
} from 'drizzle-orm';
import {
  comments,
  inquiries,
  leagues,
  matches,
  notifications,
  posts,
  reports,
  users,
} from './schema.js';

export type Role = (typeof users.$inferSelect)['role'];
export type UserStatus = (typeof users.$inferSelect)['status'];
export type ContentStatus = (typeof posts.$inferSelect)['status'];
export type Category = (typeof posts.$inferSelect)['category'];
export type MatchStatus = (typeof matches.$inferSelect)['status'];
export type InquiryStatus = (typeof inquiries.$inferSelect)['status'];
export type NotificationType = (typeof notifications.$inferSelect)['type'];
export type ReportTarget = (typeof reports.$inferSelect)['targetType'];
export type ReportReason = (typeof reports.$inferSelect)['reason'];
export type ReportStatus = (typeof reports.$inferSelect)['status'];

// Drizzle omits table names in single-table selects, so correlated subqueries
// must spell out "table"."column" to reference the outer row.
function ref(table: Table, column: Column) {
  return sql.raw(`"${getTableName(table)}"."${column.name}"`);
}

function countSql(inner: Table, where: SQL) {
  return sql<number>`(select count(*)::int from ${sql.raw(`"${getTableName(inner)}"`)} where ${where})`.mapWith(
    Number,
  );
}

export const userColumns = {
  id: users.id,
  username: users.username,
  nickname: users.nickname,
  role: users.role,
  status: users.status,
  nicknameChangedAt: users.nicknameChangedAt,
  bio: users.bio,
  avatarUploadId: users.avatarUploadId,
  createdAt: users.createdAt,
};

export const adminUserColumns = {
  ...userColumns,
  blockedReason: users.blockedReason,
  blockedUntil: users.blockedUntil,
  blockedAt: users.blockedAt,
  lastLoginAt: users.lastLoginAt,
  postCount: countSql(
    posts,
    sql`${ref(posts, posts.authorId)} = ${ref(users, users.id)}`,
  ),
  commentCount: countSql(
    comments,
    sql`${ref(comments, comments.authorId)} = ${ref(users, users.id)}`,
  ),
};

export const authorColumns = {
  id: users.id,
  nickname: users.nickname,
  avatarUploadId: users.avatarUploadId,
};

export const leagueColumns = {
  id: leagues.id,
  name: leagues.name,
  sport: leagues.sport,
  matchCount: countSql(
    matches,
    sql`${ref(matches, matches.leagueId)} = ${ref(leagues, leagues.id)}`,
  ),
  createdAt: leagues.createdAt,
};

export const matchColumns = {
  id: matches.id,
  leagueId: matches.leagueId,
  leagueName: leagues.name,
  sport: leagues.sport,
  homeTeam: matches.homeTeam,
  awayTeam: matches.awayTeam,
  kickoffAt: matches.kickoffAt,
  venue: matches.venue,
  status: matches.status,
  homeScore: matches.homeScore,
  awayScore: matches.awayScore,
  postCount: countSql(
    posts,
    sql`${ref(posts, posts.matchId)} = ${ref(matches, matches.id)} and ${ref(posts, posts.status)} = 'visible'`,
  ),
};

/** 추천 수가 설정의 bestThreshold 이상이고, 인기글 제외가 아니고, 공지가 아니면 인기글 */
export const isBestSql = sql<boolean>`(coalesce(${ref(posts, posts.likeCount)} >= (select "best_threshold" from "settings" where "id" = 1), false) and not ${ref(posts, posts.bestExcluded)} and ${ref(posts, posts.category)} <> 'notice')`;

export const postSummaryColumns = {
  id: posts.id,
  category: posts.category,
  matchId: posts.matchId,
  tag: posts.tag,
  title: posts.title,
  author: authorColumns,
  views: posts.views,
  likeCount: posts.likeCount,
  isBest: isBestSql,
  commentCount: countSql(
    comments,
    sql`${ref(comments, comments.postId)} = ${ref(posts, posts.id)} and ${ref(comments, comments.status)} = 'visible' and ${ref(comments, comments.deletedAt)} is null`,
  ),
  status: posts.status,
  createdAt: posts.createdAt,
  thumbnailId: sql<number | null>`(select "uploads"."id" from "uploads" where "uploads"."post_id" = ${ref(posts, posts.id)} and "uploads"."kind" = 'post' order by "uploads"."sort_order", "uploads"."id" limit 1)`.mapWith(
    (value) => (value == null ? null : Number(value)),
  ),
};

function reportCountSql(targetType: ReportTarget, target: SQL) {
  return countSql(
    reports,
    sql`${ref(reports, reports.targetType)} = ${sql.raw(`'${targetType}'`)} and ${ref(reports, reports.targetId)} = ${target}`,
  );
}

export const adminPostSummaryColumns = {
  ...postSummaryColumns,
  bestExcluded: posts.bestExcluded,
  reportCount: reportCountSql('post', ref(posts, posts.id)),
};

export const commentColumns = {
  id: comments.id,
  postId: comments.postId,
  parentId: comments.parentId,
  author: authorColumns,
  body: sql<string>`(case when ${ref(comments, comments.deletedAt)} is null then ${ref(comments, comments.body)} else '' end)`,
  deleted: sql<boolean>`(${ref(comments, comments.deletedAt)} is not null)`,
  likeCount: comments.likeCount,
  status: comments.status,
  createdAt: comments.createdAt,
};

export const adminCommentColumns = {
  ...commentColumns,
  postTitle: posts.title,
  reportCount: reportCountSql('comment', ref(comments, comments.id)),
};

export const inquiryColumns = {
  id: inquiries.id,
  title: inquiries.title,
  body: inquiries.body,
  status: inquiries.status,
  answer: inquiries.answer,
  answeredAt: inquiries.answeredAt,
  createdAt: inquiries.createdAt,
};

export const adminInquiryColumns = {
  ...inquiryColumns,
  user: authorColumns,
};

export const notificationColumns = {
  id: notifications.id,
  type: notifications.type,
  text: notifications.text,
  link: notifications.link,
  readAt: notifications.readAt,
  createdAt: notifications.createdAt,
};
