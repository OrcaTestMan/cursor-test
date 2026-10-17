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
  posts,
  users,
} from './schema.js';

export type Role = (typeof users.$inferSelect)['role'];
export type UserStatus = (typeof users.$inferSelect)['status'];
export type ContentStatus = (typeof posts.$inferSelect)['status'];
export type Category = (typeof posts.$inferSelect)['category'];
export type MatchStatus = (typeof matches.$inferSelect)['status'];
export type InquiryStatus = (typeof inquiries.$inferSelect)['status'];

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
  createdAt: users.createdAt,
};

export const adminUserColumns = {
  ...userColumns,
  blockedReason: users.blockedReason,
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

export const postSummaryColumns = {
  id: posts.id,
  category: posts.category,
  matchId: posts.matchId,
  title: posts.title,
  author: authorColumns,
  views: posts.views,
  commentCount: countSql(
    comments,
    sql`${ref(comments, comments.postId)} = ${ref(posts, posts.id)} and ${ref(comments, comments.status)} = 'visible'`,
  ),
  status: posts.status,
  createdAt: posts.createdAt,
};

export const commentColumns = {
  id: comments.id,
  postId: comments.postId,
  author: authorColumns,
  body: comments.body,
  status: comments.status,
  createdAt: comments.createdAt,
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
