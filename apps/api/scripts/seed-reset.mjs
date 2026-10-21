/**
 * seed:reset — 결정적 시드. ALLOW_SEED_RESET=1 필수. production 차단.
 * 머니는 FOR UPDATE + money_moves 삽입으로 WalletService.applyMoney 와 동일 계약.
 */
import postgres from 'postgres'

if (process.env.NODE_ENV === 'production' || process.env.ALLOW_SEED_RESET !== '1') {
  console.error('seed:reset blocked (need ALLOW_SEED_RESET=1 and non-production)')
  process.exit(2)
}

const url =
  process.env.LOCAL_DATABASE_URL || 'postgresql://nex:nex@127.0.0.1:5432/nex'
if (/211\.110\.16\.130/.test(url)) throw new Error('refuse remote DB')
const sql = postgres(url, { max: 1 })

async function applyMoney(userId, amount, reason, refType, refId, memo = '') {
  await sql.begin(async (tx) => {
    await tx`select id from nex_users where id = ${userId} for update`
    const [u] = await tx`select money from nex_users where id = ${userId}`
    const next = Number(u.money) + amount
    if (next < 0) throw new Error(`insufficient ${userId}`)
    await tx`
      insert into nex_money_moves (user_id, amount, balance_after, reason, ref_type, ref_id, memo)
      values (${userId}, ${amount}, ${next}, ${reason}, ${refType}, ${refId}, ${memo})
    `
    await tx`update nex_users set money = ${next}, updated_at = now() where id = ${userId}`
  })
}

async function bumpExposure(matchId, marketId, outcomeId, stake, payout, dir = 1) {
  await sql`
    insert into nex_risk_exposure (match_id, market_id, outcome_id, stake_sum, payout_sum, bet_count)
    values (${matchId}, ${marketId}, ${outcomeId}, ${dir * stake}, ${dir * payout}, ${dir})
    on conflict (match_id, market_id, outcome_id) do update set
      stake_sum = nex_risk_exposure.stake_sum + ${dir * stake},
      payout_sum = nex_risk_exposure.payout_sum + ${dir * payout},
      bet_count = nex_risk_exposure.bet_count + ${dir},
      updated_at = now()
  `
}

const now = Date.now()
const inMin = (m) => new Date(now + m * 60_000)
const agoMin = (m) => new Date(now - m * 60_000)

await sql.begin(async (tx) => {
  // FK 순서 truncate
  await tx`truncate table
    nex_risk_alerts, nex_risk_exposure, nex_risk_settings, nex_audit_logs,
    nex_bet_settlement_events, nex_bet_legs, nex_bets, nex_casino_bets,
    nex_cash_requests, nex_money_moves, nex_idempotency_keys,
    nex_outcomes, nex_markets, nex_matches,
    nex_dist_accruals, nex_dist_payouts, nex_dist_agents,
    nex_review_flags, nex_point_moves, nex_users
    restart identity cascade`
})

// --- 총판 2단계 ---
const [parent] = await sql`
  insert into nex_dist_agents (code, login, nick, line_name, balance, unpaid, active)
  values ('D-TOP', 'dist_top', '상위총판', '본사라인', 0, 0, true) returning id`
const [c1] = await sql`
  insert into nex_dist_agents (code, login, nick, line_name, balance, unpaid, active)
  values ('D-A', 'dist_a', '하위A', '본사라인', 0, 0, true) returning id`
const [c2] = await sql`
  insert into nex_dist_agents (code, login, nick, line_name, balance, unpaid, active)
  values ('D-B', 'dist_b', '하위B', '본사라인', 0, 0, true) returning id`
void parent

const SUSPECT_IP = '203.0.113.10'
const SUSPECT_DEV = 'Pixel-seed-device'
const SUSPECT_BANK = '국민 110-seed-0001'

