import { Logger } from '@nestjs/common';
import { and, count, eq, gt, gte, inArray, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hashPassword } from '../auth/password.js';
import { addDays, kstToday } from '../common/kst.js';
import * as schema from './schema.js';
import {
  commentLikes,
  comments,
  forbiddenWords,
  inquiries,
  leagues,
  matchCheers,
  matches,
  matchPredictions,
  messages,
  messageSends,
  postLikes,
  posts,
  settings,
  teams,
  users,
} from './schema.js';

type Db = ReturnType<typeof drizzle<typeof schema>>;

type MatchStatus = (typeof matches.$inferInsert)['status'];

const logger = new Logger('Seed');

const LEAGUES = [
  {
    name: 'K리그1',
    sport: '축구',
    time: '19:30',
    teams: [
      ['울산 HD', '울산문수축구경기장'],
      ['전북 현대', '전주월드컵경기장'],
      ['포항 스틸러스', '포항스틸야드'],
      ['FC 서울', '서울월드컵경기장'],
      ['광주 FC', '광주축구전용구장'],
      ['대전 하나 시티즌', '대전월드컵경기장'],
      ['강원 FC', '춘천송암스포츠타운'],
      ['인천 유나이티드', '인천축구전용경기장'],
    ],
  },
  {
    name: 'EPL',
    sport: '축구',
    time: '23:30',
    teams: [
      ['맨체스터 시티', '에티하드 스타디움'],
      ['아스널', '에미레이츠 스타디움'],
      ['리버풀', '안필드'],
      ['첼시', '스탬퍼드 브리지'],
      ['토트넘 홋스퍼', '토트넘 홋스퍼 스타디움'],
      ['맨체스터 유나이티드', '올드 트래퍼드'],
      ['뉴캐슬 유나이티드', '세인트 제임스 파크'],
      ['애스턴 빌라', '빌라 파크'],
    ],
  },
  {
    name: 'KBO',
    sport: '야구',
    time: '18:30',
    teams: [
      ['LG 트윈스', '잠실야구장'],
      ['KIA 타이거즈', '광주기아챔피언스필드'],
      ['삼성 라이온즈', '대구삼성라이온즈파크'],
      ['두산 베어스', '잠실야구장'],
      ['롯데 자이언츠', '사직야구장'],
      ['SSG 랜더스', '인천SSG랜더스필드'],
      ['한화 이글스', '대전한화생명볼파크'],
      ['KT 위즈', '수원KT위즈파크'],
    ],
  },
] as const;

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    const [existing] = await db
      .select({ id: leagues.id })
      .from(leagues)
      .limit(1);
    if (existing) {
      logger.log('이미 예시 데이터가 있어 건너뜁니다.');
      await seedBeta(db);
      return;
    }

    await db.transaction(async (tx) => {
      await tx.insert(settings).values({ id: 1 }).onConflictDoNothing();

      let [admin] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, 'admin'))
        .limit(1);
      if (!admin) {
        const username = process.env.ADMIN_USERNAME;
        const password = process.env.ADMIN_PASSWORD;
        if (!username || !password) {
          throw new Error('ADMIN_USERNAME, ADMIN_PASSWORD가 필요합니다.');
        }
        [admin] = await tx
          .insert(users)
          .values({
            username,
            nickname: '관리자',
            passwordHash: await hashPassword(password),
            role: 'admin',
          })
          .returning({ id: users.id });
      }

      const demoPassword = await hashPassword('user1234!');
      const [user1, user2] = await tx
        .insert(users)
        .values([
          { username: 'user1', nickname: '축구팬', passwordHash: demoPassword },
          { username: 'user2', nickname: '야구왕', passwordHash: demoPassword },
        ])
        .returning({ id: users.id });

      const today = kstToday();
      const matchRows: (typeof matches.$inferInsert)[] = [];
      for (const [leagueIndex, league] of LEAGUES.entries()) {
        const [created] = await tx
          .insert(leagues)
          .values({ name: league.name, sport: league.sport })
          .returning({ id: leagues.id });

        for (let offset = -3; offset <= 3; offset += 1) {
          const slot = offset + 3;
          const [homeTeam, venue] = league.teams[(slot * 2) % 8];
          const [awayTeam] = league.teams[(slot * 2 + 1 + leagueIndex) % 8];
          const kickoffAt = new Date(
            `${addDays(today, offset)}T${league.time}:00+09:00`,
          );

          let status: MatchStatus = 'scheduled';
          let homeScore: number | null = null;
          let awayScore: number | null = null;
          if (offset < 0) {
            status = 'finished';
            const base = league.sport === '야구' ? 2 : 0;
            homeScore = base + ((slot * 3 + leagueIndex) % 4);
            awayScore = base + ((slot * 5 + leagueIndex * 2) % 3);
          } else if (offset === 0 && league.name === 'KBO') {
            status = 'live';
            homeScore = 3;
            awayScore = 2;
          }

          matchRows.push({
            leagueId: created.id,
            homeTeam,
            awayTeam,
            kickoffAt,
            venue,
            status,
            homeScore,
            awayScore,
          });
        }
      }
      const createdMatches = await tx
        .insert(matches)
        .values(matchRows)
        .returning({
          id: matches.id,
          homeTeam: matches.homeTeam,
          awayTeam: matches.awayTeam,
          status: matches.status,
        });
      const liveMatch = createdMatches.find((m) => m.status === 'live');
      const finishedMatch = createdMatches.find((m) => m.status === 'finished');
      const upcomingMatch = createdMatches.find(
        (m) => m.status === 'scheduled',
      );

      const hoursAgo = (hours: number) =>
        new Date(Date.now() - hours * 60 * 60 * 1000);

      const createdPosts = await tx
        .insert(posts)
        .values([
          {
            category: 'notice',
            authorId: admin.id,
            title: '스포츠 커뮤니티 이용 안내',
            body: '서로 존중하는 응원 문화를 만들어 주세요.\n욕설, 비방, 광고 글은 예고 없이 숨김 처리됩니다.',
            createdAt: hoursAgo(72),
          },
          {
            category: 'free',
            authorId: user1.id,
            title: '주말에 직관 가시는 분 계신가요?',
            body: '이번 주말 경기 직관 가려고 하는데 같이 가실 분 있으면 댓글 주세요!',
            createdAt: hoursAgo(50),
          },
          {
            category: 'free',
            authorId: user2.id,
            title: '야구 처음 보는 친구에게 추천할 만한 경기',
            body: '친구가 야구를 처음 본다는데 어떤 팀 경기를 보여 주면 좋을까요?',
            createdAt: hoursAgo(30),
          },
          {
            category: 'free',
            authorId: user1.id,
            title: '유니폼 새로 샀습니다',
            body: '이번 시즌 홈 유니폼 디자인 정말 마음에 드네요.',
            createdAt: hoursAgo(20),
          },
          {
            category: 'match',
            matchId: finishedMatch?.id,
            authorId: user1.id,
            title: finishedMatch
              ? `${finishedMatch.homeTeam} vs ${finishedMatch.awayTeam} 경기 후기`
              : '지난 경기 후기',
            body: '후반 집중력이 정말 좋았습니다. 다음 경기도 기대돼요.',
            createdAt: hoursAgo(40),
          },
          {
            category: 'match',
            matchId: liveMatch?.id,
            authorId: user2.id,
            title: liveMatch
              ? `[실시간] ${liveMatch.homeTeam} vs ${liveMatch.awayTeam}`
              : '[실시간] 오늘 경기',
            body: '지금 7회인데 한 점 차 접전입니다. 같이 응원해요!',
            createdAt: hoursAgo(1),
          },
          {
            category: 'match',
            matchId: upcomingMatch?.id,
            authorId: user1.id,
            title: upcomingMatch
              ? `${upcomingMatch.homeTeam} vs ${upcomingMatch.awayTeam} 예상 스코어는?`
              : '다음 경기 예상 스코어는?',
            body: '저는 2:1 홈 팀 승리로 예상합니다. 다들 어떻게 보세요?',
            createdAt: hoursAgo(5),
          },
          {
            category: 'match',
            matchId: liveMatch?.id,
            authorId: user1.id,
            title: '오늘 선발 투수 컨디션 좋아 보이네요',
            body: '초반부터 구위가 살아 있습니다.',
            createdAt: hoursAgo(2),
          },
          {
            category: 'free',
            authorId: user2.id,
            title: '응원가 추천 부탁드립니다',
            body: '경기장에서 따라 부르기 좋은 응원가 알려 주세요.',
            createdAt: hoursAgo(10),
          },
        ])
        .returning({ id: posts.id, category: posts.category });

      const [, free1, free2, , match1, live1] = createdPosts;
      await tx.insert(comments).values([
        { postId: free1.id, authorId: user2.id, body: '저도 가고 싶어요!' },
        {
          postId: free1.id,
          authorId: admin.id,
          body: '안전한 관람 되세요.',
        },
        {
          postId: free2.id,
          authorId: user1.id,
          body: '홈 경기 응원석 추천합니다.',
        },
        {
          postId: match1.id,
          authorId: user2.id,
          body: '저도 봤는데 정말 재밌었어요.',
        },
        { postId: live1.id, authorId: user1.id, body: '끝까지 가 봅시다!' },
      ]);

      await tx.insert(inquiries).values({
        userId: user1.id,
        title: '닉네임 변경은 어떻게 하나요?',
        body: '가입할 때 정한 닉네임을 바꾸고 싶은데 방법이 있을까요?',
      });

      const [send] = await tx
        .insert(messageSends)
        .values({
          title: '가입을 환영합니다',
          body: '스포츠 커뮤니티에 오신 것을 환영합니다. 즐거운 응원 되세요!',
          toUserId: user1.id,
        })
        .returning({ id: messageSends.id });
      await tx.insert(messages).values({ sendId: send.id, userId: user1.id });
    });

    logger.log('예시 데이터를 넣었습니다.');
    await seedBeta(db);
  } finally {
    await client.end();
  }
}

