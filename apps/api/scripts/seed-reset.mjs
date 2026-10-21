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
    nex_review_flags, nex_point_moves, nex_users,
    nex_banners, nex_inquiries, nex_activity_logs, nex_wallet_settings
    restart identity cascade`
})

// --- 총판 2단계 ---
const [parent] = await sql`
  insert into nex_dist_agents (code, login, nick, line_name, balance, unpaid, active)
  values ('HQ-01', 'hq_master', '본사총판', '본사', 0, 0, true) returning id`
const [c1] = await sql`
  insert into nex_dist_agents (code, login, nick, line_name, balance, unpaid, active)
  values ('GN-01', 'gangnam', '강남총판', '본사', 0, 0, true) returning id`
const [c2] = await sql`
  insert into nex_dist_agents (code, login, nick, line_name, balance, unpaid, active)
  values ('BS-01', 'busan', '부산총판', '본사', 0, 0, true) returning id`
void parent

const SUSPECT_IP = '211.36.142.18'
const SUSPECT_DEV = 'SM-S928N'
const SUSPECT_BANK = '국민 604-21-018392'

const REGULARS = ['leesu', 'yoonah', 'kangst', 'seojw', 'hwangsy', 'anjw', 'moonhy', 'jaeho']

const userDefs = [
  { login: 'admin', nick: '관리자', role: 'admin', grade: 'normal', money: 0 },
  { login: 'kimjs', nick: '김지성', grade: 'vip', money: 500000 },
  { login: 'parkdh', nick: '박도현', grade: 'normal', money: 200000 },
  { login: 'choihj', nick: '최현주', grade: 'watch', money: 80000 },
  { login: 'hansy', nick: '한소연', grade: 'normal', money: 0, status: 'blocked' },
  { login: 'jungmw', nick: '정민우', grade: 'vip', money: 200000 },
  { login: 'ohjw', nick: '오진우', grade: 'normal', money: 30000 },
  { login: 'songmh', nick: '송민혁', grade: 'normal', money: 45000 },
  { login: 'baekth', nick: '백태현', grade: 'watch', money: 400000, ip: SUSPECT_IP, device: SUSPECT_DEV, bank: SUSPECT_BANK },
  { login: 'namgs', nick: '남기석', grade: 'watch', money: 350000, ip: SUSPECT_IP, device: SUSPECT_DEV, bank: SUSPECT_BANK },
  { login: 'limjy', nick: '임지윤', grade: 'watch', money: 300000, ip: SUSPECT_IP, device: SUSPECT_DEV, bank: SUSPECT_BANK },
  { login: 'leesu', nick: '이수민', grade: 'normal', money: 250000 },
  { login: 'yoonah', nick: '윤아현', grade: 'normal', money: 251000 },
  { login: 'kangst', nick: '강서준', grade: 'normal', money: 252000 },
  { login: 'seojw', nick: '서준우', grade: 'normal', money: 253000 },
  { login: 'hwangsy', nick: '황서연', grade: 'normal', money: 254000 },
  { login: 'anjw', nick: '안지훈', grade: 'normal', money: 255000 },
  { login: 'moonhy', nick: '문하윤', grade: 'normal', money: 256000 },
  { login: 'jaeho', nick: '이재호', grade: 'normal', money: 257000 },
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
    await applyMoney(row.id, u.money, '기초', 'opening', row.id, '개설')
  }
}

// --- 경기 8 ---
const matchSpecs = [
  { sport: '축구', league: 'EPL', name: '리버풀 vs 첼시', live: true, starts: agoMin(10), tier: 'main' },
  { sport: '농구', league: 'NBA', name: '보스턴 셀틱스 vs 뉴욕 닉스', live: true, starts: agoMin(5), tier: 'main' },
  { sport: '축구', league: 'EPL', name: '토트넘 vs 아스널', live: false, starts: inMin(20), tier: 'main' },
  { sport: '야구', league: 'MLB', name: '탬파베이 레이스 vs 클리블랜드 가디언스', live: false, starts: inMin(25), tier: 'main' },
  { sport: '야구', league: 'KBO', name: 'KIA 타이거즈 vs LG 트윈스', live: false, starts: inMin(90), tier: 'main' },
  { sport: '축구', league: 'K리그1', name: '울산 HD vs 전북 현대', live: false, starts: inMin(120), tier: 'main' },
  { sport: '축구', league: 'EPL', name: '맨체스터 시티 vs 아스널', live: false, starts: inMin(240), tier: 'main' },
  { sport: '농구', league: 'KBL', name: '서울 SK vs 원주 DB', live: false, starts: inMin(300), tier: 'main' },
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
  await applyMoney(userId, -stake, '배팅', 'bet_place', bet.id, `배팅 ${betSeq}`)
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
        values (${bet.id}, 1, '진행 중', '적중', ${payout}, '정산') returning id`
      await applyMoney(userId, payout, '배팅적중', 'bet_win', ev.id, '적중')
      await sql`update nex_bets set status='적중', settlement_revision=1, settled_at=now() where id=${bet.id}`
      for (const leg of legs) {
        if (legs.length === 1 || leg.remaining) {
          await bumpExposure(matchIds[leg.mi], marketIds[leg.mi], outcomeIds[leg.mi][leg.side], stake, payout, -1)
        }
      }
    } else if (status === '미적중') {
      await sql`
        insert into nex_bet_settlement_events (bet_id, revision, from_status, to_status, money_delta, memo)
        values (${bet.id}, 1, '진행 중', '미적중', 0, '정산')`
      await sql`update nex_bets set status='미적중', settlement_revision=1, settled_at=now() where id=${bet.id}`
      for (const leg of legs) {
        if (legs.length === 1 || leg.remaining) {
          await bumpExposure(matchIds[leg.mi], marketIds[leg.mi], outcomeIds[leg.mi][leg.side], stake, payout, -1)
        }
      }
    } else if (status === '취소') {
      const [ev] = await sql`
        insert into nex_bet_settlement_events (bet_id, revision, from_status, to_status, money_delta, memo)
        values (${bet.id}, 1, '진행 중', '취소', ${stake}, '정산') returning id`
      await applyMoney(userId, stake, '배팅취소', 'bet_cancel', ev.id, '취소환불')
      await sql`update nex_bets set status='취소', settlement_revision=1, settled_at=now() where id=${bet.id}`
      for (const leg of legs) {
        if (legs.length === 1 || leg.remaining) {
          await bumpExposure(matchIds[leg.mi], marketIds[leg.mi], outcomeIds[leg.mi][leg.side], stake, payout, -1)
        }
      }
    } else if (status === '적특') {
      const [ev] = await sql`
        insert into nex_bet_settlement_events (bet_id, revision, from_status, to_status, money_delta, memo)
        values (${bet.id}, 1, '진행 중', '적특', ${stake}, '정산') returning id`
      await applyMoney(userId, stake, '적특환불', 'bet_push', ev.id, '적특')
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
    login: REGULARS[i % 8],
    stake: 5000 + i * 100,
    odds: 1.9,
    legs: [{ mi: i % 8, side: 0 }],
    live: i < 4,
    whenLabel: i < 4 ? '실시간' : '일반',
  })
}
for (let i = 0; i < 10; i++) {
  await placeBet({
    login: i % 2 === 0 ? 'kimjs' : 'baekth',
    stake: 20000,
    odds: 1.75,
    legs: [{ mi: 0, side: 0 }],
    live: true,
    whenLabel: '실시간',
  })
}
const multiLeft1 = await placeBet({
  login: 'jungmw',
  stake: 15000,
  odds: 5.2,
  legs: [
    { mi: 5, side: 0, odds: 1.8 },
    { mi: 6, side: 1, odds: 1.9 },
    { mi: 2, side: 0, odds: 1.9, remaining: true },
  ],
})
const multiLeft2 = await placeBet({
  login: 'choihj',
  stake: 12000,
  odds: 4.8,
  legs: [
    { mi: 7, side: 1, odds: 2.0 },
    { mi: 3, side: 0, odds: 1.85, remaining: true },
  ],
})
void multiLeft1
void multiLeft2
for (let i = 0; i < 8; i++) {
  await placeBet({
    login: REGULARS[i % 8],
    stake: 8000,
    odds: 3.4,
    legs: [
      { mi: (i + 1) % 8, side: 0 },
      { mi: (i + 2) % 8, side: 1 },
    ],
  })
}
for (let i = 0; i < 10; i++) {
  await placeBet({
    login: REGULARS[i % 8],
    stake: 3000 + i * 50,
    odds: 2.05,
    legs: [{ mi: (i + 3) % 8, side: i % 2 }],
  })
}
await placeBet({
  login: 'leesu',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 4, side: 0 }],
  status: '적중',
})
await placeBet({
  login: 'yoonah',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 4, side: 1 }],
  status: '미적중',
})
await placeBet({
  login: 'kangst',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 5, side: 0 }],
  status: '취소',
})
await placeBet({
  login: 'parkdh',
  stake: 10000,
  odds: 1.9,
  legs: [{ mi: 0, side: 0 }],
  live: true,
  whenLabel: '실시간',
})
await placeBet({
  login: 'parkdh',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 4, side: 0, status: '적중' }],
  status: '적중',
})
await placeBet({
  login: 'parkdh',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 4, side: 1, status: '미적중' }],
  status: '미적중',
})
await placeBet({
  login: 'parkdh',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 5, side: 0, status: '취소' }],
  status: '취소',
})
await placeBet({
  login: 'parkdh',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 3, side: 0, status: '적특' }],
  status: '적특',
})
await placeBet({
  login: 'parkdh',
  stake: 5000,
  odds: 3.4,
  legs: [
    { mi: 1, side: 0, odds: 1.8, status: '적중' },
    { mi: 2, side: 1, odds: 1.9, status: '진행 중' },
  ],
})
const rsId = await placeBet({
  login: 'seojw',
  stake: 10000,
  odds: 2.0,
  legs: [{ mi: 6, side: 0 }],
  status: '적중',
})
{
  const [bet] = await sql`select * from nex_bets where id = ${rsId}`
  const [ev2] = await sql`
    insert into nex_bet_settlement_events (bet_id, revision, from_status, to_status, money_delta, memo)
    values (${rsId}, 2, '적중', '미적중', ${-bet.potential_payout}, '재정산') returning id`
  await applyMoney(bet.user_id, -Number(bet.potential_payout), '적중회수', 'bet_win_reverse', ev2.id, '재정산')
  await sql`update nex_bets set status='미적중', settlement_revision=2 where id=${rsId}`
  const [ev3] = await sql`
    insert into nex_bet_settlement_events (bet_id, revision, from_status, to_status, money_delta, memo)
    values (${rsId}, 3, '미적중', '적중', ${bet.potential_payout}, '재정산') returning id`
  await applyMoney(bet.user_id, Number(bet.potential_payout), '배팅적중', 'bet_win', ev3.id, '재정산')
  await sql`update nex_bets set status='적중', settlement_revision=3 where id=${rsId}`
}