const userDefs = [
  { login: 'admin', nick: '관리자', role: 'admin', grade: 'normal', money: 0 },
  { login: 'vip01', nick: 'VIP회원', grade: 'vip', money: 500000 },
  { login: 'watch01', nick: '주의회원', grade: 'watch', money: 80000 },
  { login: 'blocked01', nick: '차단회원', grade: 'normal', money: 0, status: 'blocked' },
  { login: 'hist01', nick: '내역검증', grade: 'normal', money: 200000 },
  { login: 'sharp01', nick: '고적중', grade: 'vip', money: 200000 },
  { login: 'wd_wait1', nick: '출금대기1', grade: 'normal', money: 30000 },
  { login: 'wd_wait2', nick: '출금대기2', grade: 'normal', money: 45000 },
  // 다계정 의심 3
  { login: 'multi_a', nick: '다계정A', grade: 'watch', money: 400000, ip: SUSPECT_IP, device: SUSPECT_DEV, bank: SUSPECT_BANK },
  { login: 'multi_b', nick: '다계정B', grade: 'watch', money: 350000, ip: SUSPECT_IP, device: SUSPECT_DEV, bank: SUSPECT_BANK },
  { login: 'multi_c', nick: '다계정C', grade: 'watch', money: 300000, ip: SUSPECT_IP, device: SUSPECT_DEV, bank: SUSPECT_BANK },
  // 일반
  ...Array.from({ length: 8 }, (_, i) => ({
    login: `member${String(i + 1).padStart(2, '0')}`,
    nick: `일반${i + 1}`,
    grade: 'normal',
    money: 250000 + i * 1000,
  })),
]

const users = {}
for (const u of userDefs) {
  const [row] = await sql`
    insert into nex_users (login, nick, password_hash, role, status, money, points, grade, last_ip, last_device, withdraw_account)
    values (
      ${u.login}, ${u.nick}, '', ${u.role || 'member'}, ${u.status || 'active'},
      0, 0, ${u.grade || 'normal'}, ${u.ip || ''}, ${u.device || ''}, ${u.bank || ''}
    ) returning id, login`
  users[row.login] = row.id
  if (u.money > 0) {
    await applyMoney(row.id, u.money, '기초', 'opening', row.id, 'seed opening')
  }
}

// --- 경기 8 ---
const matchSpecs = [
  { sport: '축구', league: 'EPL', name: 'Seed Live A vs B', live: true, starts: agoMin(10), tier: 'main' },
  { sport: '농구', league: 'NBA', name: 'Seed Live C vs D', live: true, starts: agoMin(5), tier: 'main' },
  { sport: '축구', league: 'EPL', name: 'Soon E vs F', live: false, starts: inMin(20), tier: 'main' },
  { sport: '야구', league: 'MLB', name: 'Soon G vs H', live: false, starts: inMin(25), tier: 'main' },
  { sport: '축구', league: 'K3', name: 'Lower I vs J', live: false, starts: inMin(90), tier: 'lower' },
  { sport: '테니스', league: 'ATP', name: 'Mid K vs L', live: false, starts: inMin(120), tier: 'main' },
  { sport: '축구', league: 'EPL', name: 'Late M vs N', live: false, starts: inMin(240), tier: 'main' },
  { sport: '농구', league: 'KBL', name: 'Late O vs P', live: false, starts: inMin(300), tier: 'main' },
]

const matchIds = []
const marketIds = []
const outcomeIds = [] // [matchIdx][side 0|1]
for (let i = 0; i < matchSpecs.length; i++) {
  const m = matchSpecs[i]
  const [row] = await sql`
    insert into nex_matches (sport, league, name, starts_at, live, tier, status)
    values (${m.sport}, ${m.league}, ${m.name}, ${m.starts}, ${m.live}, ${m.tier}, 'open')
    returning id`
  matchIds.push(row.id)
  const [mk] = await sql`
    insert into nex_markets (match_id, name, suspended)
    values (${row.id}, '승패', false) returning id`
  marketIds.push(mk.id)
  const [o1] = await sql`
    insert into nex_outcomes (market_id, name, odds_open, odds_current)
    values (${mk.id}, '홈', 1.90, ${m.live ? 1.75 : 1.90}) returning id`
  const [o2] = await sql`
    insert into nex_outcomes (market_id, name, odds_open, odds_current)
    values (${mk.id}, '원정', 2.10, ${m.live ? 2.30 : 2.10}) returning id`
  outcomeIds.push([o1.id, o2.id])
}

await sql`insert into nex_risk_settings (loss_limit) values (5000000)`