const FREE_TAGS = ['잡담', '질문', '정보', '유머'];
const MATCH_TAGS = ['축구', '야구', '해외축구'];
const HUMOR_TAGS = ['유머', '움짤', '이슈'];
const REVIEW_TAGS = ['직관', '후기', '분석'];
const NEWS_TAGS = ['속보', '이적', '공식'];
const EXTRA_USERS = [
  { username: 'user3', nickname: '축구매니아' },
  { username: 'user4', nickname: '야구팬' },
  { username: 'user5', nickname: '해외팬' },
] as const;

function mergeTags(current: string[], extra: readonly string[]) {
  const seen = new Set(current);
  const merged = [...current];
  for (const tag of extra) {
    if (!seen.has(tag)) {
      merged.push(tag);
      seen.add(tag);
    }
  }
  return merged;
}

/** 경기 팀 이름을 그대로 팀에 넣는다. 비슷한 이름은 합치지 않는다. */
async function seedTeams(db: Db) {
  const leagueRows = await db
    .select({ id: leagues.id, name: leagues.name })
    .from(leagues);
  const byName = new Map(leagueRows.map((row) => [row.name, row.id]));
  const values = LEAGUES.flatMap((league) => {
    const leagueId = byName.get(league.name) ?? null;
    return league.teams.map(([name]) => ({
      name,
      sport: league.sport,
      leagueId,
    }));
  });
  if (values.length === 0) return;
  await db.insert(teams).values(values).onConflictDoNothing();
}

