/**
 * 서버용 기본 시드. 테스트 회원·배팅·프로브 데이터를 넣지 않는다.
 * ALLOW_SEED_OPS=1 필수. 이미 회원이 있으면 관리자/설정만 보정하고 끝낸다.
 */
import postgres from 'postgres'

if (process.env.ALLOW_SEED_OPS !== '1') {
  console.error('seed-ops blocked (need ALLOW_SEED_OPS=1)')
  process.exit(2)
}

const url =
  process.env.LOCAL_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://nex:nex@127.0.0.1:5432/nex'

const sql = postgres(url, { max: 1 })
const adminLogin = process.env.ADMIN_USERNAME || 'admin'

try {
  const [users] = await sql`select count(*)::int as c from nex_users`
  if (!users.c) {
    await sql`
      insert into nex_users (login, nick, role, money, points)
      values (${adminLogin}, '관리자', 'admin', 0, 0)
    `
    console.log('seed-ops: created admin', adminLogin)
  } else {
    console.log('seed-ops: users already exist', users.c)
  }

  const [wallet] = await sql`select count(*)::int as c from nex_wallet_settings`
  if (!wallet.c) {
    await sql`
      insert into nex_wallet_settings (network, address, rate, min_amount, note)
      values ('TRC-20', '', '1450', '10', '')
    `
    console.log('seed-ops: wallet settings inserted')
  }

  const [risk] = await sql`select count(*)::int as c from nex_risk_settings`
  if (!risk.c) {
    await sql`insert into nex_risk_settings default values`
    console.log('seed-ops: risk settings inserted')
  }

  console.log('seed-ops ok')
} finally {
  await sql.end({ timeout: 3 })
}
