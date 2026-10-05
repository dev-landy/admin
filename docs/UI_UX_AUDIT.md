# 어드민 UI/UX 점검과 개선

2026-10-05의 업무 중심 표·상세·행 작업 재구성 기준과 기업 디자인 시스템의 적용 판단은 [관리자 업무 중심 UI 기준](ADMIN_WORKFLOWS.md)을 따른다. 아래는 2026-10-04 점검 기록이다.

기준일: 2026-10-04. 어드민 16개 화면, 공통 탐색·표·필터, 로그인·카카오 callback을 점검했다. Mocket 문서의 UX 판단을 웹 어드민에 맞게 적용하고, 실제 백엔드 어드민 DTO·조회 조건과 대조했다.

## 참고 자료와 적용 범위

- `/Users/castledoor/code/mocket-docs/app/done/interface-guidelines-audit.md`
- 같은 문서 앱의 `interactions.md`, `navigation.md`, `ui-regression-guidelines.md`, `done/reusable-ui-primitives.md`
- [WCAG 키보드 접근](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), [포커스 표시](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html), [반복 영역 건너뛰기](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html)
- [WCAG 입력 라벨](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), [오류 식별](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html), [상태 메시지](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
- [WCAG Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [조작 영역](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [Ant Design 데이터 표시](https://ant.design/docs/spec/data-display/)
- 최종 검증 시 설치된 Next 16.3.8의 `usePathname`, CSS, 접근성 문서와 Ant Design 6.6.5 타입 정의

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
| `/contract-documents` | 공통 제목, 최초 실패/재조회/빈 상태, 기존 목록 보존 |
| `/contract-documents/[documentId]` | 기존 검수 보호 유지, 작은 화면 입력/하단 작업 영역, 상태 대비 |
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

## 추가로 반영한 로딩·데이터·요청 수명 개선

- 초기 점검에서는 사용하지 않는 Geist Mono의 루트 preload를 제거했다. 현재는 본문과 Ant Design 전체를 Pretendard Variable v1.3.9의 CDN 가변 서브셋으로 통일했다. 화면의 실제 문자에 해당하는 파일만 요청하고, 버전이 고정된 CSS·WOFF2의 1년 immutable 캐시를 재사용한다. 전체 2,057,688바이트 폰트 파일의 로컬 번들은 제거했다.
- 공통 `loading.tsx`는 새 경로의 코드·서버 응답을 기다리는 동안 상태 메시지와 공간을 표시한다. 기존 페이지의 API 로딩 처리는 유지하며 서버/API의 응답 시간 자체를 줄였다고 주장하지 않는다.
- 권한·임차인 변경 및 알림톡 템플릿 저장의 겹치는 캐시 무효화를 제거했다. 실제 QueryObserver 회귀 검사에서 상세·승인 템플릿 재조회 2회가 1회로 줄었다.
- 사용자 삭제 후 서버가 함께 삭제하는 건물·임차인·납부·알림·계약서·알림톡 이력 캐시를 무효화했다. 공용 템플릿·배치·릴리즈 정책은 영향을 받지 않는다.
- 로그인·로그아웃의 세션 교체 시 조회·mutation 캐시를 비운다. 로그아웃 뒤 늦은 토큰 갱신이 토큰을 되살리거나 새 로그인을 덮어쓰지 않도록 갱신 요청·대기 큐의 세션 소유권을 확인한다. 동시 401의 재전송도 한 번으로 제한한다.
- 현행 서버의 APPLE 가입 경로를 URL·필터·목록·상세에 반영해 애플 가입자를 구글로 표시하던 문제를 수정했다.
- 알림톡 카드의 탐색·새로고침 초안 보호, 일반 네트워크 오류와 승인 템플릿 재조회, OCR 다음 검수 조회의 이탈 후 이동 방지, 배치 실행 시·분·간격의 정수 검증을 추가했다.
- 사용자 상세의 건물 삭제 확인에도 대상 ID·이름을 표시하고 FCM 토픽 발송 안내를 실제 구독 대상에 맞췄다.

판단이 필요한 성능·최신성·화면 정책과 페이지별 측정값은 [로딩 성능 조사](LOADING_PERFORMANCE_AUDIT.md)에 정리했다.

## 초기 UI/UX 점검 시점의 검증과 한계

최종 소스의 `npm run type-check`(TypeScript 7 native), `npm run lint`, `npm run build`(Next 16.3.8 프로덕션 및 TypeScript 6 호환 검사), `git diff --check`가 통과했다. 이번 기능의 추가 회귀 7개 suite / 37개 테스트는 현재 작업 트리에서 통과했다.

전체 Jest는 병행 작업의 테스트 정리 도중 파일이 제거돼 ENOENT가 발생했다. 이후 소스·테스트·설정을 임시 사본에 고정해 72개 suite를 전수 실행했다. 실제 프로덕션 소스는 사본과 SHA-256이 일치하는 것을 최종 확인했다.

- 전수 실행: 70개 suite 통과. 알림톡 기존 카드 suite는 병렬 워커 SIGSEGV, OCR suite는 30초 timeout 1건으로 종료했다.
- 같은 사본의 단일 프로세스 재검증: 알림톡 카드 4개 통과, OCR 54개 중 53개 통과. 최초 timeout 사례는 통과했으나 다른 초안 오류 표시 사례가 기본 비동기 대기 제한에서 timeout했다.
- 두 timeout 사례만 다시 실행해 2개 모두 6.079초 내 통과했다. 테스트 제한·제품 코드·핵심 assertion을 바꾸지 않았다.
- 전수와 이어진 재검증의 마지막 사례별 결과를 합치면 72개 suite / 442개 사례가 모두 통과했다. **단일 전수 실행의 전체 green과 실행 안정성은 확인되지 않았다.** 전체 실행에서의 워커 종료·시간초과는 테스트 실행 안정성의 남은 한계다.

모달 종료가 영구 대기하던 일부 테스트는 jsdom이 CSS 모션 속성을 지원한다고 보고하면서 animationend를 발생시키지 않는 문제였다. 해당 suite에서 공개 `ConfigProvider` API로 모션만 끄고 초기값·초안·요청·잠금·취소·오류 검증을 유지했다. 새 비동기 필드 렌더는 실제 표시까지 기다렸으며, loading 아이콘이 포함된 버튼 이름과 변경된 성공 callback 계약에 맞춰 테스트를 보완했다. 이 테스트 설정은 실제 브라우저의 시각 모션 검증을 대신하지 않는다.

최종 로컬 프로덕션과 별도 합성 API를 사용한 실제 브라우저에서 16개 화면을 1440px/320px로 확인했다. 32개 화면 조건 모두 페이지 전체 가로 넘침 없음, h1 하나·main 하나, 중첩 a/button 없음이 확인됐다. 키보드 알림 상세와 실제 DTO의 본문 누락 안내, 알림톡 초안이 있는 상태에서 메뉴 이동을 취소하고 현재 화면을 유지하는 동작도 확인했다. 브라우저 console warning/error는 없었다. 표 내부의 필요한 가로 스크롤은 페이지 전체 넘침과 구분한다.

상세 리소스·타이밍·화면·사례별 검사 결과는 `.gstack/benchmark-reports/`의 baseline, benchmark, browser-verification, test-verification JSON에 보존했다. 날짜·조건·서버 계약과 남은 선택지는 [성능 조사](LOADING_PERFORMANCE_AUDIT.md)에서 확인할 수 있다.

브라우저 검증은 실제 고객 정보·과금 발송·푸시 전달·카카오 인증 성공의 검증이 아니다. 서버 계약은 현재 코드 대조로 확인했다. 화면리더 발화, 모든 브라우저·확대율의 WCAG 적합성, 운영 환경 Core Web Vitals·API 지연을 전수 판정한 결과도 아니다. 서버가 제공하지 않는 알림 본문/발송일은 프론트엔드 변경만으로 채울 수 없다.


## 운영 세션 실측 후 판단·적용

2026-10-05의 [운영 Chrome 실측·최종 결정](PRODUCTION_UX_MEASUREMENTS.md)에 이전15개항목의 적용/유지 결정과 새로운 검증 결과를 기록했다. 위 판단 후보 표는 최초 조사 당시 기록이다.

## 이번 세션 커밋만의 최종 검증

다른 세션의 코드와 신규 테스트를 제외한 독립 소스 트리에서 **67 suites·413 tests, 실패·skip 0**을 확인했다. 61 suites·309 tests와 데이터 화면 6 suites·104 tests를 서로 겹치지 않는 두 실행으로 검증했다. 마지막 사례 완료 시각은 `2026-10-05T00:41:13.652000+09:00`이다.

- native TypeScript 검사·ESLint·Turbopack 프로덕션 빌드 통과.
- 커밋 여섯 단계의 중간 소스 트리도 각각 타입 검사를 통과했다.
- 최신 AntD 확인창 애니메이션은 테스트 host의 `ConfigProvider`에서만 제어했다. 폼 값·요청·잠금·실패 복구 단언을 유지하고, 동적 필드 렌더 및 dirty 알림의 실제 완료를 기다린다. 생산 코드와 전역 테스트 timeout은 변경하지 않았다.
- 다른 세션의 대체 테스트에 의존하던 인증 테스트 삭제와 깨끗한 알림톡 폼의 재조회 사례 삭제는 커밋하지 않았다.
- 로컬 근거: `/tmp/landy-admin-session-commits-20261005/validation.json`, `remaining-tests.json`, `data-final-tests.json`, `build-final.log`, `typecheck-final.log`, `lint-final.log`.
