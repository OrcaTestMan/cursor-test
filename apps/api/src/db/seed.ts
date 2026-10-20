import { count } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')
  const client = postgres(url, { max: 1 })
  const db = drizzle(client, { schema })

  const [{ value: userCount }] = await db
    .select({ value: count() })
    .from(schema.users)
  if (userCount > 0) {
    console.log('nex seed skip: users already exist')
    await client.end()
    return
  }

  const adminLogin = process.env.ADMIN_USERNAME || 'admin'
  const [admin] = await db
    .insert(schema.users)
    .values({
      login: adminLogin,
      nick: '관리자',
      role: 'admin',
      money: 0,
      points: 0,
    })
    .returning()

  const members = await db
    .insert(schema.users)
    .values([
      { login: 'test', nick: '테스트유저 (t)', money: 66924, points: 0 },
      { login: 'test123', nick: '테스트용 (t)', money: 10000, points: 0 },
      { login: 'user03', nick: '회원03 (t)', money: 18500, points: 200 },
      { login: 'user04', nick: '회원04 (t)', money: 12400, points: 0, status: 'blocked', blockReason: '중복 계정 (t)' },
      { login: 'user05', nick: '회원05 (t)', money: 8600, points: 50 },
    ])
    .returning()

  const byLogin = Object.fromEntries(members.map((u) => [u.login, u]))

  await db.insert(schema.cashRequests).values([
    {
      publicId: 't-cash-1',
      userId: byLogin.test.id,
      type: '입금',
      amount: 50000,
      status: '승인',
      memo: '계좌이체 (t)',
      processedAt: new Date(),
    },
    {
      publicId: 't-cash-2',
      userId: byLogin.test123.id,
      type: '출금',
      amount: 20000,
      status: '대기',
      memo: 'USDT (t)',
    },
  ])

  await db.insert(schema.bets).values([
    {
      userId: byLogin.test.id,
      matchName: '밀워키 브루어스 vs 시카고 컵스',
      league: 'MLB (t)',
      sport: '야구',
      market: '핸디캡',
      line: '-1.5',
      whenLabel: '실시간',
      stake: 10000,
      odds: '9.024',
      potentialPayout: 92943,
      status: '진행 중',
      matchLive: true,
    },
    {
      userId: byLogin.test123.id,
      matchName: '맨체스터 시티 vs 아스널 (t)',
      league: 'EPL (t)',
      sport: '축구',
      market: '핸디캡',
      line: '-0.5',
      whenLabel: '실시간',
      stake: 15000,
      odds: '2.150',
      potentialPayout: 32250,
      status: '진행 중',
      matchLive: true,
    },
    {
      userId: byLogin.user05.id,
      matchName: '토트넘 vs 첼시 (t)',
      league: 'EPL (t)',
      sport: '축구',
      market: '승무패',
      line: '무',
      whenLabel: '일반',
      stake: 9000,
      odds: '3.200',
      potentialPayout: 28800,
      status: '진행 중',
    },
  ])

  await db.insert(schema.casinoBets).values([
    {
      userId: byLogin.user03.id,
      name: '에볼루션 바카라 (t)',
      kind: 'live',
      stake: 12000,
      payout: 24000,
      status: '진행 중',
    },
    {
      userId: byLogin.user05.id,
      name: '프라그마틱 슬롯 (t)',
      kind: 'slot',
      stake: 5000,
      payout: 9500,
      status: '진행 중',
    },
  ])

  const [agentA] = await db
    .insert(schema.distAgents)
    .values({
      code: 'A01',
      login: 'dist_a',
      nick: 'A라인총판 (t)',
      lineName: 'A라인 (t)',
      balance: 48200,
      unpaid: 12000,
    })
    .returning()

  await db.insert(schema.distAccruals).values({
    agentId: agentA.id,
    source: '스포츠',
    amount: 12000,
    balanceAfter: 48200,
    memo: '시드 적립 (t)',
  })

  await db.insert(schema.distPayouts).values({
    agentId: agentA.id,
    amount: 5000,
    memo: '테스트 지급 (t)',
  })

  await db.insert(schema.walletSettings).values({
    network: 'TRC-20',
    address: '',
    rate: '1450',
    minAmount: '10',
    note: '',
  })

  await db.insert(schema.activityLogs).values({
    text: `NEX DB 시드 적용 · admin#${admin.id}`,
  })

  console.log('nex seed ok')
  await client.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
