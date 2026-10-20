# API 계약

화면(`apps/web`)과 API(`apps/api`)가 함께 따르는 주소와 데이터 모양이다. 바꿀 때는 이 문서를 먼저 고친다.

뒤쪽 절이 앞 표보다 우선한다. 검색·기간·`q` 연산은 `# 검색·기간 필터`가 기준이다. 회원 사이트 화면은 로그인 필수지만, `@LoginRequired`가 없는 GET 목록은 쿠키 없이도 응답한다.

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
| `GET /matches` | 화면 로그인 · API GET 공개 | `range` `from` `to` `q` `sport` `leagueId` `teamId` `side` `status` `hasScore` `missingScore` | `Match[]` 킥오프순. 기간 없으면 오늘. `date`만 있으면 그날. 전체는 `range=all`. `q`는 팀·리그·종목·장소·번호 |
| `GET /matches/:id` | 화면 로그인 · API GET 공개 | - | `MatchDetail`, 없으면 404 |
| `GET /posts` | 화면 로그인 · API GET 공개 | `category` `matchId` `q` `range` `from` `to` `best` `tag` `includeNotice` `sort` 등 | `PostSummary` 목록. visible만. `q`는 제목·본문·닉네임·팀(단어 AND·필드 OR). `searchType`은 무시. 기간 없으면 오늘. 공지는 `category` 없이 부르면 빠짐 |
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
| `GET /admin/matches` | 공개 목록과 같은 기간·검색 + 페이지 | `Match` 목록. 기간 없으면 오늘. `q`는 팀·리그 등 |
| `POST /admin/matches` | `{ leagueId, homeTeam, awayTeam, kickoffAt, venue? }` | 201 `Match` |
| `PATCH /admin/matches/:id` | `{ leagueId?, homeTeam?, awayTeam?, kickoffAt?, venue?, status?, homeScore?, awayScore? }` (점수는 `null` 허용) | 200 `Match` |
| `DELETE /admin/matches/:id` | - | 204. 연결된 글은 `matchId`가 비워짐 |
| `GET /admin/posts` | `?status&category&q&page&pageSize` | `PostSummary` 목록(상태 무관) |
| `PATCH /admin/posts/:id` | `{ status }` | 200 `PostSummary` |
| `DELETE /admin/posts/:id` | - | 204 |
| `GET /admin/comments` | `?status&q&page&pageSize` | `Comment & { postTitle: string }` 목록 |
| `PATCH /admin/comments/:id` | `{ status }` | 200 `Comment` |
| `DELETE /admin/comments/:id` | - | 204 |
| `GET /admin/users` | `q` `status` `role` 기간 등. 상세는 검색·기간 필터 절 | `AdminUser` 목록. `q`는 회원번호·아이디·닉네임·차단 사유. 기간 없으면 오늘 |
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

---

# 1.0 베타 추가분

아래가 앞 내용보다 우선한다. 데이터 모양의 정식 정의는 `apps/web/src/lib/types.ts`이고, API는 이 모양 그대로 응답한다.

## 바뀐 데이터 모양

- `User`에 `nicknameChangedAt` 추가. `UserStatus`에 `deleted`(탈퇴) 추가.
- `AdminUser`에 `blockedUntil`(기간 차단 해제 시각, 영구면 `null`) 추가.
- `PostSummary`에 `tag`(말머리, 없으면 `null`), `likeCount`, `isBest`(추천 수가 `bestThreshold` 이상이고 `bestExcluded`가 아니고 공지가 아님) 추가.
- 관리자 글 목록은 `AdminPostSummary`(`bestExcluded`, `reportCount` 추가), 관리자 댓글 목록은 `AdminComment`(`reportCount` 추가).
- `Comment`에 `parentId`(답글이면 원 댓글 번호), `deleted` 추가. 지운 댓글은 답글이 남아 있을 때만 목록에 나오고 `body`는 빈 문자열이다.
- `PostDetail`에 `liked`, `bookmarked` 추가(비로그인은 `false`). 댓글은 작성 순서대로 평평하게 주고 화면이 `parentId`로 묶는다.
- `GET /matches/:id`는 `MatchDetail`을 준다(응원 수, 내 응원, 예측 비율, 내 예측, `open`).
- `PublicSettings`에 `bestThreshold`, `freeTags`, `matchTags` 추가. 관리자 `Settings`에 `reportHideThreshold`, `postCooldownSec`, `commentCooldownSec` 추가.
- `Dashboard`에 `reports.pending`(처리 대기 신고 대상 수) 추가.

