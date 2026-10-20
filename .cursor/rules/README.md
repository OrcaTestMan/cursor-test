# 필터 표준 1.2.0 적용 방법

이 PC 원본: `C:\Users\01095\.cursor\filter-standard\`

새 워크스페이스에 `.cursor/rules/FILTERS.md`가 없으면 이 폴더의 `filters.mdc`, `FILTERS.md`, `PAGES.md`, `DETAILS.md`, `PREVIEW.html`, `README.md`를 프로젝트 `.cursor/rules/`로 복사한다. 이미 있는 파일은 덮어쓰지 않는다. 원본은 수정하지 않는다. 프로젝트 전용 화면 명세는 복사본 `PAGES.md`만 채운다.

## 구성

    프로젝트/.cursor/rules/
      filters.mdc
      FILTERS.md
      PAGES.md
      DETAILS.md
      README.md      선택
      PREVIEW.html   선택

- filters.mdc: 짧은 연결 규칙. `alwaysApply: false`. 검색·필터·목록 정렬·기간 조회를 만지거나 수정할 때만 걸린다.
- FILTERS.md: 공통 화면과 동작의 기준. 버전 1.2.0.
- PAGES.md: 프로젝트별 실제 화면·API·예외·검증 결과를 채우는 양식. 원본은 템플릿으로 둔다.
- DETAILS.md: 현재 변경과 관련된 절만 읽는 상세 참고.
- PREVIEW.html: 샘플 회원 데이터 8건으로 동작을 보여 주는 독립 HTML. 서비스 API·인증·페이지네이션 구현은 포함하지 않는다.

## 적용

1. 프로젝트 루트에 `.cursor/rules/FILTERS.md`가 없으면 원본을 복사한다. 같은 이름이 이미 있으면 건너뛴다.
2. Cursor에서 프로젝트 규칙으로 `filters.mdc`가 보이는지 확인한다.
3. 복사본 `PAGES.md`에 실제 라우트·조건·데이터 원천을 작성한다.
4. 요청한 화면부터 공통 컴포넌트와 실제 API에 연결하고 변경한 동작을 검증한다.

이 폴더는 복사 원본이다. Cursor Settings의 User Rules에 붙여 넣지 않으면 다른 폴더를 열 때 자동으로 따라가지 않는다. 프로젝트 `.cursor/rules/`도 다른 프로젝트로 자동 복사되지 않는다.

Cursor Rules: https://cursor.com/docs/context/rules

## Cursor User Rule (Settings에 붙여 넣기)

아래를 Cursor Settings → Rules → User Rules에 넣으면, 새 프로젝트를 열었을 때 에이전트가 원본을 프로젝트로 복사한다. 이 파일만으로는 Settings에 설치되지 않는다.

```text
검색·필터·목록 정렬·기간 조회를 개발하거나 수정할 때:

1. 현재 프로젝트에 `.cursor/rules/FILTERS.md`가 없으면
   `C:\Users\01095\.cursor\filter-standard\`의
   filters.mdc, FILTERS.md, PAGES.md, DETAILS.md, PREVIEW.html, README.md를
   프로젝트 `.cursor/rules/`로 복사한다.
2. 이미 있는 파일은 덮어쓰지 않는다. 원본 폴더는 수정하지 않는다.
3. 복사 후 `.cursor/rules/FILTERS.md`와 `.cursor/rules/PAGES.md`의 해당 화면을 읽고 적용한다.
4. 프로젝트 전용 화면·API·예외는 복사본 PAGES.md만 채운다.
```

## 1.2.0에서 정리한 내용

- 모든 날짜 목록의 오늘 기본값을 유지한다. 작업 대기열을 자동 전체기간으로 바꾸지 않는다. 필요하면 화면 프리셋으로 둔다.
- 날짜 조회가 아닌 화면의 제외 이유는 PAGES.md에 남긴다.
- 보이는 검색 라벨과 날짜 기준·시작·종료를 함께 사용한다.
- 잘못된 달력 날짜, 잘못된 숫자, 범위 역전, URL 정렬·옵션을 검증한다.
- 직접 입력 오류는 조회 차단·필드 안내, URL 오류는 잘못된 조건만 복구·안내·URL 정정으로 구분한다.
- 검색어 지우기/적용 조건 해제/전체 초기화의 동작을 구분하고 미제출 초안을 보존한다.
- 상세 조건 적용 수를 표시한다. 저장 검색·열 개인화 등은 선택 기능이다.
- 연결 규칙은 관련 작업에서만 적용한다. 전체 문서를 매 작업마다 불러오지 않는다.

현재 미리보기는 날짜·상태·정렬·검색의 예시다. 여기서 확인한 결과를 실제 서비스의 서버·권한 검증 결과로 보고하지 않는다.
