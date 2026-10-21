/**
 * 리스크 API p95 + SQL 교차검증 + EXPLAIN ANALYZE (로컬)
 */
import postgres from 'postgres'

const BASE = process.env.API_BASE || 'http://127.0.0.1:3000/api'
const url =
  process.env.LOCAL_DATABASE_URL || 'postgresql://nex:nex@127.0.0.1:5432/nex'
if (/211\.110\.16\.130/.test(url)) throw new Error('refuse remote')
const sql = postgres(url, { max: 1 })

async function time(fn, n = 30) {
  const samples = []
  for (let i = 0; i < n; i++) {
    const t0 = performance.now()
    await fn()
    samples.push(performance.now() - t0)
  }
  samples.sort((a, b) => a - b)
  const p95 = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))]
  return {
    n,
    min: Math.round(samples[0] * 10) / 10,
    p50: Math.round(samples[Math.floor(samples.length * 0.5)] * 10) / 10,
    p95: Math.round(p95 * 10) / 10,
    max: Math.round(samples[samples.length - 1] * 10) / 10,
  }
}

const summary = await fetch(`${BASE}/risk/summary`).then((r) => r.json())
const matches = await fetch(`${BASE}/risk/matches?limit=50`).then((r) => r.json())

const [sqlMax] = await sql`
  select coalesce(max(payout_sum - stake_sum), 0)::bigint as max_risk,
         coalesce(sum(stake_sum), 0)::bigint as open_stake
  from nex_risk_exposure
`
const [sqlOpen] = await sql`select count(*)::int as c from nex_bets where status = '진행 중'`

const summaryMatch =
  Number(summary.maxRisk) === Number(sqlMax.max_risk) &&
  Number(summary.openStake) === Number(sqlMax.open_stake) &&
  Number(summary.openBets) === Number(sqlOpen.c)

const benchSummary = await time(() => fetch(`${BASE}/risk/summary`).then((r) => r.json()))
const benchMatches = await time(() =>
  fetch(`${BASE}/risk/matches?limit=20`).then((r) => r.json()),
)
const firstId = matches.items?.[0]?.id
const benchDetail = firstId
  ? await time(() => fetch(`${BASE}/risk/matches/${firstId}`).then((r) => r.json()))
  : null

const explain = await sql.unsafe(`
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT match_id, market_id, outcome_id, stake_sum, payout_sum
FROM nex_risk_exposure
ORDER BY (payout_sum - stake_sum) DESC
LIMIT 20
`)

// 배팅 추가 → summary 반영 실측
const [user] = await sql`select id, money from nex_users where login='leesu' limit 1`
const [mkt] = await sql`
  select mk.id as market_id, mt.id as match_id, o.id as outcome_id
  from nex_markets mk
  join nex_matches mt on mt.id = mk.match_id
  join nex_outcomes o on o.market_id = mk.id
  where mk.suspended = false
  limit 1
`
let reflectMs = null
if (user && mkt && Number(user.money) >= 1000) {
  const before = await fetch(`${BASE}/risk/summary`).then((r) => r.json())
  const t0 = performance.now()
  const placed = await fetch(`${BASE}/bets`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      matchName: 'bench live',
      stake: 1000,
      odds: 1.9,
      potentialPayout: 1900,
      idempotencyKey: `bench-${Date.now()}`,
      marketId: mkt.market_id,
      matchId: mkt.match_id,
      outcomeId: mkt.outcome_id,
    }),
  }).then((r) => r.json())
  let after = before
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 100))
    after = await fetch(`${BASE}/risk/summary`).then((r) => r.json())
    if (after.openStake !== before.openStake || after.openBets !== before.openBets) {
      reflectMs = Math.round(performance.now() - t0)
      break
    }
  }
  void placed
}

console.log(
  JSON.stringify(
    {
      summaryMatch,
      api: summary,
      sql: {
        maxRisk: Number(sqlMax.max_risk),
        openStake: Number(sqlMax.open_stake),
        openBets: sqlOpen.c,
      },
      p95: { summary: benchSummary, matches: benchMatches, detail: benchDetail },
      reflectMs,
      reflectOk: reflectMs != null && reflectMs <= 3000,
      explain: explain.map((r) => r['QUERY PLAN'] || Object.values(r)[0]),
    },
    null,
    2,
  ),
)
await sql.end()