## 공통 규칙

- 요청 횟수 제한: IP당 1분 300회. 로그인은 IP당 10분 10회, 가입은 IP당 1시간 5회. 넘으면 429 `요청이 너무 많습니다. 잠시 뒤 다시 시도해 주세요.` 테스트(`NODE_ENV=test`)에서는 끈다.
- 도배 방지: 일반 회원은 마지막 글 뒤 `postCooldownSec`초, 마지막 댓글 뒤 `commentCooldownSec`초 안에 다시 쓰면 429 `N초 뒤에 다시 쓸 수 있습니다.`
- 금칙어: 글 제목·본문, 댓글, 닉네임, 아이디에 들어가면 400 `사용할 수 없는 단어가 포함되어 있습니다: "단어"`. 띄어쓰기와 대소문자를 무시하고 찾는다.
- 기간 차단이 끝나면 로그인할 때 자동으로 풀린다. 차단 중 로그인 메시지: `이용이 제한된 계정입니다. 사유: X (YYYY-MM-DD HH:mm까지)`, 영구면 괄호 없이. 탈퇴 계정은 `아이디 또는 비밀번호가 맞지 않습니다.`
- 탈퇴: `status=deleted`, 아이디는 `deleted_{id}`, 닉네임은 `탈퇴회원{id}`로 바꾸고 세션을 지운다. 쓴 글과 댓글은 남는다.
- 관리자 조치(회원·글·댓글·경기·리그·문의 답변·쪽지·설정·금칙어·신고 처리)는 관리 이력에 남긴다.

## 회원·인증 추가

| 주소 | 권한 | 요청 | 응답 |
| --- | --- | --- | --- |
| `PATCH /auth/me/nickname` | 로그인 | `{ nickname }` | 200 `User`. 30일에 한 번. 이르면 400 `닉네임은 N일 뒤에 바꿀 수 있습니다.` 중복 409 |
| `DELETE /auth/me` | 로그인 | `{ password }` | 204, 탈퇴. 비밀번호가 틀리면 400. 관리자는 400 `관리자 계정은 탈퇴할 수 없습니다.` |
| `PATCH /admin/users/:id` | 관리자 | 기존 + `blockDays?`(1·3·7·14·30, 0이면 영구) | `status: 'blocked'`과 함께 오면 `blockedUntil`을 정한다 |
| `POST /admin/users/:id/reset-password` | 관리자 | - | 200 `{ tempPassword }`(영문·숫자 12자). 그 회원 세션을 모두 지운다 |

## 게시판 추가

| 주소 | 권한 | 요청 | 응답 |
| --- | --- | --- | --- |
| `GET /posts` | 화면 로그인 · API GET 공개 | 기존 + `best=true`, `tag`. `searchType`은 받아도 무시 | `best=true`면 인기글만. 통합검색은 제목·본문·닉네임·팀 |
| `POST /posts`, `PATCH /posts/:id` | 로그인 | 기존 + `tag?` | 그 게시판 말머리 목록(`freeTags`·`matchTags`)에 없는 값이면 400. 목록이 비어 있으면 `tag`는 무시하고 `null` |
| `POST /posts/:id/like` | 로그인 | - | 200 `{ liked: true, likeCount }`. 내 글이면 400 `내 글은 추천할 수 없습니다.` 이미 했으면 그대로 |
| `DELETE /posts/:id/like` | 로그인 | - | 200 `{ liked: false, likeCount }` |
| `POST /posts/:id/bookmark` | 로그인 | - | 200 `{ bookmarked: true }` |
| `DELETE /posts/:id/bookmark` | 로그인 | - | 200 `{ bookmarked: false }` |
| `GET /me/bookmarks` | 로그인 | `?page&pageSize` | 스크랩한 `PostSummary` 목록(스크랩 최신순, visible만) |
| `POST /posts/:id/comments` | 로그인 | `{ body, parentId? }` | `parentId`는 같은 글의 답글이 아닌 댓글이어야 함. 아니면 400 `답글에는 답글을 달 수 없습니다.` |
| `DELETE /comments/:id` | 작성자·관리자 | - | 204. 지운 표시만 남긴다 |
| `PATCH /admin/posts/:id` | 관리자 | `{ status?, bestExcluded? }` | 200 `AdminPostSummary` |
| `GET /admin/posts`, `GET /admin/comments` | 관리자 | 기존 | `AdminPostSummary`·`AdminComment` 목록 |

