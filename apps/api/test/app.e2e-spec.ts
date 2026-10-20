import 'dotenv/config'
import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import { App } from 'supertest/types.js'
import { AppModule } from './../src/app.module.js'
import { setupApp } from './../src/setup-app.js'

describe('API (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    setupApp(app)
    await app.init()
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
