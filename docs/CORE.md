# NEX 핵심 구축 순서

대표님 합의 순서. 데모 HTML(`apps/web/public/nex`)은 **참고용**이며 완성본이 아니다.

## 1. 핵심 도메인 DB (확정)

| 도메인 | 테이블 | 역할 |
| --- | --- | --- |
| 회원 | `nex_users` | 계정·잔액·상태 |
| 머니 | `nex_money_moves` | 잔액 변동 원장 |
| 입출금 | `nex_cash_requests` | 입·출금 신청·승인 |
| 배팅 | `nex_bets` | 스포츠 배팅 |
| 카지노 | `nex_casino_bets` | 라이브/슬롯 등 |

그 외(총판·검수·배너 등)는 핵심 안정 후 확장한다.

## 2. API 골격 — 적용됨

각 도메인 공통: **목록 / 상세 / 상태변경** (`docs/API.md`)

- `GET/PATCH /api/users…`
- `GET/PATCH /api/cash…` (승인 시 머니·원장 반영)
- `GET/PATCH /api/bets…`, `/api/casino-bets…`
- `GET /api/money-moves…`

인증·권한은 다음 단계.

## 3. 페이지 — 다음

DB·API가 준비된 도메인부터 **하나씩** 새로 잡는다. localStorage 데모를 확장하지 않는다.  
다음 후보: 회원 목록 → 입출금 → 배팅.
