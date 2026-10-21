import 'dotenv/config'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types.js'
import * as argon2 from 'argon2'
import { generateSecret, generateSync } from 'otplib'
import { AppModule } from './../src/app.module.js'
import { AuthService } from './../src/auth/auth.service.js'
import { IDLE_MS } from './../src/auth/auth.constants.js'
import { migrateOnBoot } from './../src/db/migrate-on-boot.js'
import { DbService } from './../src/db/db.service.js'
import { admins } from './../src/db/schema.js'
import { setupApp } from './../src/setup-app.js'

type AdminSeed = {
  login: string
  password: string
  totp: () => string
  role: 'superadmin' | 'operator' | 'agent'
}

async function createApp() {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()
  const app = moduleFixture.createNestApplication<INestApplication<App>>()
  setupApp(app)
  await app.init()
  return app
}

function originOf() {
  return (process.env.WEB_ORIGIN || 'http://localhost:5173').replace(/\/$/, '')
}

function cookieOf(res: { headers: Record<string, unknown> }) {
  const raw = res.headers['set-cookie']
  const list = Array.isArray(raw) ? raw : raw ? [String(raw)] : []
  return list.map((item) => String(item).split(';')[0]).join('; ')
}

const KNOWN_API_ROUTES = [
  ['GET', '/api/users'],
  ['GET', '/api/users/:id'],
  ['PATCH', '/api/users/:id/status'],
  ['GET', '/api/cash'],
  ['POST', '/api/cash'],
  ['GET', '/api/cash/:id'],
  ['PATCH', '/api/cash/:id/status'],
  ['GET', '/api/bets'],
  ['POST', '/api/bets'],
  ['GET', '/api/bets/:id'],
  ['PATCH', '/api/bets/:id/status'],
  ['GET', '/api/casino-bets'],
  ['POST', '/api/casino-bets'],
  ['GET', '/api/casino-bets/:id'],
  ['PATCH', '/api/casino-bets/:id/status'],
  ['GET', '/api/money-moves'],
  ['GET', '/api/money-moves/verify'],
  ['POST', '/api/money-moves/backfill'],
  ['POST', '/api/money-moves/adjust'],
  ['POST', '/api/money-moves/point-convert'],
  ['GET', '/api/money-moves/:id'],
  ['GET', '/api/risk/summary'],
  ['GET', '/api/risk/matches'],
  ['GET', '/api/risk/matches/:id'],
  ['GET', '/api/risk/members'],
  ['GET', '/api/risk/alerts'],
  ['PATCH', '/api/risk/alerts/:id/ack'],
  ['POST', '/api/risk/actions'],
  ['GET', '/api/risk/settings'],
  ['PUT', '/api/risk/settings'],
  ['GET', '/api/risk/stream'],
  ['GET', '/api/auth/me'],
  ['POST', '/api/auth/logout'],
] as const

function collectRoutes(app: INestApplication) {
  const instance = app.getHttpAdapter().getInstance() as {
    router?: { stack?: unknown[] }
    _router?: { stack?: unknown[] }
  }
  const stack = instance.router?.stack || instance._router?.stack || []
  const routes: { method: string; path: string }[] = []
  const verbs = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  for (const layer of stack as Array<{
    route?: { path: string; methods: Record<string, boolean> }
  }>) {
    if (!layer.route) continue
    let path = layer.route.path
    if (!path.startsWith('/')) path = `/${path}`
    if (!path.startsWith('/api')) path = `/api${path}`
    if (path === '/api' || path === '/api/') continue
    for (const [method, on] of Object.entries(layer.route.methods)) {
      const verb = method.toUpperCase()
      if (on && verbs.has(verb)) routes.push({ method: verb, path })
    }
  }
  const known = KNOWN_API_ROUTES.map(([method, path]) => ({ method, path }))
  const merged = [...known, ...routes]
  const uniq = new Map(merged.map((item) => [`${item.method} ${item.path}`, item]))
  return [...uniq.values()]
}

function samplePath(path: string) {
  return path.replace(/:([^/]+)/g, '1')
}

function isPublic(method: string, path: string) {
  return (
    (method === 'GET' && path === '/api/health') ||
    (method === 'POST' && path === '/api/auth/login')
  )
}

async function seedAdmin(
  app: INestApplication,
  role: AdminSeed['role'],
  login: string,
): Promise<AdminSeed> {
  const secret = generateSecret()
  const password = 'correct-horse'
  const db = app.get(DbService).db
  await db.insert(admins).values({
    login,
    nick: role,
    passwordHash: await argon2.hash(password, { type: argon2.argon2id }),
    totpSecret: secret,
    role,
  })
  return {
    login,
    password,
    role,
    totp: () => generateSync({ secret }),
  }
}

