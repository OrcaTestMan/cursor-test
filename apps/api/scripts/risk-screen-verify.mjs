/**
 * 리스크 화면 = SQL 검증.
 * 감시 목록(/api/risk/matches) · 회원표(/api/risk/members) · 알림(/api/risk/alerts) · 요약.
 */
import postgres from 'postgres'

const dbUrl =
  process.env.LOCAL_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://nex:nex@127.0.0.1:5432/nex'
if (/211\.110\.16\.130/.test(dbUrl)) {
  console.error('risk-screen-verify refused remote DB')
  process.exit(2)
}

const apiBase = process.env.API_BASE || 'http://127.0.0.1:3000'
const sql = postgres(dbUrl, { max: 1 })
const mismatches = []

function cmp(label, a, b) {
  if (Number(a) !== Number(b) && String(a) !== String(b)) {
    mismatches.push({ label, api: a, sql: b })
  }
}

async function fetchJson(path) {
  const res = await fetch(`${apiBase}${path}`)
  if (!res.ok) throw new Error(`${path} ${res.status}`)
  return res.json()
}

try {
  const [summary, matches, members, alerts] = await Promise.all([
    fetchJson('/api/risk/summary'),
    fetchJson('/api/risk/matches?limit=50'),
    fetchJson('/api/risk/members?limit=50'),
    fetchJson('/api/risk/alerts'),
  ])

  const [sqlMax] = await sql`
    SELECT coalesce(max(payout_sum - stake_sum), 0)::bigint AS max_risk,
           coalesce(sum(stake_sum), 0)::bigint AS open_stake
    FROM nex_risk_exposure`
  const [sqlOpen] = await sql`SELECT count(*)::int AS c FROM nex_bets WHERE status = '진행 중'`
  const [sqlAlert] = await sql`SELECT count(*)::int AS c FROM nex_risk_alerts WHERE acked = false`
  const [sqlLive] = await sql`SELECT count(*)::int AS c FROM nex_matches WHERE live = true`
  const [sqlBetZones] = await sql`
    SELECT
      count(*) FILTER (WHERE match_live AND status = '진행 중')::int AS live_count,
      coalesce(sum(stake) FILTER (WHERE match_live AND status = '진행 중'), 0)::bigint AS live_stake,
      count(*) FILTER (WHERE NOT match_live AND status = '진행 중')::int AS prematch_count,
      coalesce(sum(stake) FILTER (WHERE NOT match_live AND status = '진행 중'), 0)::bigint AS prematch_stake
    FROM nex_bets`
  const [sqlCasino] = await sql`
    SELECT
      count(*) FILTER (WHERE kind = 'live' AND status = '진행 중')::int AS live_count,
      coalesce(sum(stake) FILTER (WHERE kind = 'live' AND status = '진행 중'), 0)::bigint AS live_stake,
      count(*) FILTER (WHERE kind = 'slot' AND status = '진행 중')::int AS slot_count,
      coalesce(sum(stake) FILTER (WHERE kind = 'slot' AND status = '진행 중'), 0)::bigint AS slot_stake
    FROM nex_casino_bets`

  cmp('summary.maxRisk', summary.maxRisk, sqlMax.max_risk)
  cmp('summary.openStake', summary.openStake, sqlMax.open_stake)
  cmp('summary.openBets', summary.openBets, sqlOpen.c)
  cmp('summary.unackedAlerts', summary.unackedAlerts, sqlAlert.c)
  cmp('summary.liveMatches', summary.liveMatches, sqlLive.c)
  cmp('summary.liveBets.count', summary.liveBets?.count, sqlBetZones.live_count)
  cmp('summary.liveBets.stake', summary.liveBets?.stake, sqlBetZones.live_stake)
  cmp('summary.prematchBets.count', summary.prematchBets?.count, sqlBetZones.prematch_count)
  cmp('summary.prematchBets.stake', summary.prematchBets?.stake, sqlBetZones.prematch_stake)
  cmp('summary.casinoLive.count', summary.casinoLive?.count, sqlCasino.live_count)
  cmp('summary.casinoLive.stake', summary.casinoLive?.stake, sqlCasino.live_stake)
  cmp('summary.casinoSlot.count', summary.casinoSlot?.count, sqlCasino.slot_count)
  cmp('summary.casinoSlot.stake', summary.casinoSlot?.stake, sqlCasino.slot_stake)

  const sqlMatches = await sql`
    SELECT m.id, m.name, m.league, m.sport, m.live,
      coalesce(sum(e.stake_sum), 0)::bigint AS stake,
      coalesce(max(e.payout_sum - e.stake_sum), 0)::bigint AS max_loss,
      coalesce(sum(e.bet_count), 0)::int AS bet_count
    FROM nex_matches m
    LEFT JOIN nex_risk_exposure e ON e.match_id = m.id
    GROUP BY m.id
    ORDER BY m.id
    LIMIT 50`
  const apiById = new Map((matches.items || []).map((row) => [Number(row.id), row]))
  const sqlById = new Map(sqlMatches.map((row) => [Number(row.id), row]))
  cmp('matches.count', (matches.items || []).length, sqlMatches.length)
  for (const [id, row] of sqlById) {
    const api = apiById.get(id)
    if (!api) {
      mismatches.push({ label: `matches.missing.${id}`, api: null, sql: row.name })
      continue
    }
    cmp(`matches.${id}.stake`, api.stake, row.stake)
    cmp(`matches.${id}.maxLoss`, api.maxLoss, row.max_loss)
    cmp(`matches.${id}.betCount`, api.betCount, row.bet_count)
    cmp(`matches.${id}.name`, api.name, row.name)
    cmp(`matches.${id}.league`, api.league, row.league)
    cmp(`matches.${id}.sport`, api.sport, row.sport)
  }

  const sqlMembers = await sql`
    SELECT
      u.id, u.login, u.nick, u.money,
      COALESCE(s.cnt, 0)::int AS sport_count,
      COALESCE(s.stake, 0)::bigint AS sport_stake,
      COALESCE(s.risk, 0)::bigint AS sport_risk,
      COALESCE(c.cnt, 0)::int AS casino_count,
      COALESCE(c.stake, 0)::bigint AS casino_stake,
      COALESCE(c.risk, 0)::bigint AS casino_risk
    FROM nex_users u
    LEFT JOIN (
      SELECT user_id, count(*)::int AS cnt,
        coalesce(sum(stake), 0)::bigint AS stake,
        coalesce(sum(GREATEST(potential_payout - stake, 0)), 0)::bigint AS risk
      FROM nex_bets WHERE status = '진행 중' GROUP BY user_id
    ) s ON s.user_id = u.id
    LEFT JOIN (
      SELECT user_id, count(*)::int AS cnt,
        coalesce(sum(stake), 0)::bigint AS stake,
        coalesce(sum(GREATEST(payout - stake, 0)), 0)::bigint AS risk
      FROM nex_casino_bets WHERE status = '진행 중' GROUP BY user_id
    ) c ON c.user_id = u.id
    WHERE u.role = 'member'
    ORDER BY u.id
    LIMIT 50`
  cmp('members.count', (members.items || []).length, sqlMembers.length)
  const memApi = new Map((members.items || []).map((row) => [Number(row.id), row]))
  for (const row of sqlMembers) {
    const api = memApi.get(Number(row.id))
    if (!api) {
      mismatches.push({ label: `members.missing.${row.id}`, api: null, sql: row.login })
      continue
    }
    cmp(`members.${row.login}.money`, api.money, row.money)
    cmp(`members.${row.login}.sportCount`, api.sportCount, row.sport_count)
    cmp(`members.${row.login}.sportStake`, api.sportStake, row.sport_stake)
    cmp(`members.${row.login}.sportRisk`, api.sportRisk, row.sport_risk)
    cmp(`members.${row.login}.casinoCount`, api.casinoCount, row.casino_count)
    cmp(`members.${row.login}.casinoStake`, api.casinoStake, row.casino_stake)
    cmp(`members.${row.login}.casinoRisk`, api.casinoRisk, row.casino_risk)
  }

  const sqlAlerts = await sql`
    SELECT id, kind, severity, message, acked
    FROM nex_risk_alerts
    ORDER BY id DESC
    LIMIT 100`
  const apiAlerts = Array.isArray(alerts) ? alerts : []
  cmp('alerts.count', apiAlerts.length, sqlAlerts.length)
  const alertApi = new Map(apiAlerts.map((row) => [Number(row.id), row]))
  for (const row of sqlAlerts) {
    const api = alertApi.get(Number(row.id))
    if (!api) {
      mismatches.push({ label: `alerts.missing.${row.id}`, api: null, sql: row.message })
      continue
    }
    cmp(`alerts.${row.id}.kind`, api.kind, row.kind)
    cmp(`alerts.${row.id}.message`, api.message, row.message)
    cmp(`alerts.${row.id}.acked`, Boolean(api.acked), Boolean(row.acked))
  }

  const report = {
    ok: mismatches.length === 0,
    mismatchCount: mismatches.length,
    mismatches,
    counts: {
      matches: sqlMatches.length,
      members: sqlMembers.length,
      alerts: sqlAlerts.length,
    },
  }
  console.log(JSON.stringify(report, null, 2))
  process.exitCode = report.ok ? 0 : 1
} catch (err) {
  console.error(String(err?.stack || err))
  process.exitCode = 2
} finally {
  await sql.end({ timeout: 3 })
}
