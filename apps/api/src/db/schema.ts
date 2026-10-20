import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['user', 'admin']);

export const userStatus = pgEnum('user_status', ['active', 'blocked', 'deleted']);

export const matchStatus = pgEnum('match_status', [
  'scheduled',
  'live',
  'finished',
  'postponed',
  'cancelled',
]);

export const postCategory = pgEnum('post_category', [
  'notice',
  'free',
  'match',
  'humor',
  'review',
  'news',
]);

export const contentStatus = pgEnum('content_status', [
  'pending',
  'visible',
  'hidden',
]);

export const inquiryStatus = pgEnum('inquiry_status', ['waiting', 'answered']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 20 }).notNull().unique(),
  nickname: varchar('nickname', { length: 12 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('user'),
  status: userStatus('status').notNull().default('active'),
  blockedReason: varchar('blocked_reason', { length: 200 }),
  blockedUntil: timestamp('blocked_until', { withTimezone: true }),
  blockedAt: timestamp('blocked_at', { withTimezone: true }),
  nicknameChangedAt: timestamp('nickname_changed_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  bio: varchar('bio', { length: 160 }).notNull().default(''),
  avatarUploadId: integer('avatar_upload_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: varchar('token_hash', { length: 64 }).primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)],
);

export const leagues = pgTable('leagues', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  sport: varchar('sport', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const matches = pgTable(
  'matches',
  {
    id: serial('id').primaryKey(),
    leagueId: integer('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'restrict' }),
    homeTeam: varchar('home_team', { length: 50 }).notNull(),
    awayTeam: varchar('away_team', { length: 50 }).notNull(),
    kickoffAt: timestamp('kickoff_at', { withTimezone: true }).notNull(),
    venue: varchar('venue', { length: 100 }),
    status: matchStatus('status').notNull().default('scheduled'),
    homeScore: integer('home_score'),
    awayScore: integer('away_score'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('matches_kickoff_at_idx').on(t.kickoffAt),
    index('matches_league_id_idx').on(t.leagueId),
  ],
);

export const posts = pgTable(
  'posts',
  {
    id: serial('id').primaryKey(),
    category: postCategory('category').notNull().default('free'),
    matchId: integer('match_id').references(() => matches.id, {
      onDelete: 'set null',
    }),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tag: varchar('tag', { length: 20 }),
    title: varchar('title', { length: 100 }).notNull(),
    body: text('body').notNull(),
    views: integer('views').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    bestExcluded: boolean('best_excluded').notNull().default(false),
    status: contentStatus('status').notNull().default('visible'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('posts_category_created_at_idx').on(t.category, t.createdAt),
    index('posts_status_idx').on(t.status),
    index('posts_match_id_idx').on(t.matchId),
    index('posts_author_id_idx').on(t.authorId),
    index('posts_like_count_idx').on(t.likeCount),
  ],
);

export const comments = pgTable(
  'comments',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: integer('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: integer('parent_id'),
    body: varchar('body', { length: 500 }).notNull(),
    status: contentStatus('status').notNull().default('visible'),
    likeCount: integer('like_count').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('comments_post_id_idx').on(t.postId),
    index('comments_parent_id_idx').on(t.parentId),
    index('comments_author_id_idx').on(t.authorId),
    index('comments_status_idx').on(t.status),
    index('comments_like_count_idx').on(t.likeCount),
  ],
);

export const commentLikes = pgTable(
  'comment_likes',
  {
    commentId: integer('comment_id')
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.commentId, t.userId] }),
    index('comment_likes_user_id_idx').on(t.userId),
  ],
);

export const inquiries = pgTable(
  'inquiries',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 100 }).notNull(),
    body: varchar('body', { length: 2000 }).notNull(),
    status: inquiryStatus('status').notNull().default('waiting'),
    answer: varchar('answer', { length: 2000 }),
    answeredAt: timestamp('answered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('inquiries_user_id_idx').on(t.userId),
    index('inquiries_status_idx').on(t.status),
  ],
);

export const messageSends = pgTable('message_sends', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 100 }).notNull(),
  body: varchar('body', { length: 2000 }).notNull(),
  toAll: boolean('to_all').notNull().default(false),
  toUserId: integer('to_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messages = pgTable(
  'messages',
  {
    id: serial('id').primaryKey(),
    sendId: integer('send_id')
      .notNull()
      .references(() => messageSends.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('messages_user_id_idx').on(t.userId)],
);

export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  siteName: varchar('site_name', { length: 30 })
    .notNull()
    .default('스포츠 커뮤니티'),
  noticeBanner: varchar('notice_banner', { length: 200 })
    .notNull()
    .default(''),
  signupEnabled: boolean('signup_enabled').notNull().default(true),
  postApprovalRequired: boolean('post_approval_required')
    .notNull()
    .default(false),
  bestThreshold: integer('best_threshold').notNull().default(5),
  reportHideThreshold: integer('report_hide_threshold').notNull().default(5),
  postCooldownSec: integer('post_cooldown_sec').notNull().default(30),
  commentCooldownSec: integer('comment_cooldown_sec').notNull().default(10),
  freeTags: text('free_tags')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  matchTags: text('match_tags')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  humorTags: text('humor_tags')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  reviewTags: text('review_tags')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  newsTags: text('news_tags')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
});

export const postLikes = pgTable(
  'post_likes',
  {
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.userId] }),
    index('post_likes_user_id_idx').on(t.userId),
  ],
);

