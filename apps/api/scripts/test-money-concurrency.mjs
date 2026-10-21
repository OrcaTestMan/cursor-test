/**
 * [2] 동시성·멱등 스모크
 * 사전: API http://localhost:3000 기동, DB 시드 회원 존재
 */
const BASE = process.env.API_BASE || 'http://localhost:3000/api'

async function json(res) {
  const text = await res.text()
  try {
    return { status: res.status, body: JSON.parse(text) }
  } catch {
    return { status: res.status, body: text }
  }
}

async function main() {
  const users = await json(await fetch(`${BASE}/users?range=all`))
  if (users.status !== 200) throw new Error(`users failed: ${JSON.stringify(users)}`)
  const test = users.body.items.find((u) => u.login === 'leesu')
  if (!test) throw new Error('leesu user missing')

  // --- 멱등: 입금 승인 동일 키 2회 ---
  const deposit = await json(
    await fetch(`${BASE}/cash`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: test.id,
        type: '입금',
        amount: 1000,
        memo: 'idem-test',
        idempotencyKey: `dep-create-${Date.now()}`,
      }),
    }),
  )
  if (deposit.status >= 400) throw new Error(`deposit create: ${JSON.stringify(deposit)}`)
  const cashId = deposit.body.id
  const idem = `approve-${cashId}-once`
  const a1 = await json(
    await fetch(`${BASE}/cash/${cashId}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: '승인', memo: 'idem', idempotencyKey: idem }),
    }),
  )
  const a2 = await json(
    await fetch(`${BASE}/cash/${cashId}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: '승인', memo: 'idem', idempotencyKey: idem }),
    }),
  )
  const afterIdem = await json(await fetch(`${BASE}/users/${test.id}`))
  console.log('idempotency', {
    first: a1.status,
    second: a2.status,
    sameBody: JSON.stringify(a1.body) === JSON.stringify(a2.body),
    money: afterIdem.body.money,
  })
  if (a1.status >= 400 || a2.status >= 400) {
    throw new Error(`idem approve failed ${JSON.stringify({ a1, a2 })}`)
  }

  // --- 동시 출금 50건 ---
  const before = await json(await fetch(`${BASE}/users/${test.id}`))
  const startMoney = before.body.money
  const amount = 100
  const tasks = Array.from({ length: 50 }, (_, i) =>
    fetch(`${BASE}/cash`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        userId: test.id,
        type: '출금',
        amount,
        memo: `concurrent-${i}`,
        idempotencyKey: `wd-${Date.now()}-${i}-${Math.random()}`,
      }),
    }).then(json),
  )
  const results = await Promise.all(tasks)
  const ok = results.filter((r) => r.status < 400)
  const fail = results.filter((r) => r.status >= 400)
  const after = await json(await fetch(`${BASE}/users/${test.id}`))
  const endMoney = after.body.money
  const negative = endMoney < 0
  const expectedMin = startMoney - ok.length * amount
  console.log('concurrency', {
    startMoney,
    endMoney,
    success: ok.length,
    fail: fail.length,
    negative,
    expectedEnd: expectedMin,
    match: endMoney === expectedMin,
  })
  if (negative) throw new Error('negative balance')
  if (endMoney !== expectedMin) throw new Error('balance mismatch after concurrent withdraws')

  const verify = await json(await fetch(`${BASE}/money-moves/verify`))
  console.log('verify', verify.body)
  if (verify.body.mismatchCount !== 0) throw new Error('ledger mismatch')
  console.log('PASS')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
