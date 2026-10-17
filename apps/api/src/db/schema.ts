import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['user', 'admin']);

export const userStatus = pgEnum('user_status', ['active', 'blocked']);

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
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
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
    title: varchar('title', { length: 100 }).notNull(),
    body: text('body').notNull(),
    views: integer('views').notNull().default(0),
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
    body: varchar('body', { length: 500 }).notNull(),
    status: contentStatus('status').notNull().default('visible'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('comments_post_id_idx').on(t.postId),
    index('comments_author_id_idx').on(t.authorId),
    index('comments_status_idx').on(t.status),
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
});