export const bookmarks = pgTable(
  'bookmarks',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.postId] }),
    index('bookmarks_post_id_idx').on(t.postId),
  ],
);

export const cheerSide = pgEnum('cheer_side', ['home', 'away']);

export const predictionPick = pgEnum('prediction_pick', ['home', 'draw', 'away']);

export const matchCheers = pgTable(
  'match_cheers',
  {
    matchId: integer('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    side: cheerSide('side').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.userId] }),
    index('match_cheers_user_id_idx').on(t.userId),
  ],
);

export const matchPredictions = pgTable(
  'match_predictions',
  {
    matchId: integer('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    pick: predictionPick('pick').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.userId] }),
    index('match_predictions_user_id_idx').on(t.userId),
  ],
);

export const notificationType = pgEnum('notification_type', [
  'comment',
  'reply',
  'inquiry_answer',
  'message',
  'report_result',
  'mention',
  'subscribe',
  'follow',
]);

export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationType('type').notNull(),
    text: varchar('text', { length: 200 }).notNull(),
    link: varchar('link', { length: 200 }).notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('notifications_user_created_idx').on(t.userId, t.createdAt)],
);

export const reportTarget = pgEnum('report_target', ['post', 'comment', 'chat']);

export const reportReason = pgEnum('report_reason', [
  'abuse',
  'obscene',
  'spam',
  'privacy',
  'etc',
]);

export const reportStatus = pgEnum('report_status', [
  'pending',
  'resolved',
  'rejected',
]);