// --- 입출금 ---
const [dep] = await sql`
  insert into nex_cash_requests (public_id, user_id, type, amount, status, memo, processed_at)
  values ('dep-20261021-1', ${users.hwangsy}, '입금', 50000, '승인', '국민 계좌이체', now()) returning id`
await applyMoney(users.hwangsy, 50000, '입금승인', 'cash_deposit_approve', dep.id, '입금')
await sql`
  insert into nex_cash_requests (public_id, user_id, type, amount, status, memo)
  values ('wd-20261021-1', ${users.ohjw}, '출금', 10000, '대기', '출금 대기')`
await applyMoney(users.ohjw, -10000, '출금홀드', 'cash_withdraw_hold', (
  await sql`select id from nex_cash_requests where public_id='wd-20261021-1'`
)[0].id, '출금홀드')
await sql`
  insert into nex_cash_requests (public_id, user_id, type, amount, status, memo, processed_at)
  values ('wd-20261021-r1', ${users.anjw}, '출금', 5000, '거절', '잔액 부족 아님, 계좌 불일치', now())`

await sql`
  insert into nex_cash_requests (public_id, user_id, type, amount, status, memo)
  values ('wd-20261021-2', ${users.songmh}, '출금', 15000, '대기', '출금 대기')`
await applyMoney(users.songmh, -15000, '출금홀드', 'cash_withdraw_hold', (
  await sql`select id from nex_cash_requests where public_id='wd-20261021-2'`
)[0].id, '출금홀드')

