-- 잔액 검증: 회원 지갑 컬럼 = 원장 합계 (불일치 0건이어야 함)
SELECT u.id, u.login, u.money AS wallet,
       COALESCE(SUM(m.amount), 0) AS ledger_sum,
       (u.money - COALESCE(SUM(m.amount), 0)) AS diff
FROM nex_users u
LEFT JOIN nex_money_moves m ON m.user_id = u.id
GROUP BY u.id
HAVING u.money <> COALESCE(SUM(m.amount), 0)
ORDER BY u.id;