export const reports = pgTable(
  'reports',
  {
    id: serial('id').primaryKey(),
    reporterId: integer('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    targetType: reportTarget('target_type').notNull(),
    targetId: integer('target_id').notNull(),
    reason: reportReason('reason').notNull(),
    detail: varchar('detail', { length: 300 }).notNull().default(''),
    status: reportStatus('status').notNull().default('pending'),
    handledById: integer('handled_by_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    handleNote: varchar('handle_note', { length: 300 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('reports_reporter_target_uq').on(
      t.reporterId,
      t.targetType,
      t.targetId,
    ),
    index('reports_target_idx').on(t.targetType, t.targetId),
    index('reports_status_idx').on(t.status),
  ],
);

export const forbiddenWords = pgTable('forbidden_words', {
  id: serial('id').primaryKey(),
  word: varchar('word', { length: 50 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const adminLogs = pgTable(
  'admin_logs',
  {
    id: serial('id').primaryKey(),
    adminId: integer('admin_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 20 }).notNull(),
    targetId: integer('target_id'),
    detail: varchar('detail', { length: 300 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('admin_logs_created_at_idx').on(t.createdAt)],
);

export const uploadKind = pgEnum('upload_kind', ['post', 'avatar']);

export const uploads = pgTable(
  'uploads',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: uploadKind('kind').notNull().default('post'),
    postId: integer('post_id').references(() => posts.id, {
      onDelete: 'set null',
    }),
    storedName: varchar('stored_name', { length: 200 }).notNull(),
    originalName: varchar('original_name', { length: 200 }).notNull(),
    mime: varchar('mime', { length: 50 }).notNull(),
    size: integer('size').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('uploads_post_id_idx').on(t.postId),
    index('uploads_user_id_idx').on(t.userId),
  ],
);

export const teams = pgTable(
  'teams',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 50 }).notNull().unique(),
    sport: varchar('sport', { length: 20 }).notNull(),
    leagueId: integer('league_id').references(() => leagues.id, {
      onDelete: 'set null',
    }),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('teams_sport_idx').on(t.sport)],
);

export const userTeams = pgTable(
  'user_teams',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.teamId] }),
    index('user_teams_team_id_idx').on(t.teamId),
  ],
);

export const matchMessages = pgTable(
  'match_messages',
  {
    id: serial('id').primaryKey(),
    matchId: integer('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: varchar('body', { length: 500 }).notNull(),
    status: contentStatus('status').notNull().default('visible'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('match_messages_match_id_id_idx').on(t.matchId, t.id),
    index('match_messages_user_id_idx').on(t.userId),
  ],
);

export const postTeams = pgTable(
  'post_teams',
  {
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.teamId] }),
    index('post_teams_team_id_idx').on(t.teamId),
  ],
);

export const userFollows = pgTable(
  'user_follows',
  {
    followerId: integer('follower_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    followeeId: integer('followee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followeeId] }),
    index('user_follows_followee_idx').on(t.followeeId),
  ],
);

export const userMutes = pgTable(
  'user_mutes',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mutedUserId: integer('muted_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.mutedUserId] }),
    index('user_mutes_muted_idx').on(t.mutedUserId),
  ],
);

export const postSubscriptions = pgTable(
  'post_subscriptions',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.postId] }),
    index('post_subscriptions_post_idx').on(t.postId),
  ],
);

export const notificationSettings = pgTable('notification_settings', {
  userId: integer('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  comment: boolean('comment').notNull().default(true),
  reply: boolean('reply').notNull().default(true),
  mention: boolean('mention').notNull().default(true),
  subscribe: boolean('subscribe').notNull().default(true),
  follow: boolean('follow').notNull().default(true),
  inquiryAnswer: boolean('inquiry_answer').notNull().default(true),
  message: boolean('message').notNull().default(true),
  reportResult: boolean('report_result').notNull().default(true),
});

export const postPolls = pgTable('post_polls', {
  postId: integer('post_id')
    .primaryKey()
    .references(() => posts.id, { onDelete: 'cascade' }),
  closesAt: timestamp('closes_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const postPollOptions = pgTable(
  'post_poll_options',
  {
    id: serial('id').primaryKey(),
    postId: integer('post_id')
      .notNull()
      .references(() => postPolls.postId, { onDelete: 'cascade' }),
    label: varchar('label', { length: 40 }).notNull(),
    sortOrder: integer('sort_order').notNull(),
  },
  (t) => [index('post_poll_options_post_idx').on(t.postId, t.sortOrder)],
);

export const postPollVotes = pgTable(
  'post_poll_votes',
  {
    postId: integer('post_id')
      .notNull()
      .references(() => postPolls.postId, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    optionId: integer('option_id')
      .notNull()
      .references(() => postPollOptions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.userId] }),
    index('post_poll_votes_option_idx').on(t.optionId),
  ],
);

export const userBadges = pgTable(
  'user_badges',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeId: varchar('badge_id', { length: 30 }).notNull(),
    awardedAt: timestamp('awarded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);