await sql`
  insert into nex_audit_logs (actor, target_type, target_id, action, reason)
  values ('system', 'system', '0', 'data_reload', '운영형 초기 데이터')`

await sql`
  insert into nex_settings (key, value)
  values ('auth.otpRequired', '1')
  on conflict (key) do update set value = '1', updated_at = now()`

await sql`
  insert into nex_wallet_settings (network, address, rate, min_amount, note)
  values ('TRC-20', 'TXY9walletDemoAddrForOps01', '1450', '10', '최소 10 USDT')`

await sql`
  insert into nex_banners (title, visible) values
  ('첫 입금 이벤트', true),
  ('주말 보너스', false),
  ('라이브 배당 안내', true)`

await sql`
  insert into nex_inquiries (user_id, title, body, answer) values
  (${users.leesu}, '입금 미반영 문의', '오전에 국민으로 입금했는데 아직 안 들어왔습니다.', ''),
  (${users.yoonah}, '출금 지연 문의', '출금 심사 상태입니다.', '심사 후 지급 예정입니다.'),
  (${users.kangst}, '경기 정정 문의', '리버풀 경기가 지연됐습니다.', '')`

await sql`
  insert into nex_activity_logs (text) values
  ('관리자 로그인'),
  ('입금 승인 처리'),
  ('배너 노출 변경'),
  ('리스크 알림 확인')`

await sql`
  insert into nex_point_moves (user_id, amount, reason) values
  (${users.leesu}, 1000, '지급'),
  (${users.yoonah}, 500, '지급'),
  (${users.seojw}, 50, '지급'),
  (${users.kangst}, -200, '회수')`

