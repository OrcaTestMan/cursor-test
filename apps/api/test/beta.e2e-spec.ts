import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { like } from 'drizzle-orm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { DbService } from './../src/db/db.service.js';
import { users } from './../src/db/schema.js';
import { setupApp } from './../src/setup-app.js';

function uniqueName(prefix: string) {
  return `${prefix}${randomBytes(4).toString('hex')}`;
}

describe('Beta API (e2e)', () => {
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

  async function signup(prefix = 'e2e_') {
    const agent = request.agent(app.getHttpServer());
    const username = uniqueName(prefix);
    const nickname = uniqueName('n');
    await agent
      .post('/api/auth/signup')
      .send({ username, nickname, password: 'password123!' })
      .expect(201);
    return { agent, username, nickname };
  }

  async function loginAdmin() {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/api/auth/login')
      .send({
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      })
      .expect(200);
    return agent;
  }

  it('내 글 추천은 400', async () => {
    const { agent } = await signup();
    const created = await agent
      .post('/api/posts')
      .send({ category: 'free', title: '내 글 추천 테스트', body: '본문입니다.' })
      .expect(201);
    const res = await agent.post(`/api/posts/${created.body.id}/like`).expect(400);
    expect(res.body.message).toBe('내 글은 추천할 수 없습니다.');
  });

  it('답글의 답글은 400', async () => {
    const author = await signup();
    const commenter = await signup();
    const replier = await signup();
    const created = await author.agent
      .post('/api/posts')
      .send({ category: 'free', title: '답글 깊이 테스트', body: '본문입니다.' })
      .expect(201);
    const comment = await commenter.agent
      .post(`/api/posts/${created.body.id}/comments`)
      .send({ body: '원 댓글입니다.' })
      .expect(201);
    const reply = await replier.agent
      .post(`/api/posts/${created.body.id}/comments`)
      .send({ body: '답글입니다.', parentId: comment.body.id })
      .expect(201);
    const res = await author.agent
      .post(`/api/posts/${created.body.id}/comments`)
      .send({ body: '답글의 답글', parentId: reply.body.id })
      .expect(400);
    expect(res.body.message).toBe('답글에는 답글을 달 수 없습니다.');
  });

  it('같은 대상 중복 신고는 409', async () => {
    const author = await signup();
    const reporter = await signup();
    const created = await author.agent
      .post('/api/posts')
      .send({ category: 'free', title: '신고 중복 테스트', body: '본문입니다.' })
      .expect(201);
    await reporter.agent
      .post('/api/reports')
      .send({
        targetType: 'post',
        targetId: created.body.id,
        reason: 'spam',
      })
      .expect(201);
    const res = await reporter.agent
      .post('/api/reports')
      .send({
        targetType: 'post',
        targetId: created.body.id,
        reason: 'abuse',
      })
      .expect(409);
    expect(res.body.message).toBe('이미 신고하셨습니다.');
  });

  it('시작 전 경기에 응원할 수 있다', async () => {
    const admin = await loginAdmin();
    const leagues = await admin.get('/api/leagues').expect(200);
    let leagueId = leagues.body[0]?.id as number | undefined;
    if (!leagueId) {
      const createdLeague = await admin
        .post('/api/admin/leagues')
        .send({ name: uniqueName('리그'), sport: '축구' })
        .expect(201);
      leagueId = createdLeague.body.id;
    }
    const kickoffAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const match = await admin
      .post('/api/admin/matches')
      .send({
        leagueId,
        homeTeam: '홈테스트',
        awayTeam: '원정테스트',
        kickoffAt,
      })
      .expect(201);
    const { agent } = await signup();
    const res = await agent
      .put(`/api/matches/${match.body.id}/cheer`)
      .send({ side: 'home' })
      .expect(200);
    expect(res.body.open).toBe(true);
    expect(res.body.myCheer).toBe('home');
    expect(res.body.cheers.home).toBeGreaterThanOrEqual(1);
  });

  it('금칙어가 들어간 가입은 400', async () => {
    const admin = await loginAdmin();
    const word = `금칙${randomBytes(3).toString('hex')}`;
    const created = await admin
      .post('/api/admin/forbidden-words')
      .send({ word })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post('/api/auth/signup')
      .send({
        username: uniqueName('e2e_'),
        nickname: word,
        password: 'password123!',
      })
      .expect(400);
    expect(res.body.message).toContain('사용할 수 없는 단어가 포함되어 있습니다');
    await admin.delete(`/api/admin/forbidden-words/${created.body.id}`).expect(204);
  });

  it('설정 변경 후 관리 이력이 남는다', async () => {
    const admin = await loginAdmin();
    const before = await admin.get('/api/admin/settings').expect(200);
    await admin.put('/api/admin/settings').send(before.body).expect(200);
    const logs = await admin.get('/api/admin/logs?action=settings').expect(200);
    expect(logs.body.items.some((item: { action: string }) => item.action.startsWith('settings'))).toBe(
      true,
    );
  });
});
