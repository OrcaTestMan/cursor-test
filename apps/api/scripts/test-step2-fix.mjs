/**
 * [2-보완] 완료 기준 스모크 — 격리용 프로브 회원 사용 후 정리
 */
import postgres from 'postgres'

const BASE = process.env.API_BASE || 'http://localhost:3000/api'
// 셸에 원격 DATABASE_URL이 있어도 로컬만 사용 (야간 안전)
const DATABASE_URL =
  process.env.LOCAL_DATABASE_URL || 'postgresql://nex:nex@127.0.0.1:5432/nex'
if (/211\.110\.16\.130/.test(DATABASE_URL)) {
  throw new Error('test-step2-fix refused remote DB')
}
const sql = postgres(DATABASE_URL, { max: 1 })

async function json(res) {
  const text = await res.text()
  try {
    return { status: res.status, body: JSON.parse(text) }
  } catch {
    return { status: res.status, body: text }
  }
}

async function verify() {
  const r = await json(await fetch(`${BASE}/money-moves/verify`))
  if (r.status !== 200) throw new Error(`verify http ${r.status}`)
  if (r.body.mismatchCount !== 0) {
    throw new Error(`ledger mismatch ${JSON.stringify(r.body)}`)
  }
  return r.body
}

async function ensureProbe(login, money) {
  const rows = await sql`select id from nex_users where login = ${login}`
  let id
  if (rows.length) {
    id = rows[0].id
    // 프로브 관련 원장/신청/배팅 정리 (다른 회원 데이터 보존)
    await sql`delete from nex_bet_settlement_events where bet_id in (select id from nex_bets where user_id = ${id})`
    await sql`delete from nex_bets where user_id = ${id}`
    await sql`delete from nex_cash_requests where user_id = ${id}`
    await sql`delete from nex_money_moves where user_id = ${id}`
    await sql`delete from nex_idempotency_keys where key like ${`probe-${login}-%`}`
    await sql`update nex_users set money = ${money}, points = 0, updated_at = now() where id = ${id}`
  } else {
    const inserted = await sql`
      insert into nex_users (login, nick, password_hash, role, status, money, points)
      values (${login}, ${login}, '', 'member', 'active', ${money}, 0)
      returning id
    `
    id = inserted[0].id
  }
  // 기초 원장으로 잔액 정합 (삭제 후 insert — 프로브 격리)
  await sql`
    insert into nex_money_moves (user_id, amount, balance_after, reason, ref_type, ref_id, memo)
    values (${id}, ${money}, ${money}, '기초/보정', 'balance_fix', ${id}, 'probe reset')
  `
  await sql`update nex_users set money = ${money} where id = ${id}`
  return id
}

async function userMoney(id) {
  const r = await json(await fetch(`${BASE}/users/${id}`))
  if (r.status !== 200) throw new Error(`user ${id}: ${JSON.stringify(r)}`)
  return r.body.money
}

const report = {}

