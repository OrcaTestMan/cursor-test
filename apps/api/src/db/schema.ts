import {
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const matchStatus = pgEnum('match_status', [
  'scheduled',
  'live',
  'finished',
  'postponed',
  'cancelled',
]);

export const postCategory = pgEnum('post_category', ['free', 'match']);

export const leagues = pgTable('leagues', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  sport: varchar('sport', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  leagueId: integer('league_id')
    .notNull()
    .references(() => leagues.id, { onDelete: 'cascade' }),
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
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  category: postCategory('category').notNull().default('free'),
  matchId: integer('match_id').references(() => matches.id, {
    onDelete: 'set null',
  }),
  author: varchar('author', { length: 20 }).notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  body: text('body').notNull(),
  views: integer('views').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  author: varchar('author', { length: 20 }).notNull(),
  body: varchar('body', { length: 500 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
