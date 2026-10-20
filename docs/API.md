# API 계약 (NEX 핵심)

전역 prefix: `/api`  
목록 공통: `page`, `pageSize`(20|50|100), `range`(today|custom|all), `from`, `to`, `q`  
기본 기간: **오늘**(Asia/Seoul). 전체는 `range=all`.

인증·권한은 다음 단계. 지금은 골격이다.

## Health

`GET /api/health` → `{ "status": "ok" }`

## 회원

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/users` | 목록 (`status=active\|blocked`) |
| GET | `/api/users/:id` | 상세 |
| PATCH | `/api/users/:id/status` | `{ status, blockReason? }` |

## 입출금

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/cash` | 목록 (`type`, `status`) |
| GET | `/api/cash/:id` | 상세 |
| PATCH | `/api/cash/:id/status` | 대기→`승인\|거절\|지급 실패`. 승인 시 잔액·`nex_money_moves` 반영 |

## 스포츠 배팅

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/bets` | 목록 (`status`, `whenLabel`) |
| GET | `/api/bets/:id` | 상세 |
| PATCH | `/api/bets/:id/status` | 진행 중→`적중\|미적중\|취소`. 적중·취소 시 머니 반영 |

## 카지노 배팅

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/casino-bets` | 목록 (`status`, `kind`) |
| GET | `/api/casino-bets/:id` | 상세 |
| PATCH | `/api/casino-bets/:id/status` | 스포츠와 동일 규칙 |

## 머니 원장

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/money-moves` | 목록 (`userId`) |
| GET | `/api/money-moves/:id` | 상세 |

구축 순서: `docs/CORE.md`