async function login(
  app: INestApplication,
  admin: AdminSeed,
) {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({
      login: admin.login,
      password: admin.password,
      totp: admin.totp(),
    })
  expect(res.status).toBe(200)
  return cookieOf(res)
}

describe('API (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    await migrateOnBoot()
    app = await createApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /api/health', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        if (res.body?.status !== 'ok') {
          throw new Error(`unexpected health body: ${JSON.stringify(res.body)}`)
        }
      })
  })
})

describe.sequential('관리자 세션 (e2e)', () => {
  let app: INestApplication<App>
  let boss: AdminSeed
  let agent: AdminSeed

  beforeAll(async () => {
    await migrateOnBoot()
    app = await createApp()
    const suffix = String(Date.now())
    boss = await seedAdmin(app, 'superadmin', `boss-${suffix}`)
    agent = await seedAdmin(app, 'agent', `agent-${suffix}`)
  })

  afterAll(async () => {
    await app.close()
  })

  it('세션 없이 등록된 API는 health·login 외 401', async () => {
    const routes = collectRoutes(app)
    expect(routes.length).toBeGreaterThan(8)
    const seen = new Set<string>()
    for (const route of routes) {
      const key = `${route.method} ${route.path}`
      if (seen.has(key)) continue
      seen.add(key)
      if (isPublic(route.method, route.path)) continue
      const path = samplePath(route.path)
      const req = request(app.getHttpServer())[route.method.toLowerCase()] as
        | ((p: string) => request.Test)
        | undefined
      if (!req) continue
      const res = await req(path)
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.method)) {
        expect([401, 403], key).toContain(res.status)
      } else {
        expect(res.status, key).toBe(401)
      }
    }
  })

  it('GET /nex/dashboard.html 은 로그인으로 보낸다', async () => {
    const res = await request(app.getHttpServer()).get('/nex/dashboard.html')
    expect([302, 401]).toContain(res.status)
    if (res.status === 302) {
      expect(res.headers.location).toBe('/nex/login.html')
    }
  })

  it('TOTP 오류는 401', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/login').send({
      login: boss.login,
      password: boss.password,
      totp: '000000',
    })
    expect(res.status).toBe(401)
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/)
  })

  it('로그인 후 me·회원 목록이 열리고 해시는 없다', async () => {
    const cookie = await login(app, boss)
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
    expect(me.status).toBe(200)
    expect(me.body.login).toBe(boss.login)
    expect(me.body.passwordHash).toBeUndefined()
    const users = await request(app.getHttpServer())
      .get('/api/users?range=all')
      .set('Cookie', cookie)
    expect(users.status).toBe(200)
    expect(JSON.stringify(users.body)).not.toMatch(/passwordHash/)
  })

  it('상담원은 잔액 조정이 403', async () => {
    const cookie = await login(app, agent)
    const origin = originOf()
    const res = await request(app.getHttpServer())
      .post('/api/money-moves/adjust')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ userId: 1, amount: 1, reason: 'test', memo: 'test' })
    expect(res.status).toBe(403)
  })

  it('로그인 실패 5회면 잠긴다', async () => {
    const suffix = `lock-${Date.now()}`
    const locked = await seedAdmin(app, 'operator', suffix)
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app.getHttpServer()).post('/api/auth/login').send({
        login: locked.login,
        password: 'wrong-password',
        totp: '000000',
      })
      expect(res.status).toBe(401)
    }
    const again = await request(app.getHttpServer()).post('/api/auth/login').send({
      login: locked.login,
      password: locked.password,
      totp: locked.totp(),
    })
    expect(again.status).toBe(401)
    expect(String(again.body.message)).toMatch(/잠/)
  })

  it('유휴 30분이 지나면 세션이 끊긴다', async () => {
    const auth = app.get(AuthService)
    const start = Date.now()
    auth.now = () => start
    const cookie = await login(app, boss)
    auth.now = () => start + IDLE_MS + 1000
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
    expect(me.status).toBe(401)
    auth.now = () => Date.now()
  })

  it('로그아웃 후 me 는 401', async () => {
    const cookie = await login(app, boss)
    const out = await request(app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', originOf())
    expect(out.status).toBe(200)
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Cookie', cookie)
    expect(me.status).toBe(401)
  })
})