// --- 배팅 40+ ---
let betSeq = 0
async function placeBet({ login, stake, odds, legs, status = '진행 중', whenLabel = '일반', live = false }) {
  betSeq += 1
  const userId = users[login]
  const payout = Math.round(stake * odds)
  const matchName = legs.map((l) => matchSpecs[l.mi].name).join(' / ')
  const folderKind = legs.length >= 2 ? 'multi' : 'single'
  const [bet] = await sql`
    insert into nex_bets (user_id, match_name, league, sport, market, line, when_label, stake, odds, potential_payout, status, match_live, folder_kind)
    values (
      ${userId}, ${matchName}, ${matchSpecs[legs[0].mi].league}, ${matchSpecs[legs[0].mi].sport},
      '승패', '-', ${whenLabel}, ${stake}, ${odds}, ${payout}, '진행 중', ${live}, ${folderKind}
    ) returning id`
  await applyMoney(userId, -stake, '배팅', 'bet_place', bet.id, `seed bet ${betSeq}`)
  for (const leg of legs) {
    const oid = outcomeIds[leg.mi][leg.side]
    const spec = matchSpecs[leg.mi]
    const legStatus = leg.status || '진행 중'
    await sql`
      insert into nex_bet_legs (
        bet_id, match_id, market_id, outcome_id, odds_at_bet, line,
        match_name, market_name, outcome_name, sport, league, live, status
      )
      values (
        ${bet.id}, ${matchIds[leg.mi]}, ${marketIds[leg.mi]}, ${oid}, ${leg.odds || odds}, '-',
        ${spec.name}, '승패', ${leg.side === 0 ? '홈' : '원정'}, ${spec.sport}, ${spec.league}, ${spec.live}, ${legStatus}
      )
    `
    // 단폴 또는 "이 경기만 남은" 다폴의 해당 결과만 노출 집계
    if (legs.length === 1 || leg.remaining) {
      await bumpExposure(matchIds[leg.mi], marketIds[leg.mi], oid, stake, payout, 1)
    }
  }
  if (status !== '진행 중') {
    // 정산
    if (status === '적중') {
      const [ev] = await sql`
        insert into nex_bet_settlement_events (bet_id, revision, from_status, to_status, money_delta, memo)
        values (${bet.id}, 1, '진행 중', '적중', ${payout}, 'seed') returning id`
      await applyMoney(userId, payout, '배팅적중', 'bet_win', ev.id, 'seed win')
      await sql`update nex_bets set status='적중', settlement_revision=1, settled_at=now() where id=${bet.id}`
      for (const leg of legs) {
        if (legs.length === 1 || leg.remaining) {
          await bumpExposure(matchIds[leg.mi], marketIds[leg.mi], outcomeIds[leg.mi][leg.side], stake, payout, -1)
        }
      }
    } else if (status === '미적중') {
      await sql`
        insert into nex_bet_settlement_events (bet_id, revision, from_status, to_status, money_delta, memo)
        values (${bet.id}, 1, '진행 중', '미적중', 0, 'seed')`
      await sql`update nex_bets set status='미적중', settlement_revision=1, settled_at=now() where id=${bet.id}`
      for (const leg of legs) {
        if (legs.length === 1 || leg.remaining) {
          await bumpExposure(matchIds[leg.mi], marketIds[leg.mi], outcomeIds[leg.mi][leg.side], stake, payout, -1)
        }
      }
    } else if (status === '취소') {
      const [ev] = await sql`
        insert into nex_bet_settlement_events (bet_id, revision, from_status, to_status, money_delta, memo)
        values (${bet.id}, 1, '진행 중', '취소', ${stake}, 'seed') returning id`
      await applyMoney(userId, stake, '배팅취소', 'bet_cancel', ev.id, 'seed void')
      await sql`update nex_bets set status='취소', settlement_revision=1, settled_at=now() where id=${bet.id}`
      for (const leg of legs) {
        if (legs.length === 1 || leg.remaining) {
          await bumpExposure(matchIds[leg.mi], marketIds[leg.mi], outcomeIds[leg.mi][leg.side], stake, payout, -1)
        }
      }
    } else if (status === '적특') {
      const [ev] = await sql`
        insert into nex_bet_settlement_events (bet_id, revision, from_status, to_status, money_delta, memo)
        values (${bet.id}, 1, '진행 중', '적특', ${stake}, 'seed') returning id`
      await applyMoney(userId, stake, '적특환불', 'bet_push', ev.id, 'seed push')
      await sql`update nex_bets set status='적특', settlement_revision=1, settled_at=now() where id=${bet.id}`
      await sql`update nex_bet_legs set status='적특' where bet_id=${bet.id}`
      for (const leg of legs) {
        if (legs.length === 1 || leg.remaining) {
          await bumpExposure(matchIds[leg.mi], marketIds[leg.mi], outcomeIds[leg.mi][leg.side], stake, payout, -1)
        }
      }
    }
    if (legs.length === 1) {
      await sql`update nex_bet_legs set status=${status} where bet_id=${bet.id}`
    }
  }
  return bet.id
}

