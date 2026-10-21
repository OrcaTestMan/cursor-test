# NEX 개발 규칙 (모든 작업에 적용)

## 1. 메뉴·화면 완료 기준
새 메뉴나 화면은 아래가 모두 끝나야 "완료"다. 데모 데이터만으로 만든 화면은 완료가 아니다.
- DB: 필요한 테이블·컬럼은 `apps/api/src/db/schema.ts`를 고친 뒤 `yarn workspace api db:generate`로 새 마이그레이션을 `apps/api/drizzle/`에 추가한다. 기존 마이그레이션 파일 수정 금지. 로컬 적용은 `yarn workspace api db:migrate`
- API: 화면이 쓰는 데이터는 전부 API로. localStorage·하드코딩 데모 데이터 금지
- 화면: API 실패 시 "데이터를 불러오지 못했습니다" 표시 (가짜 데이터로 대체 금지)
- 시드: `ALLOW_SEED_RESET=1 yarn workspace api seed:reset` 에 이 화면을 테스트할 데이터 추가
- 검증: 화면 숫자 = SQL 직접 집계 값 확인 스크립트 (`apps/api/scripts/`)
- 테스트: `yarn workspace api test` + `yarn workspace api test:e2e` (로그인 없음 401, 권한 없음 403)
- 성능: 목록은 커서 페이지네이션, SELECT * 금지, N+1 금지

## 2. 돈
- 잔액을 바꾸는 모든 동작은 `WalletService.applyMoney` 경유. 직접 UPDATE/INSERT 금지
- 금액은 정수(원), 원장은 추가만 (수정·삭제 금지, 정정은 반대 거래로)
- 돈 관련 변경 후에는 `yarn workspace api money:verify-daily` mismatch 0 확인

## 3. 보안
- 모든 /api/* 는 관리자 세션 필수 (예외: GET /api/health, POST /api/auth/login)
- 새 API는 자동으로 막히는 구조 유지, 위험한 작업은 역할 검사
- 비밀번호, 토큰, .env 값, TOTP는 채팅·로그·git·터미널 출력 금지
- 서버 DB에 원격 접속 금지. 이 PC는 로컬 DB(127.0.0.1)만 사용
- 환경변수로 서버 DB 주소를 설정하지 말 것

## 4. 브랜치·배포
- 작업은 dev 브랜치. main 병합은 대표 승인 후에만 (main 병합 = 서버 자동 배포)
- main 병합 전 필수: `yarn workspace api test`, `yarn workspace api test:e2e`, `yarn workspace web build`, `yarn workspace api build`, `yarn workspace api money:verify-daily` mismatch 0
- 마이그레이션이 포함되면 서버 자동 배포가 멈춘다. 병합 전에 대표에게 알리고 서버 적용 절차를 같이 보고
- `scripts/deploy-safe.mjs`, `scripts/server/*` 수정 시 "서버 C:\nex\deploy\ 수동 반영 필요" 보고

## 5. 서버 (서버 PC의 Cursor에 해당)
- 서버 작업 폴더에서 커밋하지 않는다. 변경은 별도 브랜치로 push 후 PC에서 병합
- 3389(원격 접속), 5432(DB) 설정 변경은 대표 승인 후에만
- 운영 DB에서 `yarn workspace api seed:reset`, 테스트, 데이터 삭제 금지
- DB 구조 변경 전에는 반드시 백업

## 6. 보고
- 단계마다 완료 기준별 통과/실패 표
- 예상과 다르면 멈추고 보고, 추측으로 진행하지 않는다
