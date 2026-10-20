import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { like } from 'drizzle-orm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { DbService } from './../src/db/db.service.js';
import { users } from './../src/db/schema.js';
import { setupApp } from './../src/setup-app.js';

process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'uploads-e2e-'));

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function uniqueName(prefix: string) {
  return `${prefix}${randomBytes(4).toString('hex')}`;
}

describe('Community phase 1 (e2e)', () => {
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

  async function signup() {
    const agent = request.agent(app.getHttpServer());
    const username = uniqueName('e2e_');
    const nickname = uniqueName('n');
    await agent
      .post('/api/auth/signup')
      .send({ username, nickname, password: 'password123!' })
      .expect(201);
    return { agent, username, nickname };
  }

  it('이미지 업로드 후 글에 붙이고 파일로 조회한다', async () => {
    const { agent, nickname } = await signup();
    const upload = await agent
      .post('/api/uploads')
      .attach('file', PNG_1X1, { filename: 'a.png', contentType: 'image/png' })
      .expect(201);
    expect(upload.body.id).toBeGreaterThan(0);
    expect(upload.body.url).toMatch(/^\/api\/files\//);

    const created = await agent
      .post('/api/posts')
      .send({
        category: 'free',
        title: '사진 글',
        body: '본문입니다 https://youtu.be/dQw4w9WgXcQ',
        imageIds: [upload.body.id],
      })
      .expect(201);
    expect(created.body.images).toHaveLength(1);
    expect(created.body.images[0].id).toBe(upload.body.id);
    expect(created.body.thumbnailId).toBe(upload.body.id);

    await agent.get(`/api/files/${upload.body.id}`).expect(200);

    const list = await agent.get('/api/posts?searchType=title_body&q=사진').expect(200);
    expect(list.body.items.some((item: { id: number }) => item.id === created.body.id)).toBe(
      true,
    );

    const profile = await agent.get(`/api/profiles/${encodeURIComponent(nickname)}`).expect(200);
    expect(profile.body).toMatchObject({ nickname, bio: '' });
    expect(profile.body).not.toHaveProperty('username');
    expect(profile.body).not.toHaveProperty('passwordHash');
    expect(Array.isArray(profile.body.badges)).toBe(true);
  });

  it('텍스트 파일은 업로드 전에 거절한다', async () => {
    const { agent } = await signup();
    const res = await agent
      .post('/api/uploads')
      .attach('file', Buffer.from('not an image!!!!'), {
        filename: 'a.txt',
        contentType: 'text/plain',
      })
      .expect(400);
    expect(res.body.message).toBe('JPEG, PNG, WebP, GIF만 올릴 수 있습니다.');
  });

  it('응원방 메시지는 로그인해야 쓰고 저장된다', async () => {
    const matches = await request(app.getHttpServer()).get('/api/matches?date=2026-10-17');
    const matchId = (matches.body as { id: number }[])[0]?.id;
    if (!matchId) return;
    await request(app.getHttpServer())
      .post(`/api/matches/${matchId}/chat`)
      .send({ body: '화이팅' })
      .expect(401);
    const { agent } = await signup();
    const created = await agent
      .post(`/api/matches/${matchId}/chat`)
      .send({ body: '화이팅' })
      .expect(201);
    expect(created.body.body).toBe('화이팅');
    const list = await agent.get(`/api/matches/${matchId}/chat`).expect(200);
    expect(list.body.items.some((item: { id: number }) => item.id === created.body.id)).toBe(
      true,
    );
  });

  it('자기소개와 응원팀을 저장한다', async () => {
    const { agent } = await signup();
    const teams = await agent.get('/api/teams').expect(200);
    const ids = (teams.body as { id: number }[]).slice(0, 2).map((row) => row.id);
    const res = await agent
      .patch('/api/me/profile')
      .send({ bio: '응원합니다', teamIds: ids, primaryTeamId: ids[0] ?? null })
      .expect(200);
    expect(res.body.bio).toBe('응원합니다');
    if (ids.length > 0) {
      expect(res.body.teams.some((team: { isPrimary: boolean }) => team.isPrimary)).toBe(true);
    }
  });

  it('팔로우·멘션·구독 알림과 숨김을 적용한다', async () => {
    const author = await signup();
    const reader = await signup();

    await reader.agent
      .post(`/api/profiles/${encodeURIComponent(author.nickname)}/follow`)
      .expect(200);
    await reader.agent
      .post(`/api/profiles/${encodeURIComponent(author.nickname)}/follow`)
      .expect(200);
    await author.agent
      .post(`/api/profiles/${encodeURIComponent(author.nickname)}/follow`)
      .expect(400);

    const created = await author.agent
      .post('/api/posts')
      .send({
        category: 'free',
        title: '팔로우 글',
        body: `안녕 @${reader.nickname}`,
      })
      .expect(201);

    const followFeed = await reader.agent.get('/api/posts?followed=true').expect(200);
    expect(
      followFeed.body.items.some((item: { id: number }) => item.id === created.body.id),
    ).toBe(true);

    const notifs = await reader.agent.get('/api/notifications').expect(200);
    const types = (notifs.body.items as { type: string; available: boolean }[]).map(
      (item) => item.type,
    );
    expect(types).toContain('mention');
    expect(types).not.toContain('follow');
    expect(notifs.body.items[0].available).toBe(true);

    await reader.agent.post(`/api/posts/${created.body.id}/subscribe`).expect(200);
    const comment = await reader.agent
      .post(`/api/posts/${created.body.id}/comments`)
      .send({ body: '첫 댓글' })
      .expect(201);
    const authorNotifs = await author.agent.get('/api/notifications').expect(200);
    expect(
      (authorNotifs.body.items as { type: string }[]).some((item) => item.type === 'comment'),
    ).toBe(true);
    const readerAfterComment = await reader.agent.get('/api/notifications').expect(200);
    expect(
      (readerAfterComment.body.items as { type: string }[]).some((item) => item.type === 'comment'),
    ).toBe(false);

    await author.agent
      .post(`/api/posts/${created.body.id}/comments`)
      .send({ body: `@${reader.nickname} 답글`, parentId: comment.body.id })
      .expect(201);
    const afterReply = await reader.agent.get('/api/notifications').expect(200);
    const replyTypes = (afterReply.body.items as { type: string }[]).map((item) => item.type);
    expect(replyTypes.filter((type) => type === 'reply').length).toBe(1);
    expect(replyTypes.filter((type) => type === 'mention').length).toBe(1);

    await reader.agent
      .patch('/api/notifications/settings')
      .send({ comment: false })
      .expect(200);
    const settings = await reader.agent.get('/api/notifications/settings').expect(200);
    expect(settings.body.comment).toBe(false);

    await reader.agent
      .post(`/api/profiles/${encodeURIComponent(author.nickname)}/mute`)
      .expect(200);
    const hidden = await reader.agent.get('/api/posts').expect(200);
    expect(hidden.body.items.some((item: { id: number }) => item.id === created.body.id)).toBe(
      false,
    );
    const profile = await reader.agent
      .get(`/api/profiles/${encodeURIComponent(author.nickname)}`)
      .expect(200);
    expect(profile.body.muted).toBe(true);
    expect(profile.body.followed).toBe(true);
    expect(profile.body).not.toHaveProperty('username');
  });

  it('게시글 투표는 회원당 한 표이고 표가 생기면 선택지를 못 바꾼다', async () => {
    const author = await signup();
    const voter = await signup();
    const closesAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const created = await author.agent
      .post('/api/posts')
      .send({
        category: 'free',
        title: '오늘의 MVP',
        body: '누가 좋을까요',
        poll: { options: ['투수', '타자', '수비'], closesAt },
      })
      .expect(201);
    expect(created.body.poll.options).toHaveLength(3);
    const firstId = created.body.poll.options[0].id as number;
    const secondId = created.body.poll.options[1].id as number;

    await voter.agent
      .post(`/api/posts/${created.body.id}/poll/vote`)
      .send({ optionId: firstId })
      .expect(200);
    const changed = await voter.agent
      .post(`/api/posts/${created.body.id}/poll/vote`)
      .send({ optionId: secondId })
      .expect(200);
    expect(changed.body.myOptionId).toBe(secondId);
    expect(changed.body.totalVotes).toBe(1);

    const locked = await author.agent
      .patch(`/api/posts/${created.body.id}`)
      .send({ poll: { options: ['A', 'B'], closesAt } })
      .expect(400);
    expect(locked.body.message).toBe('표가 있는 투표는 선택지를 바꿀 수 없습니다.');
  });
});
