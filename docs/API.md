# API 계약

화면(`apps/web`)과 API(`apps/api`)가 함께 따르는 주소와 데이터 모양이다. 바꿀 때는 이 문서를 먼저 고친다.

## 공통

- 모든 주소 앞에 `/api`가 붙는다. 화면은 Vite 프록시로 같은 출처에서 부른다.
- 로그인 상태는 `sid` httpOnly 쿠키(SameSite=Lax, 30일)로 유지한다. 화면은 `credentials: 'include'`로 부른다.
- 시각은 ISO 8601 문자열(UTC)로 주고받는다. 화면은 한국 시간으로 보여 준다.
- 오류 응답: `{ statusCode, message, error }`. `message`는 한국어 문자열 또는 한국어 문자열 배열(입력 검증).
- 목록 응답: `{ items, total, page, pageSize }`. 쿼리 `page`(1부터), `pageSize`(20·50·100 중, 기본 20).
- 로그인 필요 주소에 비로그인으로 오면 401 `로그인이 필요합니다.`
- 관리자 주소(`/admin/*`)에 일반 회원이 오면 403 `관리자만 이용할 수 있습니다.`
- 차단된 회원의 쿠키는 401로 처리하고 세션을 지운다.

## 데이터 모양

```ts
type Role = 'user' | 'admin'
type UserStatus = 'active' | 'blocked'
type User = { id: number; username: string; nickname: string; role: Role; status: UserStatus; createdAt: string }
type AdminUser = User & { blockedReason: string | null; lastLoginAt: string | null; postCount: number; commentCount: number }

type League = { id: number; name: string; sport: string; matchCount: number; createdAt: string }

type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled'
type Match = {
  id: number; leagueId: number; leagueName: string; sport: string
  homeTeam: string; awayTeam: string; kickoffAt: string; venue: string | null
  status: MatchStatus; homeScore: number | null; awayScore: number | null; postCount: number
}

type Category = 'notice' | 'free' | 'match'
type ContentStatus = 'pending' | 'visible' | 'hidden'
type Author = { id: number; nickname: string }
type PostSummary = {
  id: number; category: Category; matchId: number | null; title: string
  author: Author; views: number; commentCount: number; status: ContentStatus; createdAt: string
}
type Comment = { id: number; postId: number; author: Author; body: string; status: ContentStatus; createdAt: string }
type PostDetail = PostSummary & {
  body: string; updatedAt: string
  match: Match | null
  comments: Comment[]   // 일반 화면에서는 visible만, 내 댓글은 상태와 관계없이 포함
}

type InquiryStatus = 'waiting' | 'answered'
type Inquiry = {
  id: number; title: string; body: string; status: InquiryStatus
  answer: string | null; answeredAt: string | null; createdAt: string
}
type AdminInquiry = Inquiry & { user: Author }

type Message = { id: number; title: string; body: string; readAt: string | null; createdAt: string }
type SentMessage = { id: number; title: string; body: string; toAll: boolean; to: Author | null; createdAt: string }

type PublicSettings = { siteName: string; noticeBanner: string; signupEnabled: boolean; postApprovalRequired: boolean }
type Settings = PublicSettings
```

## 입력 제한

- `username`: 4~20자, 영문 소문자·숫자·`_`
- `nickname`: 2~12자, 공백만으로는 안 됨
- `password`: 8~64자
- 게시글 `title` 1~100자, `body` 1~5000자. 댓글 `body` 1~500자
- 문의 `title` 1~100자, `body` 1~2000자, 답변 `answer` 1~2000자
- 쪽지 `title` 1~100자, `body` 1~2000자
- 설정 `siteName` 1~30자, `noticeBanner` 0~200자
- 리그 `name` 1~50자(중복 불가), `sport` 1~20자
- 경기 팀 이름 1~50자, `venue` 0~100자, 점수 0~999 정수 또는 `null`

## 인증

| 주소 | 권한 | 요청 | 응답 |
| --- | --- | --- | --- |
| `POST /auth/signup` | 누구나 | `{ username, nickname, password }` | 201 `User`, 쿠키 발급(바로 로그인). 아이디·닉네임 중복 409, 가입 중지 403 `현재 회원가입을 받지 않습니다.` |
| `POST /auth/login` | 누구나 | `{ username, password }` | 200 `User`, 쿠키 발급. 틀리면 401 `아이디 또는 비밀번호가 맞지 않습니다.` 차단 회원 403 `이용이 제한된 계정입니다.`(사유가 있으면 뒤에 붙임) |
| `POST /auth/logout` | 누구나 | - | 204, 세션 삭제 |
| `GET /auth/me` | 로그인 | - | 200 `User` |
| `PATCH /auth/me/password` | 로그인 | `{ currentPassword, newPassword }` | 204. 현재 비밀번호가 틀리면 400 |

## 공개·회원 주소

