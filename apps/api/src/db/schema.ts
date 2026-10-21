import {
  bigint,
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core'

export const userRole = pgEnum('nex_user_role', ['member', 'admin'])
export const userStatus = pgEnum('nex_user_status', ['active', 'blocked'])
export const cashType = pgEnum('nex_cash_type', ['입금', '출금'])
export const cashStatus = pgEnum('nex_cash_status', [
  '대기',
  '승인',
  '거절',
  '지급 실패',
])
export const betStatus = pgEnum('nex_bet_status', [
  '진행 중',
  '적중',
  '미적중',
  '취소',
])
export const casinoKind = pgEnum('nex_casino_kind', ['live', 'slot', 'other'])
export const reviewRec = pgEnum('nex_review_rec', [
  'void_review',
  'weak_evidence',
  'ambiguous',
  'not_won',
  'none',
])

/** 회원·관리자 — money는 캐시 잔액(원장과 동일 TX로 갱신) */
export const users = pgTable(
  'nex_users',
  {
    id: serial('id').primaryKey(),
    login: varchar('login', { length: 40 }).notNull(),
    nick: varchar('nick', { length: 40 }).notNull(),
    passwordHash: text('password_hash').notNull().default(''),
    role: userRole('role').notNull().default('member'),
    status: userStatus('status').notNull().default('active'),
    blockReason: varchar('block_reason', { length: 200 }).notNull().default(''),
    money: bigint('money', { mode: 'number' }).notNull().default(0),
    points: bigint('points', { mode: 'number' }).notNull().default(0),
    grade: varchar('grade', { length: 20 }).notNull().default('normal'),
    lastIp: varchar('last_ip', { length: 64 }).notNull().default(''),
    lastDevice: varchar('last_device', { length: 120 }).notNull().default(''),
    withdrawAccount: varchar('withdraw_account', { length: 120 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('nex_users_login_uidx').on(t.login),
    index('nex_users_status_idx').on(t.status),
  ],
)

/** 머니 원장 — append-only. 이중기록은 (ref_type, ref_id) 유니크로 차단 */
export const moneyMoves = pgTable(
  'nex_money_moves',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    balanceAfter: bigint('balance_after', { mode: 'number' }).notNull(),
    reason: varchar('reason', { length: 40 }).notNull(),
    refType: varchar('ref_type', { length: 40 }).notNull().default(''),
    refId: integer('ref_id'),
    memo: varchar('memo', { length: 200 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('nex_money_moves_user_idx').on(t.userId),
    index('nex_money_moves_created_idx').on(t.createdAt),
    index('nex_money_moves_user_created_id_idx').on(t.userId, t.createdAt, t.id),
    uniqueIndex('nex_money_moves_ref_uidx').on(t.refType, t.refId),
  ],
)

/** 멱등키 */
export const idempotencyKeys = pgTable(
  'nex_idempotency_keys',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    scope: varchar('scope', { length: 64 }).notNull(),
    key: varchar('key', { length: 128 }).notNull(),
    statusCode: integer('status_code').notNull().default(200),
    responseBody: text('response_body').notNull().default('{}'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('nex_idempotency_scope_key_uidx').on(t.scope, t.key),
    index('nex_idempotency_created_idx').on(t.createdAt),
  ],
)

/** 입출금 신청 */
export const cashRequests = pgTable(
  'nex_cash_requests',
  {
    id: serial('id').primaryKey(),
    publicId: varchar('public_id', { length: 32 }).notNull(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: cashType('type').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    status: cashStatus('status').notNull().default('대기'),
    memo: varchar('memo', { length: 200 }).notNull().default(''),
    idempotencyKey: varchar('idempotency_key', { length: 128 }),
    requestedAt: timestamp('requested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('nex_cash_public_id_uidx').on(t.publicId),
    index('nex_cash_user_idx').on(t.userId),
    index('nex_cash_status_idx').on(t.status),
  ],
)

/** 스포츠 배팅 */
export const bets = pgTable(
  'nex_bets',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    matchName: varchar('match_name', { length: 200 }).notNull(),
    league: varchar('league', { length: 120 }).notNull().default(''),
    sport: varchar('sport', { length: 60 }).notNull().default(''),
    market: varchar('market', { length: 80 }).notNull().default('승무패'),
    line: varchar('line', { length: 40 }).notNull().default('-'),
    whenLabel: varchar('when_label', { length: 20 }).notNull().default('일반'),
    stake: bigint('stake', { mode: 'number' }).notNull(),
    odds: numeric('odds', { precision: 12, scale: 4 }).notNull(),
    potentialPayout: bigint('potential_payout', { mode: 'number' }).notNull(),
    status: betStatus('status').notNull().default('진행 중'),
    matchLive: boolean('match_live').notNull().default(false),
    settlementRevision: integer('settlement_revision').notNull().default(0),
    placedAt: timestamp('placed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    settledAt: timestamp('settled_at', { withTimezone: true }),
  },
  (t) => [
    index('nex_bets_user_idx').on(t.userId),
    index('nex_bets_status_idx').on(t.status),
    index('nex_bets_match_idx').on(t.matchName),
  ],
)

/** 배팅 정산·재정산 이력 — 원장 ref_id 로 사용 (차수마다 새 id) */
export const betSettlementEvents = pgTable(
  'nex_bet_settlement_events',
  {
    id: serial('id').primaryKey(),
    betId: integer('bet_id')
      .notNull()
      .references(() => bets.id, { onDelete: 'cascade' }),
    revision: integer('revision').notNull(),
    fromStatus: varchar('from_status', { length: 20 }).notNull(),
    toStatus: varchar('to_status', { length: 20 }).notNull(),
    moneyDelta: bigint('money_delta', { mode: 'number' }).notNull().default(0),
    memo: varchar('memo', { length: 200 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('nex_bet_settle_bet_idx').on(t.betId),
    uniqueIndex('nex_bet_settle_bet_rev_uidx').on(t.betId, t.revision),
  ],
)

/** 카지노 배팅 */
export const casinoBets = pgTable(
  'nex_casino_bets',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 160 }).notNull(),
    kind: casinoKind('kind').notNull().default('other'),
    stake: bigint('stake', { mode: 'number' }).notNull(),
    payout: bigint('payout', { mode: 'number' }).notNull().default(0),
    status: betStatus('status').notNull().default('진행 중'),
    placedAt: timestamp('placed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    settledAt: timestamp('settled_at', { withTimezone: true }),
  },
  (t) => [
    index('nex_casino_bets_user_idx').on(t.userId),
    index('nex_casino_bets_kind_idx').on(t.kind),
    index('nex_casino_bets_status_idx').on(t.status),
  ],
)

/** 포인트 이동 */
export const pointMoves = pgTable(
  'nex_point_moves',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    reason: varchar('reason', { length: 40 }).notNull().default('지급'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('nex_point_moves_user_idx').on(t.userId)],
)

/** 총판 */
export const distAgents = pgTable(
  'nex_dist_agents',
  {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 40 }).notNull(),
    login: varchar('login', { length: 40 }).notNull(),
    nick: varchar('nick', { length: 40 }).notNull(),
    lineName: varchar('line_name', { length: 80 }).notNull().default(''),
    balance: integer('balance').notNull().default(0),
    unpaid: integer('unpaid').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('nex_dist_agents_code_uidx').on(t.code),
    uniqueIndex('nex_dist_agents_login_uidx').on(t.login),
  ],
)

/** 총판 지급내역 */
export const distPayouts = pgTable(
  'nex_dist_payouts',
  {
    id: serial('id').primaryKey(),
    agentId: integer('agent_id')
      .notNull()
      .references(() => distAgents.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    memo: varchar('memo', { length: 200 }).notNull().default(''),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('nex_dist_payouts_agent_idx').on(t.agentId)],
)

/** 수당 적립 상세 */
export const distAccruals = pgTable(
  'nex_dist_accruals',
  {
    id: serial('id').primaryKey(),
    agentId: integer('agent_id')
      .notNull()
      .references(() => distAgents.id, { onDelete: 'cascade' }),
    source: varchar('source', { length: 80 }).notNull().default('스포츠'),
    amount: integer('amount').notNull(),
    balanceAfter: integer('balance_after').notNull().default(0),
    memo: varchar('memo', { length: 200 }).notNull().default(''),
    accruedAt: timestamp('accrued_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('nex_dist_accruals_agent_idx').on(t.agentId)],
)

/** 정산 전 검수(수상 배팅) */
export const reviewFlags = pgTable(
  'nex_review_flags',
  {
    id: serial('id').primaryKey(),
    betId: integer('bet_id').references(() => bets.id, { onDelete: 'set null' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    recommendation: reviewRec('recommendation').notNull().default('none'),
    flagged: boolean('flagged').notNull().default(true),
    ambiguous: boolean('ambiguous').notNull().default(false),
    backlog: boolean('backlog').notNull().default(false),
    matchName: varchar('match_name', { length: 200 }).notNull(),
    market: varchar('market', { length: 80 }).notNull().default(''),
    selection: varchar('selection', { length: 80 }).notNull().default(''),
    stake: integer('stake').notNull(),
    potentialPayout: integer('potential_payout').notNull(),
    betStatus: betStatus('bet_status').notNull().default('진행 중'),
    placedAt: timestamp('placed_at', { withTimezone: true }).notNull(),
    eventAt: timestamp('event_at', { withTimezone: true }),
    marginSec: numeric('margin_sec', { precision: 8, scale: 1 }),
    slackSec: numeric('slack_sec', { precision: 8, scale: 1 }),
    feedAt: timestamp('feed_at', { withTimezone: true }),
    snapshot: varchar('snapshot', { length: 40 }).notNull().default('-'),
    horizonOk: boolean('horizon_ok'),
    badges: text('badges').notNull().default(''),
    reasons: text('reasons').notNull().default(''),
    recent30: integer('recent_30').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('nex_review_flags_user_idx').on(t.userId),
    index('nex_review_flags_flagged_idx').on(t.flagged),
  ],
)

/** USDT 지갑 설정(단일 행 운용) */
export const walletSettings = pgTable('nex_wallet_settings', {
  id: serial('id').primaryKey(),
  network: varchar('network', { length: 40 }).notNull().default('TRC-20'),
  address: varchar('address', { length: 200 }).notNull().default(''),
  rate: varchar('rate', { length: 40 }).notNull().default('1450'),
  minAmount: varchar('min_amount', { length: 40 }).notNull().default('10'),
  note: varchar('note', { length: 200 }).notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** 배너 */
export const banners = pgTable('nex_banners', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 120 }).notNull(),
  visible: boolean('visible').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** 1:1 문의 */
export const inquiries = pgTable('nex_inquiries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 160 }).notNull(),
  body: text('body').notNull().default(''),
  answer: text('answer').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** 활동 로그 */
export const activityLogs = pgTable(
  'nex_activity_logs',
  {
    id: serial('id').primaryKey(),
    text: varchar('text', { length: 400 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('nex_activity_logs_created_idx').on(t.createdAt)],
)

/** 키-값 설정 */
export const settings = pgTable('nex_settings', {
  key: varchar('key', { length: 80 }).primaryKey(),
  value: text('value').notNull().default('{}'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/** 경기 */
export const matches = pgTable('nex_matches', {
  id: serial('id').primaryKey(),
  sport: varchar('sport', { length: 60 }).notNull().default(''),
  league: varchar('league', { length: 120 }).notNull().default(''),
  name: varchar('name', { length: 200 }).notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  live: boolean('live').notNull().default(false),
  tier: varchar('tier', { length: 20 }).notNull().default('main'),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** 마켓 */
export const markets = pgTable('nex_markets', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
  suspended: boolean('suspended').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** 결과(배당) */
export const outcomes = pgTable('nex_outcomes', {
  id: serial('id').primaryKey(),
  marketId: integer('market_id')
    .notNull()
    .references(() => markets.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
  oddsOpen: numeric('odds_open', { precision: 12, scale: 4 }).notNull(),
  oddsCurrent: numeric('odds_current', { precision: 12, scale: 4 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** 배팅 다리 */
export const betLegs = pgTable(
  'nex_bet_legs',
  {
    id: serial('id').primaryKey(),
    betId: integer('bet_id')
      .notNull()
      .references(() => bets.id, { onDelete: 'cascade' }),
    matchId: integer('match_id').references(() => matches.id, { onDelete: 'set null' }),
    marketId: integer('market_id').references(() => markets.id, {
      onDelete: 'set null',
    }),
    outcomeId: integer('outcome_id').references(() => outcomes.id, {
      onDelete: 'set null',
    }),
    oddsAtBet: numeric('odds_at_bet', { precision: 12, scale: 4 }).notNull(),
    line: varchar('line', { length: 40 }).notNull().default('-'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('nex_bet_legs_bet_idx').on(t.betId),
    index('nex_bet_legs_match_idx').on(t.matchId),
  ],
)

/** 감사 로그 */
export const auditLogs = pgTable(
  'nex_audit_logs',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    actor: varchar('actor', { length: 80 }).notNull(),
    targetType: varchar('target_type', { length: 40 }).notNull(),
    targetId: varchar('target_id', { length: 40 }).notNull(),
    action: varchar('action', { length: 80 }).notNull(),
    reason: varchar('reason', { length: 400 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('nex_audit_logs_created_idx').on(t.createdAt)],
)

/** 리스크 노출 집계 */
export const riskExposure = pgTable(
  'nex_risk_exposure',
  {
    id: serial('id').primaryKey(),
    matchId: integer('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    marketId: integer('market_id')
      .notNull()
      .references(() => markets.id, { onDelete: 'cascade' }),
    outcomeId: integer('outcome_id')
      .notNull()
      .references(() => outcomes.id, { onDelete: 'cascade' }),
    stakeSum: bigint('stake_sum', { mode: 'number' }).notNull().default(0),
    payoutSum: bigint('payout_sum', { mode: 'number' }).notNull().default(0),
    betCount: integer('bet_count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('nex_risk_exposure_uidx').on(t.matchId, t.marketId, t.outcomeId),
  ],
)

export const riskSettings = pgTable('nex_risk_settings', {
  id: serial('id').primaryKey(),
  lossLimit: bigint('loss_limit', { mode: 'number' }).notNull().default(5_000_000),
  weights: text('weights')
    .notNull()
    .default(
      '{"limit":35,"skew":20,"imminent":15,"oddsDrop":10,"sharp":10,"multi":10}',
    ),
  alertThresholds: text('alert_thresholds').notNull().default('{}'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const riskAlerts = pgTable('nex_risk_alerts', {
  id: serial('id').primaryKey(),
  kind: varchar('kind', { length: 60 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull().default('medium'),
  message: varchar('message', { length: 400 }).notNull(),
  matchId: integer('match_id'),
  userId: integer('user_id'),
  acked: boolean('acked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const adminRole = pgEnum('nex_admin_role', [
  'superadmin',
  'operator',
  'agent',
])

export const adminAuditAction = pgEnum('nex_admin_audit_action', [
  'login_success',
  'login_fail',
  'logout',
])

/** 관리자 — 회원(nex_users)과 분리 */
export const admins = pgTable(
  'nex_admins',
  {
    id: serial('id').primaryKey(),
    login: varchar('login', { length: 40 }).notNull(),
    nick: varchar('nick', { length: 40 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    totpSecret: text('totp_secret').notNull(),
    role: adminRole('role').notNull().default('agent'),
    failedAttempts: integer('failed_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('nex_admins_login_uidx').on(t.login)],
)

export const adminSessions = pgTable(
  'nex_admin_sessions',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    adminId: integer('admin_id')
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('nex_admin_sessions_token_uidx').on(t.tokenHash),
    index('nex_admin_sessions_admin_idx').on(t.adminId),
  ],
)

export const adminAuditLogs = pgTable(
  'nex_admin_audit_logs',
  {
    id: bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    adminId: integer('admin_id').references(() => admins.id, {
      onDelete: 'set null',
    }),
    login: varchar('login', { length: 40 }).notNull().default(''),
    action: adminAuditAction('action').notNull(),
    ip: varchar('ip', { length: 64 }).notNull().default(''),
    userAgent: varchar('user_agent', { length: 240 }).notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('nex_admin_audit_created_idx').on(t.createdAt)],
)