/** 리그가 있어도 베타 예시(말머리·추가 회원·추천·응원·금칙어)를 넣는다. */
async function seedBeta(db: Db) {
  await seedTeams(db);
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
  const [current] = await db
    .select({
      freeTags: settings.freeTags,
      matchTags: settings.matchTags,
      humorTags: settings.humorTags,
      reviewTags: settings.reviewTags,
      newsTags: settings.newsTags,
    })
    .from(settings)
    .where(eq(settings.id, 1));
  if (current) {
    await db
      .update(settings)
      .set({
        freeTags: mergeTags(current.freeTags, FREE_TAGS),
        matchTags: mergeTags(current.matchTags, MATCH_TAGS),
        humorTags: mergeTags(current.humorTags, HUMOR_TAGS),
        reviewTags: mergeTags(current.reviewTags, REVIEW_TAGS),
        newsTags: mergeTags(current.newsTags, NEWS_TAGS),
      })
      .where(eq(settings.id, 1));
  }

  const demoPassword = await hashPassword('user1234!');
  await db
    .insert(users)
    .values(
      EXTRA_USERS.map((user) => ({
        username: user.username,
        nickname: user.nickname,
        passwordHash: demoPassword,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(users)
    .values({
      username: 'test',
      nickname: '테스트',
      passwordHash: await hashPassword('test'),
    })
    .onConflictDoNothing();

  const untagged = await db
    .select({ id: posts.id, category: posts.category })
    .from(posts)
    .where(isNull(posts.tag));
  let freeIndex = 0;
  let matchIndex = 0;
  for (const post of untagged) {
    let tag: string | null = null;
    if (post.category === 'free') {
      tag = FREE_TAGS[freeIndex % FREE_TAGS.length];
      freeIndex += 1;
    } else if (post.category === 'match') {
      tag = MATCH_TAGS[matchIndex % MATCH_TAGS.length];
      matchIndex += 1;
    }
    if (tag) {
      await db.update(posts).set({ tag }).where(eq(posts.id, post.id));
    }
  }

  const demoUsers = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(
      inArray(users.username, [
        'user1',
        'user2',
        'user3',
        'user4',
        'user5',
      ]),
    );
  const [popular] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(gte(posts.likeCount, 5))
    .limit(1);
  if (!popular) {
    const [target] = await db
      .select({ id: posts.id, authorId: posts.authorId })
      .from(posts)
      .where(eq(posts.status, 'visible'))
      .limit(1);
    if (target) {
      const likers = demoUsers
        .filter((user) => user.id !== target.authorId)
        .slice(0, 5);
      if (likers.length > 0) {
        await db
          .insert(postLikes)
          .values(likers.map((user) => ({ postId: target.id, userId: user.id })))
          .onConflictDoNothing();
        const [{ total }] = await db
          .select({ total: count() })
          .from(postLikes)
          .where(eq(postLikes.postId, target.id));
        await db
          .update(posts)
          .set({ likeCount: total })
          .where(eq(posts.id, target.id));
      }
    }
  }

  const [openMatch] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.status, 'scheduled'), gt(matches.kickoffAt, new Date())))
    .limit(1);
  const [finishedMatch] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.status, 'finished'))
    .limit(1);
  const [u1, u2, u3] = demoUsers;
  if (openMatch && u1) {
    await db
      .insert(matchCheers)
      .values({ matchId: openMatch.id, userId: u1.id, side: 'home' })
      .onConflictDoNothing();
    await db
      .insert(matchPredictions)
      .values({ matchId: openMatch.id, userId: u1.id, pick: 'home' })
      .onConflictDoNothing();
  }
  if (openMatch && u2) {
    await db
      .insert(matchCheers)
      .values({ matchId: openMatch.id, userId: u2.id, side: 'away' })
      .onConflictDoNothing();
    await db
      .insert(matchPredictions)
      .values({ matchId: openMatch.id, userId: u2.id, pick: 'away' })
      .onConflictDoNothing();
  }
  if (finishedMatch && u3) {
    await db
      .insert(matchPredictions)
      .values({ matchId: finishedMatch.id, userId: u3.id, pick: 'home' })
      .onConflictDoNothing();
  }

  await db
    .insert(forbiddenWords)
    .values({ word: '비속어예시' })
    .onConflictDoNothing();

    await seedCommunity(db);
    logger.log('베타 예시 데이터를 반영했습니다.');
  }