## 알림

내 글에 남의 댓글(`comment`), 내 댓글에 남의 답글(`reply`), 문의 답변(`inquiry_answer`), 쪽지 받음(`message`), 내가 신고한 대상 처리 완료(`report_result`) 때 만든다. 30일 지난 알림은 목록에서 빼고 지운다.

| 주소 | 권한 | 요청 | 응답 |
| --- | --- | --- | --- |
| `GET /notifications` | 로그인 | `?page&pageSize` | `NotificationList` 최신순 |
| `POST /notifications/:id/read` | 로그인 | - | 200 `Notification` |
| `POST /notifications/read-all` | 로그인 | - | 204 |

`link`는 화면 주소다. 예: `/posts/12#comment-34`, `/inquiries/5`, `/messages`.

## 신고

사유: `abuse` 욕설·비방, `obscene` 음란, `spam` 광고·도배, `privacy` 개인정보 노출, `etc` 기타.

| 주소 | 권한 | 요청 | 응답 |
| --- | --- | --- | --- |
| `POST /reports` | 로그인 | `{ targetType, targetId, reason, detail? }`(detail 0~300자) | 201 `{ id }`. 같은 대상 두 번은 409 `이미 신고하셨습니다.` 내 글·댓글은 400 `내 글은 신고할 수 없습니다.` 처리 대기 신고가 `reportHideThreshold`건이 되면 대상을 `hidden`으로 바꾼다 |
| `GET /admin/reports` | 관리자 | `?status`(기본 pending)`&targetType&page&pageSize` | `ReportGroup` 목록. 대상별로 묶고 최근 신고순 |
| `POST /admin/reports/resolve` | 관리자 | `{ targetType, targetId, action: 'hide' \| 'delete' \| 'dismiss', note?, blockDays? }` | 200 `ReportGroup`. 대기 신고를 모두 처리한다. `hide`·`delete`면 `resolved`, `dismiss`면 `rejected`이고 자동 숨김을 풀어 `visible`로 되돌린다. `blockDays`(0이면 영구, 없으면 차단 안 함)가 있으면 작성자를 차단한다. 신고자에게 `report_result` 알림 |

## 경기 응원·예측·순위

| 주소 | 권한 | 요청 | 응답 |
| --- | --- | --- | --- |
| `GET /matches/:id` | 누구나 | - | `MatchDetail` |
| `PUT /matches/:id/cheer` | 로그인 | `{ side }` | 200 `MatchDetail`. `open`이 아니면 400 `경기가 시작되어 바꿀 수 없습니다.` |
| `DELETE /matches/:id/cheer` | 로그인 | - | 200 `MatchDetail` |
| `PUT /matches/:id/prediction` | 로그인 | `{ pick }` | 200 `MatchDetail`. `open`이 아니면 400 `경기가 시작되어 예측할 수 없습니다.` 돈·포인트·보상은 없다 |
| `GET /me/predictions` | 로그인 | `?page&pageSize` | `MyPredictionList` 경기 시작 최신순. 결과는 `finished` 경기만 판정 |
| `GET /leagues/:id/standings` | 누구나 | - | `Standings`. `finished` 경기로 계산. 종목이 `야구`면 `winRate` 방식(승률 = 승 / (승+패), 승률·승 순), 아니면 `points` 방식(승 3·무 1, 승점·득실·다득점 순) |

## 운영 도구

| 주소 | 요청 | 응답 |
| --- | --- | --- |
| `GET /admin/forbidden-words` | - | `ForbiddenWord[]` 가나다순 |
| `POST /admin/forbidden-words` | `{ word }`(1~50자) | 201 `ForbiddenWord`, 중복 409 |
| `DELETE /admin/forbidden-words/:id` | - | 204 |
| `GET /admin/logs` | `?page&pageSize&action` | `AdminLog` 목록 최신순 |
| `PUT /admin/settings` | `Settings` 전체 | `bestThreshold`·`reportHideThreshold` 1~100, 쿨다운 0~600초, 말머리 각 0~20개·1~20자·중복 없음 |

## 배포

