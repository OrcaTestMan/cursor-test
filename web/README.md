# 어디아파 — 의료 길찾기 MVP (web)

BODY → SYMPTOM → SAFETY GUIDE → DEPARTMENT → SYMPTOM SUMMARY

질병을 진단하지 않는다. 입력을 구조화해 위험 신호·일반적인 진료과·병원에 설명할 요약을 안내한다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## 구조

```
src/
  app/              라우트 (/, /symptom, /records, /hospitals, /my, /privacy)
  components/
    body/           SVG 신체 지도, 세부 부위 선택
    symptoms/       통증 형태 · 강도 · 기간 · 동반 증상
    safety/         안전 안내 (normal / attention / urgent)
    departments/    진료과 안내
    summary/        진료 준비 요약
    ads/            광고 placeholder (건강정보 props 없음)
    flow/           단계 오케스트레이션
    layout/, ui/    셸 · 하단 메뉴 · 공용 UI
  data/             bodyParts · symptoms · followUpQuestions · redFlags · departmentRules · departmentDescriptions
  lib/
    rules/          evaluateSymptoms · getSafetyGuide · getRecommendedDepartments (UI와 분리)
    i18n/ko.ts      모든 한국어 문구
    storage.ts      localStorage (서버 전송 없음, 30일 자동 정리, 전체 삭제)
    summary.ts      요약 행·텍스트 생성
  types/            공용 타입
```

## 원칙

- 질병명·확률·치료·약 처방·응급 확정 표현 금지 (문구는 `lib/i18n/ko.ts`에서만 관리)
- `urgent` 상태와 입력 단계에서는 광고를 렌더하지 않음 (`lib/flow.ts` `AD_FREE_STEPS`)
- 광고 컴포넌트는 사용자 건강정보를 받지 않음
- 규칙·문항은 JSON으로 분리. 서버/AI로 교체 시 `lib/rules/evaluateSymptoms.ts`만 바꾼다