// 단폴/라이브/쏠림
for (let i = 0; i < 12; i++) {
  await placeBet({
    login: `member${String((i % 8) + 1).padStart(2, '0')}`,
    stake: 5000 + i * 100,
    odds: 1.9,
    legs: [{ mi: i % 8, side: 0 }],
    live: i < 4,
    whenLabel: i < 4 ? '실시간' : '일반',
  })
}
// 한쪽 쏠림 (match 0 side 0)
for (let i = 0; i < 10; i++) {
  await placeBet({
    login: i % 2 === 0 ? 'vip01' : 'multi_a',
    stake: 20000,
    odds: 1.75,
    legs: [{ mi: 0, side: 0 }],
    live: true,
    whenLabel: '실시간',
  })
}
// 다폴더 + "이 경기만 남은" 2건+
const multiLeft1 = await placeBet({
  login: 'sharp01',
  stake: 15000,
  odds: 5.2,
  legs: [
    { mi: 5, side: 0, odds: 1.8 },
    { mi: 6, side: 1, odds: 1.9 },
    { mi: 2, side: 0, odds: 1.9, remaining: true },
  ],
})
const multiLeft2 = await placeBet({
  login: 'watch01',
  stake: 12000,
  odds: 4.8,
  legs: [
    { mi: 7, side: 1, odds: 2.0 },
    { mi: 3, side: 0, odds: 1.85, remaining: true },
  ],
})
void multiLeft1
void multiLeft2
// 추가 다폴
for (let i = 0; i < 8; i++) {
  await placeBet({
    login: `member${String((i % 8) + 1).padStart(2, '0')}`,
    stake: 8000,
    odds: 3.4,
    legs: [
      { mi: (i + 1) % 8, side: 0 },
      { mi: (i + 2) % 8, side: 1 },
    ],
  })
}
// 단폴 보강 (40건 이상)
for (let i = 0; i < 10; i++) {
  await placeBet({
    login: `member${String((i % 8) + 1).padStart(2, '0')}`,
    stake: 3000 + i * 50,
    odds: 2.05,
    legs: [{ mi: (i + 3) % 8, side: i % 2 }],
  })
}
// 정산 샘플
await placeBet({
  login: 'member01',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 4, side: 0 }],
  status: '적중',
})
await placeBet({
  login: 'member02',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 4, side: 1 }],
  status: '미적중',
})
await placeBet({
  login: 'member03',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 5, side: 0 }],
  status: '취소',
})
await placeBet({
  login: 'hist01',
  stake: 10000,
  odds: 1.9,
  legs: [{ mi: 0, side: 0 }],
  live: true,
  whenLabel: '실시간',
})
await placeBet({
  login: 'hist01',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 4, side: 0, status: '적중' }],
  status: '적중',
})
await placeBet({
  login: 'hist01',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 4, side: 1, status: '미적중' }],
  status: '미적중',
})
await placeBet({
  login: 'hist01',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 5, side: 0, status: '취소' }],
  status: '취소',
})
await placeBet({
  login: 'hist01',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 3, side: 0, status: '적특' }],
  status: '적특',
})
await placeBet({
  login: 'hist01',
  stake: 5000,
  odds: 3.4,
  legs: [
    { mi: 1, side: 0, odds: 1.8, status: '적중' },
    { mi: 2, side: 1, odds: 1.9, status: '진행 중' },
  ],
})
// 재정산 1건: 적중 → 미적중 → 적중
const rsId = await placeBet({
  login: 'member04',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 6, side: 0 }],
  status: '적중',
})
{
  const [bet] = await sql`select * from nex_bets where id = ${rsId}`
  const [ev2] = await sql`
    insert into nex_bet_settlement_events (bet_id, revision, from_status, to_status, money_delta, memo)
    values (${rsId}, 2, '적중', '미적중', ${-bet.potential_payout}, 'seed resettle') returning id`
  await applyMoney(bet.user_id, -Number(bet.potential_payout), '적중회수', 'bet_win_reverse', ev2.id, 'seed')
  await sql`update nex_bets set status='미적중', settlement_revision=2 where id=${rsId}`
  const [ev3] = await sql`
    insert into nex_bet_settlement_events (bet_id, revision, from_status, to_status, money_delta, memo)
    values (${rsId}, 3, '미적중', '적중', ${bet.potential_payout}, 'seed resettle2') returning id`
  await applyMoney(bet.user_id, Number(bet.potential_payout), '배팅적중', 'bet_win', ev3.id, 'seed')
  await sql`update nex_bets set status='적중', settlement_revision=3 where id=${rsId}`
}

