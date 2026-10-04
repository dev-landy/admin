# 어드민 UI/UX 점검과 개선

기준일: 2026-10-04. 어드민 16개 화면, 공통 탐색·표·필터, 로그인·카카오 callback을 점검했다. Mocket 문서의 UX 판단을 웹 어드민에 맞게 적용하고, 실제 백엔드 어드민 DTO·조회 조건과 대조했다.

## 참고 자료와 적용 범위

- `/Users/castledoor/code/mocket-docs/app/done/interface-guidelines-audit.md`
- 같은 문서 앱의 `interactions.md`, `navigation.md`, `ui-regression-guidelines.md`, `done/reusable-ui-primitives.md`
- [WCAG 키보드 접근](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), [포커스 표시](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), [반복 영역 건너뛰기](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html)
- [WCAG 입력 라벨](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), [오류 식별](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html), [상태 메시지](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [WCAG Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [조작 영역](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [Ant Design 데이터 표시](https://ant.design/docs/spec/data-display/)
- 설치된 Next 16.2.9의 `usePathname`, CSS, 접근성 문서와 Ant Design 6.4.5 타입 정의

목록 상태 보존, 입력·선택·실행의 구분, 명시적 라벨과 복구, 요청 중 상태, 작은 화면에서도 전체 값을 읽을 수 있는 배치를 적용했다. Mocket의 네이티브 시트 핸들·44pt/48dp 규칙·탭 제목 애니메이션은 웹 규칙과 구분했다. 웹 AA 타깃 기준은 24 CSSpx 또는 해당 간격 예외이며, 모바일 네이티브 권장을 그대로 웹 의무로 해석하지 않았다.

## 발견한 문제와 수정

| 영역 | 이전 문제 | 반영한 개선 |
| --- | --- | --- |
| 메뉴 | 상세에서 선택 메뉴가 사라짐, 13개 항목의 구분이 약함 | 가장 구체적인 부모 경로 선택, 임대/알림/시스템 그룹, 스크롤되는 고정 사이드바 |
| 키보드 탐색 | 반복 메뉴 건너뛰기·사이드바 접기 접근 부족 | 본문 skip link, 하나의 main, 실제 접기 버튼, 포커스 표시, 화면별 제목 |
| 공통 위계 | 카드 내부 제목·작업 위치·간격이 제각각 | `PageHeader`, 일관된 h1·설명·관련 작업, 반응형 작업 줄 |
| 필터 발견 | 열의 작은 아이콘만으로 조건을 찾음, placeholder 의존 | 이름이 있는 상단 필터 폼, 원자적 조회, 입력 초안까지 초기화 |
| 필터 상태 | URL 변경 뒤 이전 초안 표시, 일부 열의 적용 표시 누락 | URL과 폼 동기화, 페이지 변경 중 초안 보존, `filteredValue`, 운영 화면 적용 요약 |
| 조회 값 | URL의 NaN·음수·잘못된 enum/날짜가 요청에 전달 | 양의 정수·최대 크기·실제 날짜·지원 enum 검증 |
| 목록 복귀 | 상세에서 목록으로 돌아오면 조건·페이지 소실 | 정확히 같은 도메인의 목록 URL만 허용하는 `returnTo` 보존 |
| 페이지네이션 | 크기 변경과 마지막 페이지 삭제 뒤 잘못된 페이지 | 크기 변경 시 첫 페이지, 관련 데이터 목록 총수 감소 시 유효 페이지 보정 |
| 표 | 범용 빈 상태, 가로 표의 키보드 조작 부족 | 도메인 빈 상태·필터 복구 안내, 이름 있는 결과 영역·좌우 키, 숫자 정렬·tabular digits |
| 삭제·권한 | 삭제 대상이 모호함, 권한 변경의 영향이 드러나지 않음 | 대상 ID/이름·결과·삭제/취소, 권한 변경 확인과 완료/실패 안내 |
| 알림 설정 | 일부 설정 요청의 오류가 조용히 끝남 | 알림 설정 성공/실패 피드백, 명시적 Switch/Select 이름과 진행 상태 |
| 편집 초안 | 임차인·알림톡 배경 재조회가 입력을 덮어씀, 정책·스케줄 창의 우발적 닫기로 초안 소실 | 편집 세션 보존, 취소·탐색 시 미저장 확인, 저장 결과 반영 |
| 중첩 작업 | 건물 모달 종료 뒤 이전 임차인 편집 상태 잔류 | 종료 시 편집 대상 정리, 관련 캐시 및 페이지 갱신 |
| 요청 수명 | 발송·저장·토큰 발급 중 닫기/반대 작업, 늦은 callback 경쟁 | pending 폼/닫기/상반 작업 제어, 관련 토큰·발송 모달 세션 검사 |
| FCM | 빈 폼 validation rejection, 클릭 전용 data 삭제, 중복 key 덮어쓰기 | 실제 폼 제출·오류 처리, 이름 있는 삭제 버튼·필드 라벨, 중복 key 차단 |
| 발송 결과 | 모든 대상 실패에도 완료를 성공처럼 안내 | 결과에 맞는 실패 안내, 처리/발송 개수 의미와 대상 범위 유지 |
| 작은 화면 | 2열 계약 입력·긴 정책 내용·고정 로그인 폭 | 좁은 계약 폼 1열, 정책 세로 설명, 긴 URL 줄바꿈, 로그인 최대 폭 |
| 스타일/API | 의미 있는 작은 회색 텍스트와 deprecated 용례 | 설명 대비, 일관된 컨트롤·간격, `Space.orientation`, `Descriptions.items`, `mask.closable` |

## 화면별 coverage

| 화면 | 주요 확인·수정 |
| --- | --- |
| `/users` | 가입 경로/역할/상태 필터, 적용 표시, 상세 복귀, 삭제 대상/완료 |
| `/users/[userId]` | 오류에서도 목록 복귀, 설정 오류, 역할 확인, 토큰/FCM 요청 수명 |
| `/properties` | 소유자/검색 필터, 임차인 모달 수명, 수정·삭제·조회 상태 |
| `/tenants` | 소유자/알림/정확한 시작일·종료일 필터, 복귀·페이지 보정 |
| `/tenants/[tenantId]` | 읽기 쉬운 상세, 초안 보존·폐기 확인, 관련 캐시 갱신 |
| `/contract-ocr` | 공통 제목, 최초 실패/재조회/빈 상태, 기존 목록 보존 |
| `/contract-ocr/[documentId]` | 기존 검수 보호 유지, 작은 화면 입력/하단 작업 영역, 상태 대비 |
| `/payments` | 청구월 월 선택, 출처·유저·임차인 필터, 적용 표시·관련 링크 |
| `/payments/duplicates` | 설명과 원본 목록 링크, 중복 그룹/표 상태 |
| `/notifications` | 유저/유형/읽음 폼·요약, 행/버튼/키보드 상세, API 누락값 안내 |
| `/notifications/outbox` | 상태/ID 필터, 처리 범위·재등록 가능 상태·빈 결과 |
| `/fcm` | 필드 검증, data 키/값/삭제, 진행 중 반대 작업과 결과 안내 |
| `/alimtalk` | 발송 조건/대상 날짜 필터, 템플릿 편집 보존·검증, 과금 테스트 작업 상태 |
| `/release-policies` | 식별자/업데이트 기준 설명, 세로 상세·URL, 폼 validation·pending |
| `/batch` | Job/실행 상태/종료 코드/대상 날짜 필터, 상세·정밀 시각 유지 |
| `/batch/schedules` | 배치 설정 설명·상태·실행 이력 링크, 변경 작업 상태 |
| 로그인·callback | 320px 폭과 낮은 높이 대응, 로그인 상태의 접근성 이름 |

## 실제 서버 계약과의 대조

서버 코드는 `/Users/castledoor/code/git/landy/backend/landy-admin/src/main/java/com/landy/admin/`에서 읽기만 했다.

- `infra/persistence/AdminPaymentRepository.java`: 납부 `from/to`는 `paidAt`이 아니라 `billingMonth` 범위다. UI를 청구월 선택과 월 첫날의 기존 날짜 직렬화로 맞췄다.
- `infra/persistence/AdminTenantRepository.java`: 시작일/종료일 필터는 각각 정확 일치다. 겹치는 계약 기간 검색이라고 안내하지 않는다.
- `infra/persistence/AdminBatchExecutionQueryRepository.java`: 배치 날짜는 실행 시각이 아니라 Job parameter `targetDate` 범위다.
- `application/dto/AdminNotificationSummary.java`: 목록은 `createdAt`을 제공하며 `content/sentAt`은 현재 제공하지 않는다. 생성일과 발송일을 구분하고 누락된 본문·발송일을 안내한다. Outbox의 실제 `sentAt`과 혼동하지 않는다.
- Outbox 재등록은 `FAILED/SKIPPED`만, dispatch의 처리 수와 성공 발송 수는 별개, FCM 구독/해제는 서로 다른 작업이라는 현행 계약을 유지했다.

## 초기 UI/UX 점검 시점의 검증과 한계

최종 소스의 `npm run type-check`, `npm run lint`, `npm run build`, `git diff --check`가 통과했다. 전체 Jest 실행과 집중 회귀 검증을 구분한다.

- 공통 탐색·필터·표·날짜·URL 검증: 신규 5개 suite / 30개 테스트 통과.
- 데이터 화면: 신규 앱 테스트 11개 통과, 마지막 초안 보호 변경 후 drawer·요청 모달 8개 재검증 통과. 초기 개선 시점의 기존 16개 suite / 93개 통과를 최종 소스 전체 통과로 확대하지 않는다.
- 운영 화면: 27개 suite / 141개 테스트 통과(신규 6개 suite / 17개 포함). 이후 날짜 표기 변경에 영향받은 3개 suite / 11개 재검증 통과.
- 마지막 정책·스케줄 초안 보호: 신규 2개 suite / 16개 테스트를 추가하고 타입·scoped lint·독립 코드 검토·실제 브라우저 동작을 확인했다. Jest diagnostic은 clean 닫기 1개 통과, 변경 후 취소 1개가 기존 5초 제한으로 시간 초과, 6개 제외였다. 최종 집중 6개 suite 실행은 2분 16초 동안 suite 출력이 없어 해당 테스트 프로세스만 종료했다. 이 16개를 Jest 통과 수치에 합산하지 않는다.
- 전수 Jest는 높은 호스트 부하에서 OCR 조회와 모바일 메뉴 비동기 테스트가 시간 초과되어 완료하지 못했다. OCR 첫 테스트는 `git archive HEAD`로 만든 기준 코드에서도 같은 assertion에서 시간 초과했다. 전역 timeout을 늘리는 변경은 제거했으며, 전수 회귀 통과로 보고하지 않는다.

실제 Chrome에서 API 요청을 로컬 fixture로 차단하고 어드민 16개 화면을 1440px/320px에서 렌더했다. 32개 화면 조건에서 페이지 전체 가로 넘침, 빠진 h1, console warning/error, 처리되지 않은 오류가 없었다. 상세→목록 조회 조건 보존, 모바일 메뉴 이동, 빈 FCM 폼의 필드 오류, 키보드 알림 상세, 임차인 초안 폐기 취소/확정, 청구월의 월 첫날 직렬화, 좁은 정책 편집과 초안 보호, 배치 스케줄 초안 보호, 320px 로그인과 취소된 카카오 로그인 복구 등 9개 동작을 실제 조작했다. 표 내부의 필요한 가로 스크롤은 페이지 전체 넘침과 구분한다.

이 브라우저 검증은 실제 서버의 개인정보·과금 발송·푸시 전달·카카오 인증 성공을 시험한 것이 아니다. 서버 계약은 코드 대조로 확인했다. 실제 화면리더 발화와 모든 브라우저/확대율 조합의 WCAG 적합성 전수 판정을 주장하지 않는다. 서버가 제공하지 않는 알림 본문/발송일은 이 프론트엔드 변경만으로 채울 수 없다.

## 이번 세션 커밋만의 최종 검증

다른 세션의 코드와 신규 테스트를 제외한 독립 소스 트리에서 **67 suites·413 tests, 실패·skip 0**을 확인했다. 61 suites·309 tests와 데이터 화면 6 suites·104 tests를 서로 겹치지 않는 두 실행으로 검증했다. 마지막 사례 완료 시각은 `2026-10-05T00:41:13.652000+09:00`이다.

- native TypeScript 검사·ESLint·Turbopack 프로덕션 빌드 통과.
- 커밋 여섯 단계의 중간 소스 트리도 각각 타입 검사를 통과했다.
- 최신 AntD 확인창 애니메이션은 테스트 host의 `ConfigProvider`에서만 제어했다. 폼 값·요청·잠금·실패 복구 단언을 유지하고, 동적 필드 렌더 및 dirty 알림의 실제 완료를 기다린다. 생산 코드와 전역 테스트 timeout은 변경하지 않았다.
- 다른 세션의 대체 테스트에 의존하던 인증 테스트 삭제와 깨끗한 알림톡 폼의 재조회 사례 삭제는 커밋하지 않았다.
- 로컬 근거: `/tmp/landy-admin-session-commits-20261005/validation.json`, `remaining-tests.json`, `data-final-tests.json`, `build-final.log`, `typecheck-final.log`, `lint-final.log`.