- 루트 `yarn build`는 화면과 API를 함께 빌드하고, 루트 `yarn start`는 빌드된 API를 실행한다.
- API는 `apps/web/dist`가 있으면 그 파일을 함께 제공한다. `/api`가 아닌 GET 요청 중 파일이 없으면 `index.html`을 준다.
- 켜질 때 환경 변수를 검사한다. `DATABASE_URL`이 없으면 시작하지 않는다. `NODE_ENV=production`에서 `ADMIN_PASSWORD`가 10자 미만이면 시작하지 않는다. 프록시 뒤에서는 `TRUST_PROXY=1`.

# 커뮤니티 메뉴 확장

게시판 분류: `notice` 공지, `free` 자유, `match` 경기 이야기, `humor` 유머, `review` 직관·후기, `news` 뉴스·소식.

말머리: `freeTags`·`matchTags`·`humorTags`·`reviewTags`·`newsTags`. 공지는 말머리 없음.

| 주소 | 권한 | 요청 | 응답 |
| --- | --- | --- | --- |
| `GET /comments/hot` | 누구나 | - | `{ items: HotComment[] }` 최근 7일, 추천·최신순 10개. visible·삭제 아님·글도 visible |
| `POST /comments/:id/like` | 로그인 | - | 200 `{ liked: true, likeCount }`. 내 댓글이면 400 `내 댓글은 추천할 수 없습니다.` |
| `DELETE /comments/:id/like` | 로그인 | - | 200 `{ liked: false, likeCount }` |
| `GET /rankings/predictions` | 누구나 | - | `{ items: PredictionRank[] }` 종료 경기 1건 이상. 적중률·적중·판정 수 순. 돈·보상 없음 |
| `GET /profiles/:nickname` | 누구나 | - | `PublicProfile`. 활성 회원만. 없으면 404 `회원을 찾을 수 없습니다.` |

```ts
type HotComment = {
  id: number; postId: number; postTitle: string; author: Author
  body: string; likeCount: number; createdAt: string
}
type PredictionRank = {
  rank: number; user: Author; total: number; decided: number; hits: number; rate: number
}
type PublicProfile = {
  nickname: string; bio: string; avatarUploadId: number | null; createdAt: string
  postCount: number; commentCount: number; likeReceived: number
  teams: Team[]; badges: { id: string; label: string }[]
  recentPosts: PostSummary[]
  prediction: { total: number; decided: number; hits: number; rate: number }
}
type Comment = { /* 기존 */ likeCount: number; liked: boolean }
```

---

# 커뮤니티 확장 (1단계)

정식 타입은 `apps/web/src/lib/types.ts`가 우선한다.

## 업로드·팀

- `User`에 `bio`(0~160자, 기본 `''`), `avatarUploadId` 추가. 로그인 응답에 아이디·비밀번호 해시는 없다.
- `Author`에 `avatarUploadId` 추가.
- `PostSummary`에 `thumbnailId`(첫 이미지, 없으면 `null`) 추가.
- `PostDetail`에 `images: UploadFile[]`, `teams: Team[]` 추가.
- 공개 프로필은 로그인 아이디·권한·차단 사유를 주지 않는다.

```ts
type Team = { id: number; name: string; sport: string; leagueId: number | null; active: boolean; isPrimary?: boolean }
type UploadFile = { id: number; url: string; mime: string; size: number; originalName: string; sortOrder: number }
```

| 주소 | 권한 | 요청 | 응답 |
| --- | --- | --- | --- |
| `POST /uploads` | 로그인 | multipart `file`, `?kind=post\|avatar`(기본 post) | 201 `UploadFile`. JPEG/PNG/WebP/GIF만, 5MB 초과 400. 글 이미지 대기 포함 10장 초과 400 |
| `DELETE /uploads/:id` | 업로더·관리자 | - | 204 |
| `GET /files/:id` | 누구나 | - | 파일 스트림. 없으면 404 |
| `GET /teams` | 누구나 | - | 활성 `Team[]` (종목·이름순) |
| `GET /teams/:id` | 누구나 | - | 활성 `Team`, 없으면 404 |
| `GET /me/teams` | 로그인 | - | 내 응원팀(`isPrimary` 포함) |
| `PATCH /me/profile` | 로그인 | `{ bio?, teamIds?, primaryTeamId? }` | `{ bio, avatarUploadId, teams }`. 팀 10개, 대표 1개. `teamIds: []`면 응원팀 삭제 |
| `GET /posts` | 누구나 | 기존 + `sort=latest\|likes`, `from`/`to`(YYYY-MM-DD, 한국 시간), `teamId`, `hasImage=true` | visible만. 숨김·승인 대기는 목록에 없음. `hasImage`는 첨부 이미지가 있는 글만 |
| `GET /matches` | 누구나 | 기존 + `teamId` | 팀 이름과 홈·원정 이름이 **완전히 같은** 경기만. 비슷한 이름은 합치지 않음 |
| `POST /posts`, `PATCH /posts/:id` | 로그인 | 기존 + `imageIds?`(최대 10), `teamIds?`(최대 5) | 수정 때 `imageIds`를 보내면 목록에 없는 기존 파일은 삭제 |
| `GET /profiles/:nickname` | 누구나 | - | 확장된 `PublicProfile` |

