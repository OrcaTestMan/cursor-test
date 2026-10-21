import 'dotenv/config'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types.js'
import { AppModule } from './../src/app.module.js'
import { basicAuthFailLimiter } from './../src/security/basic-auth.middleware.js'
import { setupApp } from './../src/setup-app.js'

async function createApp() {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()
  const app = moduleFixture.createNestApplication<INestApplication<App>>()
  setupApp(app)
  await app.init()
  return app
}

describe('API (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
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

describe.sequential('임시 Basic 인증 (e2e)', () => {
  let app: INestApplication<App>
  const prevUser = process.env.TEMP_BASIC_AUTH_USER
  const prevPass = process.env.TEMP_BASIC_AUTH_PASS
  const user = 'temp-ops'
  const pass = 'temp-pass-value'
  const basic = Buffer.from(`${user}:${pass}`, 'utf8').toString('base64')

  beforeAll(async () => {
    process.env.TEMP_BASIC_AUTH_USER = user
    process.env.TEMP_BASIC_AUTH_PASS = pass
    app = await createApp()
  })

  afterAll(async () => {
    await app.close()
    basicAuthFailLimiter.clear()
    if (prevUser === undefined) delete process.env.TEMP_BASIC_AUTH_USER
    else process.env.TEMP_BASIC_AUTH_USER = prevUser
    if (prevPass === undefined) delete process.env.TEMP_BASIC_AUTH_PASS
    else process.env.TEMP_BASIC_AUTH_PASS = prevPass
  })

  afterEach(() => {
    basicAuthFailLimiter.clear()
  })

  it('인증 없이 회원 목록 → 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/users?range=all')
    expect(res.status).toBe(401)
    expect(res.headers['www-authenticate']).toMatch(/^Basic /)
    expect(res.body.message).toBe('인증이 필요합니다.')
  })

  it('틀린 값 → 401', async () => {
    const wrong = Buffer.from(`${user}:nope`, 'utf8').toString('base64')
    const res = await request(app.getHttpServer())
      .get('/api/users?range=all')
      .set('Authorization', `Basic ${wrong}`)
    expect(res.status).toBe(401)
  })

  it('맞는 값 → 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users?range=all')
      .set('Authorization', `Basic ${basic}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.items)).toBe(true)
  })

  it('127.0.0.1 GET /api/health 는 인증 없이 200', async () => {
    const res = await request(app.getHttpServer()).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('관리자 화면도 인증 없이 401', async () => {
    const res = await request(app.getHttpServer()).get('/nex/users.html')
    expect(res.status).toBe(401)
  })

  it('같은 IP에서 10회 실패하면 429이고 맞는 값도 거부한다', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app.getHttpServer()).get('/api/users')
      statuses.push(res.status)
    }
    expect(statuses.slice(0, 9).every((code) => code === 401)).toBe(true)
    expect(statuses[9]).toBe(429)
    const locked = await request(app.getHttpServer())
      .get('/api/users?range=all')
      .set('Authorization', `Basic ${basic}`)
    expect(locked.status).toBe(429)
    expect(locked.body.message).toBe(
      '요청이 너무 많습니다. 잠시 뒤 다시 시도해 주세요.',
    )
  })
})