try {
  // --- 1) 출금 동시성: 잔액 10000, 1000원 × 50 ---
  const wdId = await ensureProbe('night_probe_wd', 10000)
  await verify()
  const wdTasks = Array.from({ length: 50 }, (_, i) =>
    fetch(`${BASE}/cash`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: wdId,
        type: '출금',
        amount: 1000,
        memo: `probe-wd-${i}`,
        idempotencyKey: `probe-night_probe_wd-wd-${Date.now()}-${i}`,
      }),
    }).then(json),
  )
  const wdResults = await Promise.all(wdTasks)
  const wdOk = wdResults.filter((r) => r.status < 400)
  const wdFail = wdResults.filter((r) => r.status >= 400)
  const wdMoney = await userMoney(wdId)
  await verify()
  report.withdrawConcurrency = {
    success: wdOk.length,
    fail: wdFail.length,
    money: wdMoney,
    pass: wdOk.length === 10 && wdFail.length === 40 && wdMoney === 0,
  }
  if (!report.withdrawConcurrency.pass) {
    throw new Error(`withdraw concurrency fail ${JSON.stringify(report.withdrawConcurrency)}`)
  }

  // --- 2) 배팅 동시성: 잔액 10000, 스테이크 1000 × 50 ---
  const betId = await ensureProbe('night_probe_bet', 10000)
  await verify()
  const betTasks = Array.from({ length: 50 }, (_, i) =>
    fetch(`${BASE}/bets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: betId,
        matchName: 'Probe Match',
        stake: 1000,
        odds: 1.9,
        potentialPayout: 1900,
        idempotencyKey: `probe-night_probe_bet-bet-${Date.now()}-${i}`,
      }),
    }).then(json),
  )
  const betResults = await Promise.all(betTasks)
  const betOk = betResults.filter((r) => r.status < 400)
  const betFail = betResults.filter((r) => r.status >= 400)
  const betMoney = await userMoney(betId)
  await verify()
  report.betConcurrency = {
    success: betOk.length,
    fail: betFail.length,
    money: betMoney,
    negative: betMoney < 0,
    pass:
      betOk.length === 10 &&
      betFail.length === 40 &&
      betMoney === 0 &&
      betMoney >= 0,
  }
  if (!report.betConcurrency.pass) {
    throw new Error(`bet concurrency fail ${JSON.stringify(report.betConcurrency)}`)
  }

  // --- 3) 재정산: 적중 → 낙첨 → 적중 ---
  const rsId = await ensureProbe('night_probe_rs', 50000)
  const placed = await json(
    await fetch(`${BASE}/bets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: rsId,
        matchName: 'Resettle Match',
        stake: 10000,
        odds: 2,
        potentialPayout: 20000,
        idempotencyKey: `probe-night_probe_rs-place-${Date.now()}`,
      }),
    }),
  )
  if (placed.status >= 400) throw new Error(`place ${JSON.stringify(placed)}`)
  const b = placed.body.id
  const afterPlace = await userMoney(rsId) // 40000
  const win1 = await json(
    await fetch(`${BASE}/bets/${b}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: '적중' }),
    }),
  )
  const afterWin = await userMoney(rsId) // 60000
  await verify()
  const lose = await json(
    await fetch(`${BASE}/bets/${b}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: '미적중' }),
    }),
  )
  const afterLose = await userMoney(rsId) // 40000
  await verify()
  const win2 = await json(
    await fetch(`${BASE}/bets/${b}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: '적중' }),
    }),
  )
  const afterWin2 = await userMoney(rsId) // 60000
  await verify()
  report.resettle = {
    afterPlace,
    afterWin,
    afterLose,
    afterWin2,
    statuses: [win1.status, lose.status, win2.status],
    pass:
      afterPlace === 40000 &&
      afterWin === 60000 &&
      afterLose === 40000 &&
      afterWin2 === 60000 &&
      win1.status < 400 &&
      lose.status < 400 &&
      win2.status < 400,
  }
  if (!report.resettle.pass) {
    throw new Error(`resettle fail ${JSON.stringify(report.resettle)}`)
  }

  // --- 4) 배팅 멱등: 같은 키 2회 ---
  const idId = await ensureProbe('night_probe_idem', 20000)
  const key = `probe-night_probe_idem-once-${Date.now()}`
  const p1 = await json(
    await fetch(`${BASE}/bets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: idId,
        matchName: 'Idem Match',
        stake: 5000,
        odds: 1.5,
        potentialPayout: 7500,
        idempotencyKey: key,
      }),
    }),
  )
  const p2 = await json(
    await fetch(`${BASE}/bets`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: idId,
        matchName: 'Idem Match',
        stake: 5000,
        odds: 1.5,
        potentialPayout: 7500,
        idempotencyKey: key,
      }),
    }),
  )
  const countBets = await sql`select count(*)::int as c from nex_bets where user_id = ${idId}`
  const moneyIdem = await userMoney(idId)
  await verify()
  report.betIdempotency = {
    p1: p1.status,
    p2: p2.status,
    sameId: p1.body?.id === p2.body?.id,
    bets: countBets[0].c,
    money: moneyIdem,
    pass:
      p1.status < 400 &&
      p2.status < 400 &&
      p1.body?.id === p2.body?.id &&
      countBets[0].c === 1 &&
      moneyIdem === 15000,
  }
  if (!report.betIdempotency.pass) {
    throw new Error(`idem fail ${JSON.stringify(report.betIdempotency)}`)
  }

  // --- 5) CHECK: 강제 음수 시도 ---
  let checkRejected = false
  try {
    await sql`update nex_users set money = -1 where login = 'night_probe_idem'`
  } catch (err) {
    checkRejected = String(err?.message || err).includes('nex_users_money_nonneg') ||
      String(err).includes('check')
  }
  const moneyAfterCheck = await sql`select money from nex_users where login = 'night_probe_idem'`
  report.checkConstraint = {
    checkRejected,
    money: Number(moneyAfterCheck[0].money),
    pass: checkRejected && Number(moneyAfterCheck[0].money) >= 0,
  }
  if (!report.checkConstraint.pass) {
    throw new Error(`check fail ${JSON.stringify(report.checkConstraint)}`)
  }

  await verify()
  report.verify = { mismatchCount: 0, pass: true }
  report.PASS = true
  console.log(JSON.stringify(report, null, 2))
  console.log('PASS')
} catch (err) {
  report.PASS = false
  report.error = String(err?.stack || err)
  console.error(JSON.stringify(report, null, 2))
  process.exitCode = 1
} finally {
  await sql.end()
}