// --- 입출금 ---
const [dep] = await sql`
  insert into nex_cash_requests (public_id, user_id, type, amount, status, memo, processed_at)
  values ('seed-dep-1', ${users.member05}, '입금', 50000, '승인', 'seed', now()) returning id`
await applyMoney(users.member05, 50000, '입금승인', 'cash_deposit_approve', dep.id, 'seed')
await sql`
  insert into nex_cash_requests (public_id, user_id, type, amount, status, memo)
  values ('seed-wd-1', ${users.wd_wait1}, '출금', 10000, '대기', 'seed pending')`
await applyMoney(users.wd_wait1, -10000, '출금홀드', 'cash_withdraw_hold', (
  await sql`select id from nex_cash_requests where public_id='seed-wd-1'`
)[0].id, 'seed')
await sql`
  insert into nex_cash_requests (public_id, user_id, type, amount, status, memo, processed_at)
  values ('seed-rej-1', ${users.member06}, '출금', 5000, '거절', 'seed reject', now())`

await sql`
  insert into nex_cash_requests (public_id, user_id, type, amount, status, memo)
  values ('seed-wd-2', ${users.wd_wait2}, '출금', 15000, '대기', 'seed pending2')`
await applyMoney(users.wd_wait2, -15000, '출금홀드', 'cash_withdraw_hold', (
  await sql`select id from nex_cash_requests where public_id='seed-wd-2'`
)[0].id, 'seed')

await sql`
  insert into nex_audit_logs (actor, target_type, target_id, action, reason)
  values ('seed', 'system', '0', 'seed_reset', 'deterministic seed')`

// verify
const mism = await sql.unsafe(`
SELECT count(*)::int AS c FROM (
  SELECT u.id FROM nex_users u
  LEFT JOIN nex_money_moves m ON m.user_id = u.id
  GROUP BY u.id
  HAVING u.money <> COALESCE(SUM(m.amount), 0)
) t`)
const betCount = await sql`select count(*)::int as c from nex_bets`
const userCount = await sql`select count(*)::int as c from nex_users`
const exp = await sql`select count(*)::int as c from nex_risk_exposure`

// exposure vs raw for open singles on match 0
const raw = await sql`
  select coalesce(sum(b.stake),0)::bigint as stake
  from nex_bets b
  join nex_bet_legs l on l.bet_id = b.id
  where b.status = '진행 중' and l.match_id = ${matchIds[0]} and l.outcome_id = ${outcomeIds[0][0]}
    and (select count(*) from nex_bet_legs x where x.bet_id = b.id) = 1
`
const agg = await sql`
  select stake_sum from nex_risk_exposure
  where match_id = ${matchIds[0]} and outcome_id = ${outcomeIds[0][0]}
`

const summary = {
  users: userCount[0].c,
  bets: betCount[0].c,
  exposureRows: exp[0].c,
  mismatch: mism[0].c,
  match0SingleStakeRaw: Number(raw[0].stake),
  match0SingleStakeAgg: Number(agg[0]?.stake_sum || 0),
  exposureMatch: Number(raw[0].stake) === Number(agg[0]?.stake_sum || 0),
  dist: { parent: parent.id, c1: c1.id, c2: c2.id },
  ok:
    mism[0].c === 0 &&
    userCount[0].c >= 15 &&
    betCount[0].c >= 40 &&
    Number(raw[0].stake) === Number(agg[0]?.stake_sum || 0),
}
console.log(JSON.stringify(summary, null, 2))
await sql.end()
if (!summary.ok) process.exit(1)