await sql`
  insert into nex_dist_accruals (agent_id, source, amount, balance_after, memo) values
  (${c1.id}, '스포츠', 12000, 48200, '강남라인 적립'),
  (${c2.id}, '스포츠', 8000, 36000, '부산라인 적립')`
await sql`
  insert into nex_dist_payouts (agent_id, amount, memo) values
  (${c1.id}, 5000, '강남라인 정산'),
  (${c2.id}, 3000, '부산라인 정산')`
await sql`update nex_dist_agents set balance = 48200, unpaid = 12000 where id = ${c1.id}`
await sql`update nex_dist_agents set balance = 36000, unpaid = 8000 where id = ${c2.id}`

const [cb1] = await sql`
  insert into nex_casino_bets (user_id, name, kind, stake, payout, status, settled_at)
  values (${users.leesu}, '에볼루션 바카라', 'live', 10000, 19500, '적중', now()) returning id`
await applyMoney(users.leesu, -10000, '카지노', 'casino_place', cb1.id, '바카라')
await applyMoney(users.leesu, 19500, '카지노적중', 'casino_win', cb1.id, '바카라적중')
const [cb2] = await sql`
  insert into nex_casino_bets (user_id, name, kind, stake, payout, status, settled_at)
  values (${users.yoonah}, '프라그마틱 슬롯', 'slot', 5000, 0, '미적중', now()) returning id`
await applyMoney(users.yoonah, -5000, '카지노', 'casino_place', cb2.id, '슬롯')
await sql`
  insert into nex_casino_bets (user_id, name, kind, stake, payout, status)
  values
  (${users.leesu}, '파워볼', 'other', 8000, 16000, '진행 중'),
  (${users.kangst}, '에볼루션 바카라', 'live', 12000, 24000, '진행 중'),
  (${users.seojw}, '프라그마틱 슬롯', 'slot', 5000, 9500, '진행 중')`
for (const [login, stake, memo] of [
  ['leesu', 8000, '파워볼'],
  ['kangst', 12000, '바카라'],
  ['seojw', 5000, '슬롯'],
]) {
  const [open] = await sql`
    select id from nex_casino_bets
    where user_id = ${users[login]} and status = '진행 중' and stake = ${stake}
    order by id desc limit 1`
  await applyMoney(users[login], -stake, '카지노', 'casino_place', open.id, memo)
}

await sql`
  insert into nex_risk_alerts (kind, severity, message, match_id, user_id, acked)
  values
  ('skew', 'high', '리버풀 vs 첼시 홈 쏠림', ${matchIds[0]}, ${users.kimjs}, false),
  ('limit', 'medium', '김지성 라이브 누적 한도 근접', ${matchIds[0]}, ${users.kimjs}, false),
  ('sharp', 'low', '정민우 다폴 접수', ${matchIds[2]}, ${users.jungmw}, true)`

const [reviewBet] = await sql`
  select id, match_name, stake, potential_payout, status, placed_at
  from nex_bets where user_id = ${users.parkdh} order by id limit 1`
if (reviewBet) {
  await sql`
    insert into nex_review_flags (
      bet_id, user_id, recommendation, flagged, ambiguous, backlog,
      match_name, market, selection, stake, potential_payout, bet_status,
      placed_at, event_at, margin_sec, slack_sec, snapshot, horizon_ok,
      badges, reasons, recent_30
    ) values (
      ${reviewBet.id}, ${users.parkdh}, 'void_review', true, false, false,
      ${reviewBet.match_name}, '승패', '홈', ${reviewBet.stake}, ${reviewBet.potential_payout}, ${reviewBet.status},
      ${reviewBet.placed_at}, ${agoMin(2)}, 3, 8, '1-0', true,
      '수상', '접수가 사건+마진 이후', 3
    )`
}
const [reviewBet2] = await sql`
  select id, match_name, stake, potential_payout, status, placed_at
  from nex_bets where user_id = ${users.leesu} order by id limit 1`
if (reviewBet2) {
  await sql`
    insert into nex_review_flags (
      bet_id, user_id, recommendation, flagged, ambiguous, backlog,
      match_name, market, selection, stake, potential_payout, bet_status,
      placed_at, snapshot, badges, reasons, recent_30
    ) values (
      ${reviewBet2.id}, ${users.leesu}, 'weak_evidence', true, false, false,
      ${reviewBet2.match_name}, '승패', '홈', ${reviewBet2.stake}, ${reviewBet2.potential_payout}, ${reviewBet2.status},
      ${reviewBet2.placed_at}, '0-0', '근거 약함', '마진 여유 부족', 1
    )`
}

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
