# [4] 리스크 벤치 결과 (로컬, PERF_FULL 이후)

측정: `apps/api/scripts/risk-bench.mjs`  
시각: 2026-10-21

## SQL 교차검증

| 지표 | API | SQL | 일치 |
|------|-----|-----|------|
| maxRisk | 159720 | 159720 | Y |
| openStake | 325850 | 325850 | Y |
| openBets | 1000042 | 1000042 | Y |

## p95 (n=30)

| 엔드포인트 | p95 | 목표 300ms |
|------------|-----|------------|
| GET /api/risk/summary | **40.4ms** | PASS |
| GET /api/risk/matches?limit=20 | **49.1ms** | PASS |
| GET /api/risk/matches/:id | **23.6ms** | PASS |

## 배팅 추가 → 반영

- `reflectMs`: **323ms** (목표 3초 이내) → PASS

## EXPLAIN ANALYZE (노출 집계)

```
Limit  (cost=1.37..1.40 rows=12 width=36) (actual time=0.040..0.042 rows=12 loops=1)
  Buffers: shared hit=4
  ->  Sort  (cost=1.37..1.40 rows=12 width=36) (actual time=0.027..0.028 rows=12 loops=1)
        Sort Key: ((payout_sum - stake_sum)) DESC
        Sort Method: quicksort  Memory: 25kB
        ->  Seq Scan on nex_risk_exposure  (cost=0.00..1.15 rows=12 width=36) (actual time=0.006..0.008 rows=12 loops=1)
Planning Time: 0.074 ms
Execution Time: 0.070 ms
```

## seed:perf PERF_FULL

| 항목 | 결과 |
|------|------|
| users | 10,000 |
| bets | 1,000,000 |
| money_moves | **3,000,070** |
| 1차(2M) 소요 | 68.3s |
| top-up 1M | +16.7s |

## 화면

- `nex-behavior.js`: 리스크 상단·감시 목록·회원 표를 `/api/risk/*` 우선 표시, SSE 3초 갱신
- HOT_PAD 데모 패딩은 API 모드에서 비활성