| 주소 | 권한 | 요청 | 응답 |
| --- | --- | --- | --- |
| `GET /settings/public` | 누구나 | - | `PublicSettings` |
| `GET /leagues` | 누구나 | - | `League[]` 이름순 |
| `GET /matches` | 누구나 | `?date=YYYY-MM-DD&leagueId&status` | `Match[]` 시작 시각순. `date`는 한국 시간 하루. 없으면 전체 |
| `GET /matches/:id` | 누구나 | - | `Match`, 없으면 404 |
| `GET /posts` | 누구나 | `?category&matchId&q&page&pageSize` | `PostSummary` 목록. visible만. `q`는 제목 검색. 공지(`notice`)는 `category` 없이 부르면 빠진다 |
| `GET /posts/:id` | 누구나 | - | `PostDetail`, 조회수 +1. visible이 아니면 작성자·관리자만 보고 나머지는 404 |
| `POST /posts` | 로그인 | `{ category: 'free' \| 'match' \| 'notice', matchId?, title, body }` | 201 `PostDetail`. `matchId`가 있으면 `match`로 저장. `notice`는 관리자만(403). 설정 `postApprovalRequired`가 켜져 있고 일반 회원이면 `pending`, 아니면 `visible` |
| `PATCH /posts/:id` | 작성자·관리자 | `{ title?, body? }` | 200 `PostDetail` |
| `DELETE /posts/:id` | 작성자·관리자 | - | 204 |
| `POST /posts/:id/comments` | 로그인 | `{ body }` | 201 `Comment`. 승인 규칙은 글과 같음 |
| `DELETE /comments/:id` | 작성자·관리자 | - | 204 |
| `GET /me/posts` | 로그인 | `?page&pageSize` | 내 글 `PostSummary` 목록(상태 무관) |
| `GET /inquiries` | 로그인 | `?page&pageSize` | 내 `Inquiry` 목록 최신순 |
| `POST /inquiries` | 로그인 | `{ title, body }` | 201 `Inquiry` |
| `GET /inquiries/:id` | 로그인 | - | 내 `Inquiry`, 남의 것은 404 |
| `GET /messages` | 로그인 | `?page&pageSize` | 받은 `Message` 목록 + `unreadCount` 필드 추가 |
| `POST /messages/:id/read` | 로그인 | - | 200 `Message` |
| `DELETE /messages/:id` | 로그인 | - | 204 (내 받은 쪽지에서만 지움) |

## 관리자 주소

| 주소 | 요청 | 응답 |
| --- | --- | --- |
| `GET /admin/dashboard` | - | `{ users: { total, todaySignups, blocked }, posts: { today, pending }, comments: { today, pending }, inquiries: { waiting }, matches: { today, live }, recentPosts: PostSummary[5], recentInquiries: AdminInquiry[5], recentUsers: AdminUser[5] }` (오늘 = 한국 시간) |
| `POST /admin/leagues` | `{ name, sport }` | 201 `League`, 중복 409 |
| `PATCH /admin/leagues/:id` | `{ name?, sport? }` | 200 `League` |
| `DELETE /admin/leagues/:id` | - | 204. 경기가 있으면 409 `경기가 등록된 리그는 지울 수 없습니다.` |
| `GET /admin/matches` | `?from=YYYY-MM-DD&to=YYYY-MM-DD&leagueId&status&q&page&pageSize` | `Match` 목록. 시작 시각 최신순. `q`는 팀 이름 검색 |
| `POST /admin/matches` | `{ leagueId, homeTeam, awayTeam, kickoffAt, venue? }` | 201 `Match` |
| `PATCH /admin/matches/:id` | `{ leagueId?, homeTeam?, awayTeam?, kickoffAt?, venue?, status?, homeScore?, awayScore? }` (점수는 `null` 허용) | 200 `Match` |
| `DELETE /admin/matches/:id` | - | 204. 연결된 글은 `matchId`가 비워짐 |
| `GET /admin/posts` | `?status&category&q&page&pageSize` | `PostSummary` 목록(상태 무관) |
| `PATCH /admin/posts/:id` | `{ status }` | 200 `PostSummary` |
| `DELETE /admin/posts/:id` | - | 204 |
| `GET /admin/comments` | `?status&q&page&pageSize` | `Comment & { postTitle: string }` 목록 |
| `PATCH /admin/comments/:id` | `{ status }` | 200 `Comment` |
| `DELETE /admin/comments/:id` | - | 204 |
| `GET /admin/users` | `?q&status&role&page&pageSize` | `AdminUser` 목록. `q`는 아이디·닉네임 검색 |
| `GET /admin/users/:id` | - | `AdminUser` |
| `PATCH /admin/users/:id` | `{ role?, status?, blockedReason? }` | 200 `AdminUser`. 자기 자신을 차단하거나 권한을 내리면 400. 차단하면 그 회원의 세션을 모두 지움 |
| `GET /admin/inquiries` | `?status&page&pageSize` | `AdminInquiry` 목록. 답변 대기 먼저, 그다음 최신순 |
| `GET /admin/inquiries/:id` | - | `AdminInquiry` |
| `POST /admin/inquiries/:id/answer` | `{ answer }` | 200 `AdminInquiry`. 다시 보내면 답변을 고침 |
| `POST /admin/messages` | `{ toUserId?, toAll?, title, body }` | 201 `{ sent: number }`. `toAll`이면 활성 회원 전체. 둘 다 없으면 400 |
| `GET /admin/messages` | `?page&pageSize` | `SentMessage` 목록 |
| `GET /admin/settings` | - | `Settings` |
| `PUT /admin/settings` | `Settings` 전체 | 200 `Settings` |

## 첫 관리자와 예시 데이터

- API가 켜질 때 관리자 계정이 하나도 없으면 `.env`의 `ADMIN_USERNAME`, `ADMIN_PASSWORD`로 관리자를 만든다. 닉네임은 `관리자`.
- `yarn workspace api db:seed`는 리그 3개(K리그1·축구, EPL·축구, KBO·야구), 오늘 기준 앞뒤 3일 경기, 예시 회원 2명, 글·댓글 몇 개, 공지 1개를 넣는다. 이미 있으면 건너뛴다.