## 활동 배지

`user_badges`에 지급한다. 같은 `(userId, badgeId)`는 한 번만. 조건이 깨지면 행을 지워 회수한다. 공개 프로필을 읽거나 글 작성·삭제·추천·숨김 때 다시 계산한다.

| id | 라벨 | 지급 | 회수 |
| --- | --- | --- | --- |
| `first_post` | 첫 글 | 공개 글 1개 이상 | 공개 글 0개 |
| `liked` | 추천받은 글 | 공개 글 중 `likeCount` 5 이상인 글 1개 이상 | 그런 글이 없어짐(추천 취소·삭제·숨김) |
| `regular` | 꾸준한 참여 | 공개 글 5개 이상 | 공개 글 4개 이하 |

`GET /badges`는 기준 설명만 준다. 차단된 회원의 공개 프로필은 404라 배지도 안 보인다.

## 인기글 정렬

- 인기 여부(`isBest`): `likeCount >= settings.bestThreshold` 이고 `bestExcluded`가 아니고 공지가 아님
- 목록 `sort=likes`: 추천 수 내림차순, 같으면 작성 시각 내림차순, 같으면 `id` 내림차순
- 기본 `sort=latest`: 작성 시각 내림차순, `id` 내림차순

저장 경로는 `docs/UPLOADS.md`.

## 경기 응원방

경기마다 대화 하나. 메시지는 DB에 저장한 뒤 확정된 내용을 돌려준다. 외부 경기 API는 연결하지 않았고, 점수는 기존 DB 값이다.

| 주소 | 권한 | 요청 | 응답 |
| --- | --- | --- | --- |
| `GET /matches/:id/chat` | 누구나 | `?beforeId` | `{ items, pageSize }` 오래된 순. 한 번에 50개. 비회원은 visible만 |
| `POST /matches/:id/chat` | 로그인 | `{ body }` 1~500자 | 201 확정 메시지. 2초 안에 다시 보내면 400. 차단 계정은 세션이 없어 401 |
| `DELETE /matches/:id/chat/:id` | 작성자·관리자 | - | `{ id, matchId, deleted: true }` |
| WebSocket ` /api/chat?matchId=` | 쿠키 있으면 회원 | `{ type: 'send', body }` `{ type: 'since', afterId }` | `{ type: 'ready'\|'online', online }`, `{ type: 'message', message }`, `{ type: 'catchup', items }`, `{ type: 'deleted', id }` |

`online`은 실제로 열린 소켓 수다. 방 이동·종료 때 소켓을 닫으면 방에서 빠진다.

신고 `targetType: 'chat'`은 기존 신고 API를 쓴다.

---

# 커뮤니티 확장 (4단계)

운영자 계정 차단(`users.status = blocked`)과 회원 숨김(`user_mutes`)은 다르다. 숨김은 그 사람의 글·응원방 메시지를 **내 목록에서만** 빼고, 계정 자체는 막지 않는다.

알림은 기존 `/notifications` 함을 쓴다. 종류: `comment`, `reply`, `mention`, `subscribe`, `follow`, `inquiry_answer`, `message`, `report_result`.

같은 댓글 이벤트에서 글 작성자는 `comment`, 부모 댓글 작성자는 `reply`, 그 외 `@닉네임`은 `mention`, 구독자는 `subscribe`만 받는다. 자기 행동으로는 알림을 만들지 않는다. 숨긴 회원의 멘션·댓글·팔로우 알림은 보내지 않는다.

