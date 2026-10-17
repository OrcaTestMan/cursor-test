import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { like } from 'drizzle-orm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/setup-app.js';
import { DbService } from './../src/db/db.service.js';
import { users } from './../src/db/schema.js';

function uniqueName(prefix: string) {
  return `${prefix}${randomBytes(4).toString('hex')}`;
}

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app
      .get(DbService)
      .db.delete(users)
      .where(like(users.username, 'e2e\\_%'));
    await app.close();
  });

  it('GET /api/health', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('signup → me → logout', async () => {
    const agent = request.agent(app.getHttpServer());
    const username = uniqueName('e2e_');
    const nickname = uniqueName('n');

    const signup = await agent
      .post('/api/auth/signup')
      .send({ username, nickname, password: 'password123!' })
      .expect(201);
    expect(signup.body).toMatchObject({
      username,
      nickname,
      role: 'user',
      status: 'active',
    });
    expect(signup.body).not.toHaveProperty('passwordHash');
    expect(String(signup.headers['set-cookie'])).toContain('sid=');

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body).toMatchObject({ username, nickname });

    await agent.post('/api/auth/logout').expect(204);
    await agent.get('/api/auth/me').expect(401);
  });

  it('POST /api/auth/login with wrong password → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: uniqueName('nouser_'), password: 'wrong-password' })
      .expect(401);
    expect(res.body.message).toBe('아이디 또는 비밀번호가 맞지 않습니다.');
  });

  it('POST /api/posts without login → 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/posts')
      .send({ category: 'free', title: '제목', body: '내용' })
      .expect(401);
    expect(res.body.message).toBe('로그인이 필요합니다.');
  });

  it('GET /api/admin/dashboard as normal user → 403', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/signup')
      .send({
        username: uniqueName('e2e_'),
        nickname: uniqueName('n'),
        password: 'password123!',
      })
      .expect(201);
    const res = await agent.get('/api/admin/dashboard').expect(403);
    expect(res.body.message).toBe('관리자만 이용할 수 있습니다.');
  });

  it('GET /api/admin/dashboard as admin → 200', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/login')
      .send({
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(200);
    const res = await agent.get('/api/admin/dashboard').expect(200);
    expect(res.body).toHaveProperty('users.total');
    expect(Array.isArray(res.body.recentPosts)).toBe(true);
  });
});
