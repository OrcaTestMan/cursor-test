import { Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hashPassword } from '../auth/password.js';
import { addDays, kstToday } from '../common/kst.js';
import * as schema from './schema.js';
import {
  comments,
  inquiries,
  leagues,
  matches,
  messages,
  messageSends,
  posts,
  settings,
  users,
} from './schema.js';

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
  } finally {
    await client.end();
  }
}

await seed();