| 주소 | 권한 | 요청 | 응답 |
| --- | --- | --- | --- |
| `GET /notifications` | 로그인 | `?page&pageSize` | `NotificationList`. 항목에 `available`. 글이 없거나 공개가 아니면 `false` |
| `GET /notifications/settings` | 로그인 | - | 종류별 boolean. 기본 모두 true |
| `PATCH /notifications/settings` | 로그인 | 바꿀 종류만 | 저장 후 설정 |
| `POST /profiles/:nickname/follow` | 로그인 | - | 200 `{ following: true }`. 본인이면 400. 이미 팔로우면 그대로 |
| `DELETE /profiles/:nickname/follow` | 로그인 | - | `{ following: false }` |
| `GET /profiles/:nickname/followers`, `.../following` | 누구나 | `?page&pageSize` | 활성 회원 `SocialUser` 목록 |
| `GET /me/following`, `GET /me/followers`, `GET /me/mutes` | 로그인 | `?page&pageSize` | 위와 같음 |
| `POST /profiles/:nickname/mute` | 로그인 | - | `{ muted: true }`. 본인이면 400 |
| `DELETE /profiles/:nickname/mute` | 로그인 | - | `{ muted: false }` |
| `POST /posts/:id/subscribe` | 로그인 | - | `{ subscribed: true }` |
| `DELETE /posts/:id/subscribe` | 로그인 | - | `{ subscribed: false }` |
| `GET /posts?followed=true` | 로그인 | 기존 목록 쿼리 | 팔로우한 회원의 공개 글. 비로그인이면 401 |
| `GET /profiles/:nickname` | 누구나 | - | 기존 + `id`, `followerCount`, `followingCount`, `followed`, `muted` |

댓글을 쓰면 그 글을 자동 구독한다. `@닉네임`은 앞이 공백이거나 문장 시작이고 닉네임 2~12자일 때만 멘션이다.

숨긴 회원의 글은 게시판·검색·홈 목록에서 빠지고, 응원방 과거 조회에서도 빠진다. 그 사람 프로필을 직접 열면 글은 볼 수 있다.

---

# 커뮤니티 확장 (5단계)

게시글 투표는 경기 승무패 예측과 별개다. 선택지 2~10개, 단일 선택, 회원당 한 표(`post_poll_votes` PK). 마감 전에는 선택을 바꿀 수 있고 마감 후에는 못 바꾼다. 표가 하나라도 있으면 선택지·마감을 수정하거나 투표를 지울 수 없다.

| 주소 | 권한 | 요청 | 응답 |
| --- | --- | --- | --- |
| `POST /posts` | 로그인 | 기존 + `poll?: { options, closesAt }` | `PostDetail.poll` |
| `PATCH /posts/:id` | 작성자·관리자 | `poll` 객체면 교체, `null`이면 삭제(표 없을 때만) | 표가 있으면 400 |
| `POST /posts/:id/poll/vote` | 로그인 | `{ optionId }` | 200 투표 현황. 마감이면 400 |
| `GET /polls` | 누구나 | `?teamId` | 마감 전 공개 글 투표. 참여 수·마감 시각 순 |
| `GET /badges` | 누구나 | - | 배지 기준 목록 |
| `GET /admin/teams` | 관리자 | - | 비활성 포함 전체 팀 |
| `POST /admin/teams` | 관리자 | `{ name, sport, leagueId? }` | 이름 중복 400. 비슷한 이름은 합치지 않음 |
| `PATCH /admin/teams/:id` | 관리자 | `{ name?, sport?, leagueId?, active? }` | 비활성화하면 신규 응원 선택에서 빠짐 |
| `GET /admin/dashboard` | 관리자 | - | 기존 + `chat.today`(오늘 응원방 메시지), `polls.open`(마감 전 투표 수). 빈 값은 0 |

글 단위 OG 이미지·제목은 SPA라 개발 서버에서는 사이트 공통 메타만 쓴다. 게시글별 미리보기는 남은 작업이다.

---

# 글 탐색

같은 게시판의 공개 글만 이전·다음·관련로 묶는다. 이전은 더 오래된 글, 다음은 더 새 글이다. 관련글은 같은 경기(`matchId`)가 있으면 그 경기를, 없으면 같은 말머리를 우선하고 5개가 안 되면 같은 게시판 최신으로 채운다.