function actualPick(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) return 'home' as const;
  if (homeScore < awayScore) return 'away' as const;
  return 'draw' as const;
}

/** 유머·직관후기·뉴스 글, 댓글 추천, 예측 랭킹용 예시 */
async function seedCommunity(db: Db) {
  const demoUsers = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(
      inArray(users.username, ['user1', 'user2', 'user3', 'user4', 'user5']),
    );
  const byName = new Map(demoUsers.map((user) => [user.username, user]));
  const u1 = byName.get('user1');
  const u2 = byName.get('user2');
  const u3 = byName.get('user3');
  const u4 = byName.get('user4');
  const u5 = byName.get('user5');
  if (!u1 || !u2 || !u3 || !u4 || !u5) return;

  const hoursAgo = (hours: number) =>
    new Date(Date.now() - hours * 60 * 60 * 1000);

  const [humorExists] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(eq(posts.category, 'humor'))
    .limit(1);

  if (!humorExists) {
    const created = await db
      .insert(posts)
      .values([
        {
          category: 'humor',
          authorId: u3.id,
          tag: '유머',
          title: '심판이 홈런을 파울이라고 한 표정',
          body: '그 순간 벤치 표정이 너무 웃겨서 캡처했습니다. 다들 보셨나요?',
          createdAt: hoursAgo(18),
        },
        {
          category: 'humor',
          authorId: u2.id,
          tag: '이슈',
          title: '오늘 중계 해설이 또 그 말 했습니다',
          body: '매 경기 같은 레퍼토리면 응원가처럼 따라 부르겠습니다.',
          createdAt: hoursAgo(12),
        },
        {
          category: 'review',
          authorId: u4.id,
          tag: '직관',
          title: '잠실 외야 1층 직관 후기',
          body: '햇빛은 좀 강했지만 응원 소리가 가까워서 좋았습니다. 다음엔 모자도 챙기세요.',
          createdAt: hoursAgo(28),
        },
        {
          category: 'review',
          authorId: u1.id,
          tag: '분석',
          title: '지난 주말 경기, 후반 교체가 승부처였습니다',
          body: '교체 이후 템포가 확 살아났고 세트피스도 날카로웠어요. 다음 경기도 이 템포면 좋겠습니다.',
          createdAt: hoursAgo(36),
        },
        {
          category: 'news',
          authorId: u5.id,
          tag: '속보',
          title: '선발 투수 교체 소식 나왔습니다',
          body: '구단에서 컨디션 조절이라고 밝혔습니다. 자세한 라인업은 경기 전에 다시 확인하세요.',
          createdAt: hoursAgo(8),
        },
        {
          category: 'news',
          authorId: u3.id,
          tag: '공식',
          title: '주중 경기 입장 안내가 바뀌었습니다',
          body: '게이트 오픈이 30분 앞당겨졌고, 우천 시 환불 규정도 공지에 올라왔습니다.',
          createdAt: hoursAgo(6),
        },
      ])
      .returning({ id: posts.id, category: posts.category });

    const humor1 = created[0];
    const review1 = created[2];
    const news1 = created[4];
    if (humor1 && review1 && news1) {
      const newComments = await db
        .insert(comments)
        .values([
          {
            postId: humor1.id,
            authorId: u1.id,
            body: '진짜 그 장면만 반복 재생 중입니다.',
            createdAt: hoursAgo(16),
          },
          {
            postId: humor1.id,
            authorId: u4.id,
            body: '벤치 리액션이 더 웃겼어요.',
            createdAt: hoursAgo(15),
          },
          {
            postId: review1.id,
            authorId: u2.id,
            body: '저도 그 자리 가봤는데 시야는 괜찮았습니다.',
            createdAt: hoursAgo(20),
          },
          {
            postId: news1.id,
            authorId: u2.id,
            body: '선발 바뀌면 응원 전략도 다시 짜야겠네요.',
            createdAt: hoursAgo(7),
          },
        ])
        .returning({ id: comments.id, authorId: comments.authorId });

      const likers = [u2, u3, u5];
      for (const comment of newComments) {
        const who = likers.filter((user) => user.id !== comment.authorId);
        if (who.length === 0) continue;
        await db
          .insert(commentLikes)
          .values(who.map((user) => ({ commentId: comment.id, userId: user.id })))
          .onConflictDoNothing();
        const [{ total }] = await db
          .select({ total: count() })
          .from(commentLikes)
          .where(eq(commentLikes.commentId, comment.id));
        await db
          .update(comments)
          .set({ likeCount: total })
          .where(eq(comments.id, comment.id));
      }
    }
  }

  const finished = await db
    .select({
      id: matches.id,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(matches)
    .where(eq(matches.status, 'finished'));

  const pickCycle = ['home', 'draw', 'away'] as const;
  for (const [index, match] of finished.entries()) {
    if (match.homeScore == null || match.awayScore == null) continue;
    const winner = actualPick(match.homeScore, match.awayScore);
    await db
      .insert(matchPredictions)
      .values([
        { matchId: match.id, userId: u3.id, pick: winner },
        { matchId: match.id, userId: u4.id, pick: 'home' },
        {
          matchId: match.id,
          userId: u5.id,
          pick: pickCycle[index % pickCycle.length],
        },
        { matchId: match.id, userId: u1.id, pick: winner === 'home' ? 'away' : 'home' },
      ])
      .onConflictDoNothing();
  }

  logger.log('커뮤니티 예시 데이터를 반영했습니다.');
}

await seed();