| 주소 | 권한 | 요청 | 응답 |
| --- | --- | --- | --- |
| `GET /posts/:id` | 화면 로그인 · API GET 공개 | - | 기존 `PostDetail` + `prev`·`next`(`{ id, title, tag } \| null`) + `related: PostSummary[]`(최대 5) |
| `GET /posts` | 화면 로그인 · API GET 공개 | 기존 + `authorId` | 그 작성자의 공개 글만 |

---

# 검색·기간 필터

목록 API는 파라미터가 없으면 한국 시간 오늘만 조회한다. `range=all`일 때만 날짜를 뺀다. `searchType`은 받아도 무시하고, 검색어 한 칸이 관련 필드를 OR로 찾고 단어 사이는 AND다. `#123`은 번호 정확 일치다.

공통 쿼리: `range=today|custom|all`, `from`, `to`(YYYY-MM-DD), `q`, `page`, `pageSize`. 응답에 `filter: { range, from, to }`가 붙는다. 잘못된 날짜·시작>종료는 400이다.

위젯·옵션·수신자 선택은 오늘 기본값을 물려받으면 안 된다.

| 주소 | 권한 | 요청 | 응답 |
| --- | --- | --- | --- |
| `GET /posts` | 화면 로그인 · API GET 공개 | `includeNotice`, `hasImage`, `hasComments`, `minLikes`, `minCommentCount`, `poll=none\|open\|closed`, `sort=latest\|oldest\|likes\|views\|comments` | 공지 제외가 기본. 통합검색은 제목·본문·닉네임·팀. `/search`는 `includeNotice=true` |
| `GET /admin/users` | 관리자 | `dateField=created\|lastLogin\|blocked`, `status`, `role`, `hasLogin`, `inactiveDays`, `minPosts`/`maxPosts`, `minComments`/`maxComments`, `teamId`, `hasBio`, `hasAvatar`, `blockKind=permanent\|timed`, `expireWithinHours`, `sort` | `q`는 회원번호·아이디·닉네임·차단 사유. `blockedAt` 없는 과거 차단은 전체기간에서만 |
| `GET /admin/users/lookup` | 관리자 | `q`, `page`, `pageSize` | 활성 회원 전체기간. 쪽지 수신자 전용 |
| `GET /admin/posts`, `GET /admin/comments` | 관리자 | 기간 + 통합검색 + `authorId` 등 | 작성일·댓글 작성일 |
| `GET /admin/reports` | 관리자 | `targetType=post\|comment\|chat`, `reason`, `minCount`, `pendingHours`, `sort=latest\|pending_old\|count` | 신고일 기준으로 대상 그룹 |
| `GET /matches` | 화면 로그인 · API GET 공개 | 기간(킥오프), `q`, `sport`, `leagueId`, `teamId`, `side`, `status`, `hasScore`, `missingScore` | 배열. 기간 없으면 오늘. 전체 일정은 `range=all` |
| `GET /admin/matches` | 관리자 | 공개와 같음 + 페이지 | 점수 `0`과 `null`을 구분. `missingScore`는 종료인데 점수가 비어 있는 경기 |
| `GET /admin/inquiries`, `GET /inquiries` | 해당 권한 | `dateField=created\|answered`, `waitingHours`, `sort` | 문의 등록일 기본 |
| `GET /admin/messages`, `GET /messages` | 해당 권한 | `toAll`, `toUserId`, `unread`/`unreadOnly` | 발송·수신 시각. 전달 실패 필터 없음 |
| `GET /admin/logs` | 관리자 | `action`, `adminId`, `targetType`, `targetId` | 조치 시각 |
| `GET /admin/teams`, `GET /admin/leagues`, `GET /admin/words` | 관리자 | 기간, `q`, 종목·연결 여부 | 페이지 객체. 공개 `/teams` `/leagues`는 오늘 제한 없음 |
| `GET /notifications` | 로그인 | `unread`, `type`, `q` | 소유자 고정. 발생일. 기간 없으면 오늘 |
| `GET /rankings/predictions` | 화면 로그인 · API GET 공개 | 킥오프 기간, `sport`, `leagueId`, `teamId`, `minDecided`(기본 1), `q` | 모집단에서 순위를 매긴 뒤 검색. 시즌 없음. 기간 파라미터 없으면 누적(`all`) |

가짜로 만들지 않는 것: 현재 온라인, 쪽지 전달 실패, 시즌, 금칙어 탐지 횟수, 최초 응답 시간.
