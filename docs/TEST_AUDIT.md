# 테스트 전수 조사 및 정리

이 문서는 2026-10-04 전수 조사 기록이다. 아래 전후 수치·후속 WIP 기록은 당시 같은 작업 폴더의 공동 스냅샷에서 측정했다. 이번 커밋에는 이 세션의 변경만 포함하며, 다른 세션의 캐시 정책·지연 로딩·OAuth 변경과 신규 테스트는 제외했다. 따라서 공동 스냅샷의 78 suites·502 tests를 이 커밋의 테스트 수로 읽지 않는다.

기존 `features/auth/context.test.tsx`는 다른 세션의 session-cache 테스트를 포함하지 않으므로 삭제하지 않는다. 같은 이유로 다른 세션의 대체 테스트에 의존한 통합은 제외하고 원래 행동을 보존했다. 이 커밋만의 독립 검증 결과는 문서 끝에 기록한다.

확인일: 2026-10-04. 최초 기존 테스트 파일 81개를 목록화하고 모든 테스트를 실제 사용자 행동과 요청 계약에 대조했다. 이후 추가된 캐시·링크·OAuth·지연 로딩 테스트도 같은 기준으로 조사했다. 배포 생략 스크립트의 Git 통합 테스트는 별도로 추가했다.

정적 상수·소스 모양의 복사, 반복된 기본 렌더, 다른 행동 흐름에 포함된 중복 검사를 삭제·통합했다. 인증·권한·입력 경계·요청 대상/본문·실패 복구·초안 보존·중복 요청 방지는 유지했다. 각 범위의 최초 스냅샷에서 87개 사례를 정리했으며, 동시 추가와 새 회귀는 별도 시점으로 기록했다.

## 공용 화면과 인증 경계


범위: `src/__tests__/{app,components,config,lib,features/auth}`. 생산 소스·공통 설정은 편집하지 않음.

최초 조사 스냅샷은 26파일 / 138 실행 케이스였다. 기존 스냅샷의 정리 결과는 112케이스(-26)다. 조사 도중 관찰한 동시 작업 WIP에 `client.test.ts` 6케이스와 `session-cache.test.tsx` 8케이스가 추가되어, 최종 실제 목록은 23파일 / 126케이스다. 해당 WIP 작성자는 확인하지 않았고, 현재 생산 계약에 필요한 경계 검증을 보존했다. 삭제·통합 파일도 아래에 포함했다.

| 파일 (src/__tests__/ 아래) | 결정 | 최초 → 최종 케이스 | 근거 |
|---|---|---:|---|
| app/admin-layout.test.tsx | change | 8 → 4 | 위치·단순 렌더 검사와 반복된 모바일 성공 이동 제거. 데스크톱/모바일 이탈 취소·승인, 실제 로그아웃 호출/드로어 닫기, 환경 표시 유지. 중복 브라우저 API 보완 코드는 공용 helper 사용. |
| app/admin-list-ux.test.tsx | keep | 11 → 11 | 필터 draft/reset, URL 적용, 사라진 페이지, API 입력 검증, 청구월 날짜 계약과 역전 범위 검증. |
| app/admin-navigation-ux.test.tsx | keep | 7 → 7 | 상세 경로의 가장 구체적인 메뉴 선택, 키보드 진입 경로와 사이드바 제어 검증. |
| app/auth/kakao/exchange.test.ts | keep | 5 → 5 | OAuth state/쿠키 단일 사용, token 교환, upstream 실패, backend 응답 비노출 경계. |
| app/batch/page.test.tsx | change | 2 → 2 | 이미 폐기된 날짜 지정 실행 버튼의 부재 단언과 제목 smoke 제거. API 필터/재조회/날짜 필터 페이지 초기화 검증 유지. |
| app/contract-ocr/detail-page.test.tsx | keep | 3 → 3 | 반환 목록 상태 보존, 외부 반환 주소 거부, 기존 링크 호환. |
| app/contract-ocr/page.test.tsx | keep | 4 → 4 | 검수/완료 반환 문맥, 처리 후 페이지 보정, 실패에서 페이지 오보정 방지. |
| app/notifications/page.test.tsx | keep | 8 → 8 | 필터/서버 outboxes 필드 바인딩, 최초/캐시 실패, dispatch 부분 실패/구버전 빈 응답의 중복 요청 방지. |
| app/operations/filter-ux.test.tsx | keep | 7 → 7 | 미제출 입력과 적용 URL 분리, 외부 URL 변경, 초기화 및 실제 API 조건 보존. |
| app/query-failure.test.tsx | change | 18 → 6 | 각 화면을 최초 실패→캐시 실패→정상 응답으로 rerender. 기존 재조회·데이터 유지·오류 제거 단언 모두 보존. |
| components/PagedTable.test.tsx | change | 2 → 2 | 행 텍스트 smoke 제거. 기존 UX 파일의 키보드 스크롤·빈 응답·한국어 총 건수 병합. 행 버튼 키 이벤트 보호, 실제 pagination/size 변경의 1페이지 보정 검증 추가. 고정 scroll 160 구현 미러 제거. |
| components/paged-table-ux.test.tsx | delete/merge | 2 → 0 | 행동 검증을 PagedTable.test.tsx에 통합. |
| components/QueryErrorAlert.test.tsx | change | 3 → 1 | 설명/이전 데이터/재조회→중복 재조회 차단→오류 해제 상태전이로 통합. 모든 기존 경계 단언 유지. |
| components/antd-deprecations.test.ts | delete | 1 → 0 | 세 파일의 JSX prop 이름만 검사하는 정적 소스 모양 테스트. 라이브러리 계약/런타임 행동을 검증하지 않아 제거. 타입·린트·실제 행동 검증은 별도 유지. |
| components/filter-draft-ux.test.tsx | change | 3 → 3 | 외부 필터 복구와 invalid Enter의 API 호출 방지 유지. InputNumber 자체 정규화 뒤 버튼 enabled 단언 제거. 외부 날짜 초기화가 onApply를 호출하지 않음을 검증. |
| components/navigation-guard.test.tsx | keep | 6 → 6 | Back/Forward 복원, Next listener 차단, 직접 진입 history, beforeunload, 내부 링크와 새 탭 차이. |
| config/env.server.test.ts | keep | 3 → 3 | 서버 필수 설정 누락/정규화·optional secret 경계. |
| config/env.test.ts | keep | 5 → 5 | 환경 정규화, 생산/잘못된 환경 fallback 경고 계약. |
| features/auth/context.test.tsx | keep (커밋 범위 분리) | 2 → 2 | 다른 세션의 session-cache 테스트를 커밋하지 않으므로 기존 로그인·로그아웃 행동 검증을 유지한다. |
| features/auth/kakao.server.test.ts | change | 4 → 4 | 실제 fetch 요청 계약·optional secret·upstream/형식 오류 보존. fixture env를 afterEach에 복구하여 격리. |
| features/auth/session-cache.test.tsx | change (동시 WIP) | 최초 없음 → 8 | cache/query 취소·mutation 제거, 늦은 응답/refresh의 새 세션 침범 방지. 모두 유지하고 deprecated fetchQuery를 현재 query API로 교체. |
| lib/api/client.test.ts | keep (동시 WIP 포함) | 2 → 8 | 동시 401 갱신, 재시도 상한, session 전환 뒤 stale refresh/대기열 격리. API 경계로 보존. |
| lib/api/problem.test.ts | change | 5 → 2 | 정상 계약과 invalid 입력 matrix로 통합. 기존 입력 및 각 필수 필드 누락/잘못된 타입 거부를 유지·확장. |
| lib/format/currency.test.ts | keep | 3 → 3 | 만원 UI와 원 API 경계/소액/빈 값 검증. |
| lib/format/date.test.ts | change | 6 → 7 | date-ux의 서버 타임존 보존 case 병합. 한국어 날짜/청구월/초/밀리초/빈 값 계약 보존. |
| lib/format/date-ux.test.ts | delete/merge | 1 → 0 | date.test.ts로 모든 단언 이동. |
| lib/navigation/list-params.test.ts | keep | 17 → 17 | 숫자 범위와 안전한 정수, 불가능한 날짜, returnTo open-redirect/목록 범위 경계. 보안 입력 matrix 독립 케이스 보존. |

### 검증과 coverage 근거

동일한 생산 파일 4개에 대해 통합 전후 focused V8 coverage를 비교했다. 기존 실행 counter 중 사라진 counter는 0개이며 statement/function/branch 실행 수가 정확히 같다. 이 측정은 아래 파일의 정리 전후 비교이며 전체 저장소 coverage 수치를 주장하지 않는다.

| 생산 파일 | 실행 statement 전/후 | 실행 function 전/후 | 실행 branch 전/후 |
|---|---:|---:|---:|
| components/NavigationGuard.tsx | 89/124 → 89/124 | 8/13 → 8/13 | 29/39 → 29/39 |
| components/QueryErrorAlert.tsx | 31/31 → 31/31 | 2/2 → 2/2 | 7/7 → 7/7 |
| lib/api/problem.ts | 24/24 → 24/24 | 1/1 → 1/1 | 12/12 → 12/12 |
| lib/format/date.ts | 53/55 → 53/55 | 5/5 → 5/5 | 17/18 → 17/18 |

- 정리 전 비교 집합: 6 suites / 41 cases PASS, 6.582초.
- 정리 후 동일 행동 집합: 5 suites / 20 cases PASS, 7.266초.
- 추가 변경 행동: PagedTable/filter draft/Kakao/auth/batch의 5 suites / 14 cases PASS. 이후 PagedTable 추가 통합 최종 2 cases PASS.
- 새 Auth/cache/API 계약: 2 suites / 16 cases PASS. query API 교체 후 최종 session-cache 회귀 결과는 아래 추가 기록.
- scoped ESLint 변경 테스트 PASS. 전체 repository Jest/type/lint/build는 루트 실행 결과를 별도로 사용한다.
- 원본 근거: `/tmp/landy-admin-foundation-tests-{before,after}.{json,log}`, `/tmp/landy-admin-foundation-coverage-{before,after}/coverage-final.json`, `/tmp/landy-admin-foundation-behavior-regressions.log`, `/tmp/landy-admin-foundation-paged-final.log`, `/tmp/landy-admin-foundation-auth-boundaries.log`, `/tmp/landy-admin-foundation-session-final.log`.

최종 추가 확인: session-cache의 현재 `query()` 계약 교체 후 1 suite / 8 cases PASS(3.848초). 새 auth/session-cache 및 lib/api/client scoped ESLint도 PASS. 수행한 Jest/ESLint 프로세스는 모두 종료됐다.

후속 날짜 blur 회귀(새 공용 동기 확정 적용): 기존 admin-list-ux에 청구월 두 입력의 blur→즉시 조회→URL 월 1일/기존 조건 보존→해당 URL의 API 조건 검증을 추가했고, filter-draft-ux에 직접 날짜 입력→blur→즉시 적용의 단일 callback 전달을 추가했다. 별도 helper 구현 검사 파일은 만들지 않았다. 두 파일 16 cases PASS(3.109초), scoped ESLint PASS. 이 후속 변경으로 담당 현재 케이스는 126→128이며, 최초 정리 스냅샷과 별도 단계다.

후속 신규 파일: `lib/query/query-policy.test.ts`는 keep(현재 27→27케이스)로 판단했다. QueryClient의 실제 defaultOptions와 실제 Axios adapter를 통해 확정 HTTP 오류 8종의 무재시도, 취소, 일시 HTTP 오류 6종/네트워크 코드 3종의 1회 재시도, 계속 실패할 때 상한, Retry-After 초/HTTP-date 대기, 30초 초과 시 조기 요청 금지, 잘못된 Retry-After와 구현 오류를 검증한다. 각 상태/헤더 표현은 서로 다른 운영·파싱 경계이며 helper 함수를 그대로 재현하는 구현 미러나 단순 중복은 없어 삭제하지 않았다. 신규 suite 27케이스 PASS(1.089초), scoped ESLint PASS, 로그 warning/error 없음. 검증 로그 `/tmp/landy-admin-query-policy-review.log`. 생산 query-policy/get-query-client는 수정하지 않았다. 이 후속 신규 suite 추가는 최초 스냅샷과 별도 단계이며, 직전 담당 128케이스 기준 현재 담당은 155케이스다.

최종 동시 WIP 추가 검토 2파일:

| 파일 (src/__tests__/ 아래) | 결정 | 현재 전 → 후 케이스 | 근거 |
|---|---|---:|---|
| components/ClientLinkButton.test.tsx | change | 8 → 8 | 실제 href/query 보존과 router client 이동, modifier/new-tab/download의 native 소유권, capture NavigationGuard 승인/취소의 단일 확인을 유지. role/href/실제 router 이동과 중복인 AntD DOM tagName=A 단언만 제거. |
| features/auth/kakao-callback-ux.test.tsx | keep | 5 → 5 | StrictMode 단일 인가 코드 교환, 30초 abort·복구·늦은 세션 차단, unmount, params/error 변경 및 ABA identity 보호를 실제 fetch/세션/이동 결과로 검증. 별도 render smoke나 정적 소스 모양 검사는 없어 유지. |

이 두 파일은 전체 77 suites/498 cases PASS에 포함된 현재 WIP 기준으로 검토했다. 변경 파일 ClientLinkButton은 아래 좁은 회귀 결과를 추가한다. 생산 source 미편집, 이후 추가 변경 없이 freeze한다.

ClientLinkButton 최종 좁은 회귀: 1 suite / 8 cases PASS(1.92초), 로그 warning/error 없음. 테스트 실행 프로세스 종료 확인. 이후 담당 파일 편집 없음(freeze).


## 계약서와 임차인 데이터 흐름


범위: `/Users/castledoor/code/git/landy/admin/src/__tests__/features/{contract-ocr,tenants,properties,payments}`. 새 미추적 파일을 포함해 19개 전부 읽었다. 변경은 담당 테스트에 한정하며 생산 코드·공용 fixture·설정·기존 QA 결과는 수정하지 않았다.

기준 snapshot은 `/tmp/landy-admin-test-audit-data-before.json`, 최종 등록 수는 `/tmp/landy-admin-test-audit-data-after.json`이다. `test.each`의 배열 행을 펼친 Jest 사례 수 기준 **193 → 153, 40개 감소**이며 파일은 19 → 18개다. 순차 matrix로 합친 입력 조합은 삭제되지 않았으므로 등록된 test 개수 감소가 동일 비율의 기능 coverage 감소를 뜻하지 않는다.

| 파일(상기 features 기준) | 판단 | 사례 수 | 근거 및 보존 경계 |
| --- | --- | --- | --- |
| contract-ocr/api.test.ts | change | 15 → 8 | 단순 GET 응답 미러와 세 건물 payload의 투명 passthrough 중복 제거. 반려 enum 반복은 한 요청 경계 사례로 축소. 0-based 목록 변환, flat 등록 payload, notify true/false, OCR 202, draft/latest 204 및 오류 전파, storage 회수 경계 유지. 네 반려 사유의 실제 전송은 review의 단일 흐름에서 모두 검증. |
| contract-ocr/contract-document-actions.test.tsx | change | 5 → 3 | 별도 desktop 정적 사례는 mobile→desktop→mobile 전환 사례와 중복. 일반 children/AntD disabled/HTML form passthrough는 실제 OCR 등록·반려 UI에 중복되어 삭제. 모바일 가상키보드 이동·화면 전환·visualViewport 부재 동작은 유지. |
| contract-ocr/contract-document-completion-ux.test.tsx | keep | 3 → 3 | 다음 조회 중복 요청, 이전 화면 callback 무효화, 성공한 처리를 실패로 오해하지 않는 재조회 복구는 각각 독립적인 운영 위험. 작은 완료 컴포넌트에서 유지. |
| contract-ocr/contract-document-review.test.tsx | change | 64 → 54 | DOM 순서/부모/lastElementChild 단언 삭제. desktop 원본 표시는 source-panel 전환 사례로 보존. 원본 키보드 접근/확대 금지와 초안 보호·실패 이탈 보호·완료 후 경고 해제는 기존 실제 흐름에 합침. 네 반려 사유는 한 검수 화면에서 3회의 실패 복구 뒤 최종 성공하며 각 payload/default를 모두 검증. 등록/반려/권한/건물 초안/캐시/409/중복요청·응답 유실의 고유 시나리오는 유지. |
| contract-ocr/contract-document-source-panel.test.tsx | change | 6 → 4 | 화면 아래/위/숨겨진 액션바의 세 boundary를 하나의 열린 원본에서 순차 검증하여 동일 Card 렌더 감소. 실제 키보드 viewport 이동·액션바 크기 변경·공간 0·desktop 전환/측정 해제는 유지. 일반 스냅샷 대신 가려짐을 막는 사용자 기능 경계이므로 파일 유지. |
| contract-ocr/contract-storage-retries-button.test.tsx | change | 6 → 5 | 양수 attempted 표시는 중복 요청을 막는 기존 성공 흐름의 attempted=2 단언으로 통합. attempted=0이 전체 완료가 아니라는 고유 의미는 별도 유지. 범위 확인·취소·pending·부분 실패·Problem Detail·자동 재시도 금지 유지. |
| contract-ocr/hooks.test.tsx | keep | 11 → 11 | 다른 도메인 캐시 무효화·접수 캐시 즉시 반영·대기/진행 polling 중지·전역 회수의 자동 재시도 금지는 제품 상태 정책이며 TanStack 자체 동작 검사와 구분. 가벼운 hook 테스트라 유지. |
| contract-ocr/navigation.test.ts | keep | 9 → 9 | 외부 URL 거부와 페이지 감소·다른 관리자 처리·불일치 큐/오류는 UI 한 성공 흐름으로 대체할 수 없는 보안/동시성 경계. 순수 함수·mock fetch로 저렴하게 유지. |
| tenants/billing-cycle.test.ts | keep | 2 → 2 | 월세/연세 표시와 legacy 누락 응답의 MONTHLY fallback은 현재 client/API 호환 정책. 순수 함수 2건은 싸며 서로 다른 branch를 검증. |
| tenants/billing-timing.test.ts | keep | 2 → 2 | 선불/후불 표시와 legacy 누락 응답 PREPAID fallback을 구분. 순수 함수 2건 유지. |
| tenants/tenant-due-alimtalk.test.tsx | change | 2 → 1 | 초기 별도 수신 표시와 토글 writer를 한 화면의 조회→변경 흐름에 통합. 임대인 push와 분리된 초기값 및 dueAlimtalkEnabled 단일 PATCH 의미 유지. |
| tenants/tenant-edit-drawer-ux.test.tsx | change | 4 → 3 | 같은 record의 background refetch 초안 보존을 계속 수정/폐기 흐름에 통합. 날짜 미확정 이탈 보호, pending lock/실패 후 초안 보존은 독립 위험이라 유지. 확인창 title 텍스트 복제 수 대신 접근성 dialog 이름을 확인. |
| tenants/tenant-edit-drawer.test.tsx | keep | 6 → 6 | 일반 저장과 overlap 승인·취소·재실패·다른 임차인/닫힌 화면의 stale callback은 서로 다른 mutation lifecycle. OCR 등록과 동일 helper를 쓰더라도 수정 adapter와 session 경계가 달라 그대로 유지. |
| tenants/tenant-info-form.test.tsx | change | 46 → 33 | optional rent 3개, 상가/기타 2개, 주차 번호 2개, invalid 날짜 5개, 기간 계산 6개를 같은 실제 Form의 순차 matrix로 합침. 모든 기존 입력/날짜 기대값·실제 제출 payload 유지. 납부일 min/max DOM 속성만 검사하던 사례는 0/32 저장 차단과 31일 허용 행동으로 교체. 정밀 금액/원단위·청구/계약 불변·차량번호 삭제·strict 날짜/Enter/blur·ARIA/ref·raw date/null/disabled/최신 store race를 유지. |
| properties/api.test.ts | change | 5 → 3 | 단순 URL과 mock body 반환만 확인하는 유저 하위 GET 및 일반 PATCH 반복 제거. 필터·page 전송, 명시 clearAddress, DELETE 204 계약 경계 유지. 건물 편집 실제 payload/검증/취소는 property-edit-modal에서 유지. |
| properties/property-edit-modal.test.tsx | keep | 3 → 3 | 주소 비우기 vs 명시 삭제, Unicode code point 255/256, 실패 후 초안·계속 수정·폐기·추가 쓰기 방지는 모두 제품 의미가 다름. ops의 users/modal-ux 중복 property 취소 사례 제거 근거로 공유. |
| properties/property-table.test.tsx | keep | 2 → 2 | 전체 목록과 사용자별 목록의 서로 다른 삭제 진입점에서 실제 제한 안내를 검증. 이전 구분 태그 제거 자체만 테스트하는 대신 확인창 행동이 있으므로 유지. |
| properties/property-tenants-modal.test.tsx | keep | 1 → 1 | 연세 금액과 납부 귀속 조건·시작일을 실제 건물별 임차인 표에 연결하는 단일 통합 검증. format helper 한 줄 미러와 달리 wiring을 확인하므로 유지. |
| payments/paymentSource.test.ts | delete | 1 → 0 | 운영 상수 객체/색상/옵션을 그대로 복사한 구현 미러. 색상 변경을 기능 오류로 만들며 실제 filter/table 행동은 검증하지 않으므로 파일 삭제. |

### coverage 보존 지도

- 등록/반려: OCR flat payload·건물 선택/수정/추가 배타성·소유 목록·등록 잠금·반려 네 사유/알림 기본값 및 양방향 override·사유 초기화·pending 중복 요청 차단을 실제 UI/API 경계에서 유지한다.
- 실패/응답 유실: 초안·선택·건물 재조회 복구, 저장 성공 후 조회 실패와 PATCH 실패 구분, OCR 접수 확인·queue 실패·partial storage 시도·자동 재시도 금지·409 overlap 승인 범위 유지.
- 초안/세션: form 입력, 미확정 날짜, 적용 전 건물 입력, query refetch, 완료 후 이탈 경고 해제, 임차인 교체/unmount 뒤 callback 무효화를 유지한다.
- 금액/청구/권한: 1원 정밀도·만원/원 표시 전환·server/OCR 적용·음수 거부·null/undefined/0·YEARLY PREPAID 및 시작일 불변·청구 조건 PATCH 제외·차량번호 삭제 의미 유지.
- 날짜: Enter/blur 8자리 지원, 잘못된 5종 날짜 양쪽 필드, 부분 입력, 윤일, 6개 기간 경계 기대값, 필수 clear, end<start, 실제 Picker ref/ARIA, disabled/null 및 store-watch race 유지. public Form.setFieldsValue로 matrix 초기값만 바꾸며 AntD/DatePicker/mock dirty를 대체하지 않았다.
- 원본/액션: 원본 열기·새로고침·Escape focus 복귀·입력 보존·keyboard focus·click 확대 금지, 가상키보드 위치 변경/viewport 부재 및 원본 가려짐 boundary 유지.

coverage %를 측정하지 않았으므로 전체 line/branch coverage 수치가 같다고 주장하지 않는다. 위 지도와 실제 핵심 payload/오류/세션 단언을 보존했으며, matrix의 원래 데이터 행 수를 명시했다.

### 검증

- 담당 디렉터리 ESLint PASS: `/tmp/landy-admin-test-audit-data-lint.log`.
- 담당 테스트 `git diff --check` PASS.
- 변경한 9개 파일 scoped Jest **9 suites / 114 tests PASS**, 192.763초: `/tmp/landy-admin-test-audit-data-regression.log`. warning/error 출력 없음. 전체 Jest·생산 빌드·native typecheck는 루트가 다른 담당 변경과 합친 최종 snapshot에서 수행한다.
- 날짜 브라우저의 표준/8자리 Enter·blur, 기간 칩, 시작일 clear·즉시 칩, 필수·오류 ARIA 회귀 7개는 루트의 strict-blur 보완 후 7/7 PASS·콘솔 0으로 확인됐다: `/tmp/landy-admin-dependency-dates-after-blur.log`. 기존 실패 증거(`/tmp/landy-admin-dependency-dates-qa/results.json`)는 보존했다. 이후 같은 날짜의 중복 callback 방지 보완까지 포함한 최종 build의 브라우저·전체 Jest 확인은 루트가 수행한다.

### 생산 코드 제안

추가 생산 코드 변경은 하지 않았다. 기간/금액 변환처럼 이미 public helper가 있는 순수 경계는 계속 저렴하게 검사할 수 있다. private `getContractEndDate`를 테스트만을 위해 export하지 않았고, 6개 경계값은 실제 기간 칩·저장 흐름 한 개에서 보존했다.


## 운영 도구와 사용자 관리


범위: alimtalk, batch, fcm, notifications, releasePolicies, users 및 query-invalidation-performance. 현재 WIP와 새 파일을 포함한 35개 파일을 실제 소스/요청 계약과 대조했다. source/config/공용 helper는 수정하지 않았다.

- 전: 35개 파일, 175개 case
- 후: 30개 파일, 154개 case
- 정리: 21개 case, 5개 파일 삭제(중요 사례는 대부분 주 파일에 통합)
- case는 test.each의 실제 배열 행을 펼쳐 TypeScript AST로 계수했다. baseline: /tmp/landy-admin-test-audit-operations-baseline.json; after: /tmp/landy-admin-test-audit-operations-inventory.json.

### 판단 기준

사용자의 입력과 실제 요청/응답, 발송 대상·과금·권한·기기/편집 세션 격리·재시도·캐시·오류 복구에 영향을 주는 검증을 남긴다. 같은 컴포넌트의 단순 렌더를 반복하거나 정적 상수를 복사하는 사례, 삭제된 기능의 부재를 상태마다 반복하는 사례, AntD 내부 CSS 클래스만 보는 사례는 삭제/통합한다. API mock-call 검증은 경로·메서드·대상 ID·본문·페이지 변환·빈 응답/누락 통계처럼 실제 외부 계약을 보호할 때 유지한다.

### 파일별 결정

| 파일 (src/__tests__/features/ 아래) | 결정 | case 전→후 | 근거/보존한 계약 |
| --- | --- | ---: | --- |
| alimtalk/alimtalk-draft-ux.test.tsx | change | 4→3 | 깨끗한 서버 재조회 사례는 recovery 파일의 동일 흐름으로 통합. 편집 중 자동 재조회·초안 제출, 승인 조회 중 발송 차단, 과금 발송 잠금은 유지. |
| alimtalk/alimtalk-history-table.test.tsx | keep | 6→6 | READY/PENDING만 수동 종결, READY→FAILED 제한, PENDING 세 결과·messageId 요청, 409 충돌 후 재조회와 중복 종결 방지를 실제 Query 훅과 UI로 검증. |
| alimtalk/alimtalk-template-card.test.tsx | keep | 4→4 | 승인 템플릿의 명시적 조회, 승인 본문 불일치/가져오기, 채널·템플릿·본문·enabled 저장 계약, 발송 불가 이유를 검증. |
| alimtalk/alimtalk-template-recovery-ux.test.tsx | keep | 6→6 | 초안/원상 복구/저장 확정값의 이탈 보호, 승인 본문 가져오기의 dirty 처리, 일반 오류·캐시 오류·중복 조회 차단 및 복구를 각각 보존. |
| alimtalk/alimtalk-test-send-modal.test.tsx | change | 4→3 | 변수칸 존재만 검사하던 사례를 실제 수신 번호·승인 변수 요청 계약에 합침. 가짜 Modal을 제거하고 실제 App/Modal·Form 검증 사용. 010 제한과 종류 변경 시 변수 초기화 유지. |
| alimtalk/api.test.ts | keep | 7→7 | 이력 필터·생략된 필터·템플릿 GET/PATCH·원격 승인 조회·유료 테스트 발송·수동 종결의 경로/메서드/본문/응답 경계를 보존. |
| batch/api.test.ts | change | 8→5 | 동일 GET의 부분 필터 사례는 전체 필터 사례로 통합. 단순 key 문자열 보간을 세 enum으로 반복하던 PATCH는 대표 키 하나로 유지. 실제 경로·크론·enabled·빈 필터·응답 계약은 보존. |
| batch/batch-execution-table.test.tsx | change | 13→9 | AntD 필터 active CSS 클래스와 이미 제거된 retry UI의 상태별 부재 반복 삭제. 상세 조회·지연 경고·chunk/tasklet 지표·밀리초 정밀도·종료 코드/날짜 범위 적용·초기화 유지. |
| batch/batch-schedule-integer-ux.test.tsx | keep | 6→6 | 각 모드의 서로 다른 6개 필드에 소수가 남아도 서버 저장을 차단하는 실제 폼 검증. 입력값 유지와 요청 부재를 검증하므로 InputNumber 라이브러리 자체 테스트가 아님. |
| batch/batch-schedule-pending.test.tsx | keep | 4→4 | 실제 mutation→재조회 동안 잠금, 응답 유실/조회 실패, 전역 retry 설정에도 PATCH 중복 금지, 최신 enabled 유지의 통합 계약. |
| batch/batch-schedule-table.test.tsx | change | 20→16 | 확인 표시+취소, 정확한 비활성 PATCH+성공 종료, 초기 크론 바인딩+수정 제출을 각각 한 흐름으로 통합. 로딩 CSS 클래스만 검사하던 사례 삭제. 활성/비활성·실패·모드/범위/직접식 검증은 보존. |
| batch/batch-schedule-unsaved-ux.test.tsx | keep | 8→8 | 취소/Escape/mask 진입점, 중복 확인, clean/revert/discard/reopen/save/navigation, 다른 스케줄의 늦은 callback 차단은 각각 실제 초안 손실/잘못된 닫기의 회귀. |
| batch/cron.test.ts | keep | 9→9 | 직접 구현한 세 형태의 크론 해석·생성·왕복·범위 오류·비지원식 보존·반복 종료시각 설명. 라이브러리 기능 복제가 아닌 스케줄 시간 변경 계약. |
| batch/duration.test.ts | keep | 2→2 | null/NaN/음수와 ms→초→분→시간의 사용자 표시 계약. 상세 UI의 일부 예시만으로 대체되지 않는 경계를 저비용 순수 함수로 검증. |
| fcm/api.test.ts | keep | 1→1 | 등록 토큰 ID는 URL 경로로, 제목/본문은 요청 본문으로 분리하는 실제 발송 대상 계약. |
| fcm/custom-notification-send.test.tsx | delete | 2→0 | 가짜 Modal 기반 토큰 발송 사례는 실제 users/modal-ux의 토큰 ID+본문 요청에 흡수. 카드 문자열 대역 기반 페이지 부재 검사는 실제 FcmPage를 operations-ux에서 렌더해 보존. |
| fcm/operations-ux.test.tsx | change | 3→4 | 실제 FCM 페이지 경계로 노출·일반 토픽 알림 부재 검증을 이동. 구독 토픽/줄 단위 토큰의 공백 정규화 요청을 추가해 기존 빈 값/반대 작업 잠금 검증을 강화. Silent Push 중복 key·삭제 접근성과 등록 토큰 제출 보존. |
| notifications/api.test.ts | keep | 7→7 | outboxes 응답 이름/필터, requeue의 빈 응답, dispatch processed/sent 구분, 불완전·음수 통계에서도 재전송하지 않는 부작용 계약. |
| notifications/notification-table.test.tsx | keep | 6→6 | 올바른 알림 상세·본문/발송일이 없는 실제 백엔드 응답 호환, 지원된 알림 타입 필터 3개와 대상 userId 전달. |
| notifications/outbox-table.test.tsx | keep | 3→3 | FAILED/SKIPPED만 requeue, requeue와 실제 발송의 구분, errorCode 공백 제거/정확 일치 필터. |
| notifications/send-notification-modal.test.tsx | change | 5→6 | 발송 요청 사례를 성공 결과 흐름에 합침. 별도 pending/result 파일의 중요한 사례를 흡수. 실제 App/Modal에서 대상 없음·선점·부분 선점·전부 실패·요청 payload·입력/취소/Escape 잠금을 보존. |
| notifications/send-notification-pending-ux.test.tsx | delete | 1→0 | 동일 컴포넌트의 처리 잠금 사례를 send-notification-modal로 이동; 제목/본문 잠금과 취소/Escape의 실제 onClose 부재도 검사. |
| notifications/send-notification-result-ux.test.tsx | delete | 1→0 | 모든 발송 실패의 안내/통계/성공 안내 부재를 주 모달 파일로 이동. AntD notification CSS 클래스 부착 여부만 검사하던 구현 단언 제거. |
| releasePolicies/api.test.ts | keep | 2→2 | 정책 ID 대상 PATCH·전체 정책 본문·업데이트 응답, 목록의 API 경로 계약. |
| releasePolicies/release-policy-edit-modal.test.tsx | change | 9→10 | 정책 플랫폼/채널 불변·초기값/정수/지원 빌드 관계/URL/필수 문구/오류/성공 동작 유지. 별도 pending 파일의 잠금 테스트를 실제 같은 모달 fixture로 통합. |
| releasePolicies/release-policy-list.test.tsx | change | 2→1 | 제목/수정 버튼 개수만 검사하던 정적 렌더 사례 삭제. 두 정책 중 선택한 ANDROID/PREVIEW의 정확한 값으로 편집하는 행동 보존. |
| releasePolicies/release-policy-pending-ux.test.tsx | delete | 1→0 | 처리 잠금 사례를 release-policy-edit-modal로 이동. 실제 입력/취소/중복 저장/Escape와 mutation·onClose 부재 검사 유지. |
| releasePolicies/release-policy-unsaved-ux.test.tsx | keep | 8→8 | 릴리즈 문구 초안의 모든 닫기 진입점/원상 복구/이탈/저장/재개/다른 정책 callback 격리. 배치와 별도 구현이므로 해당 폼 바인딩을 독립 검증. |
| users/api.test.ts | keep | 2→2 | 두 하위 목록의 사용자 ID URL·1-based 요청/0-based 응답·크기 계약. |
| users/modal-ux.test.tsx | change | 4→3 | property 편집 취소의 중복 사례는 properties/property-edit-modal로 통합(data_workflows와 유지 확인). 실제 FCM 모달에 선택 토큰 ID/제목/본문 단언을 흡수하고 검증 실패·진행 잠금·stale callback·토큰 발급 사용자 격리 유지. |
| users/oauth-provider-ux.test.tsx | keep | 3→3 | APPLE URL 필터/API 인자/목록 표시, 실제 필터 조회 URL, 상세의 잘못된 GOOGLE 표기 방지. 상수 값 자체를 복사한 테스트와 구별되는 회귀. |
| users/user-alimtalk-switch.test.tsx | change | 3→2 | 상태 문자열 렌더만 하던 두 사례를 실제 양방향 변경의 상태/정확한 boolean 요청/성공 안내에 합침. 순서 의존 switch 선택 대신 접근성 이름 사용. 최종 root의 실제 App 컨텍스트 fixture 개선을 보존. |
| users/user-list-pagination.test.tsx | keep | 5→5 | 1/0-based UI 페이지 변환, 20건 이후 FCM/임차인 접근, 오류 복구, 마지막 항목 삭제와 총수 감소에 따른 유효 페이지 보정. |
| users/userStatus.test.ts | delete | 3→0 | 정적 Record/OPTIONS의 세 라벨을 그대로 복사한 구현 미러. 새 행동·네트워크·입력/출력 변환이 없으며 상태 key 완전성은 TypeScript Record<UserStatus,...>가 검사. 정적 문구 스냅샷은 의도적으로 제거. |
| query-invalidation-performance.test.tsx | keep | 3→3 | 실제 QueryClient/QueryObserver에 기능 mutation을 연결해 활성 조회 횟수·비활성 무효화·무관한 캐시 보존을 검증. wall-clock benchmark나 TanStack 자체 기능 테스트가 아닌 권한/임차인/삭제/승인 템플릿의 캐시 정책 계약. |

### 동작 coverage 보존

| 중요한 행동 | 최종 검증 위치 |
| --- | --- |
| 등록 토큰 ID로 발송하고 다른 토큰/사용자에 늦은 결과 전달 금지 | fcm/api, fcm/operations-ux, users/modal-ux |
| 유료 알림톡 수신 번호·승인 변수·종류 교체·조회/발송 잠금 | alimtalk/api, alimtalk-test-send-modal, alimtalk-draft-ux |
| READY/PENDING 종결 제한·수동 공급자 결과·409 재조회 | alimtalk-history-table |
| custom 알림 대상/본문 및 성공·없음·선점·전부 실패 구분 | notifications/api, send-notification-modal |
| outbox 상태 제한·중복 발송 방지·빈 응답 호환 | outbox-table, notifications/api |
| 위험한 스케줄 활성 변경의 확인·취소·정확한 key/cron/enabled·실패 | batch-schedule-table, batch/api |
| 배치 PATCH 응답 유실·재조회 완료 전 잠금·자동 retry 금지 | batch-schedule-pending |
| 스케줄 모드/정수/시각 범위/직접식·비지원 식 보존 | batch-schedule-table, batch-schedule-integer-ux, cron |
| 초안의 취소/Escape/mask·revert/discard/reopen·navigation·stale callback | batch-schedule-unsaved-ux, release-policy-unsaved-ux, alimtalk-template-recovery-ux |
| 릴리즈 대상·빌드 관계/정수·URL·필수 문구·오류·처리 잠금 | releasePolicies/api, release-policy-list, release-policy-edit-modal |
| 계정 알림톡 마스터 토글의 실제 양방향 요청/안내 | user-alimtalk-switch |
| 1-based 요청/0-based 응답과 마지막 페이지 복구 | users/api, user-list-pagination |
| APPLE 필터·표시의 기존 GOOGLE 오분류 방지 | oauth-provider-ux |
| 권한/임차인/삭제 후 활성·비활성·관련/무관한 캐시 및 중복 조회 | query-invalidation-performance |
| 건물 변경 초안 취소/계속 수정/폐기 후 추가 요청 없음 | properties/property-edit-modal (다른 담당자와 보존 확인) |

숫자 coverage(--coverage)의 전후 계측을 실행한 것은 아니다. 위 표는 제거/통합된 assertion이 보호하던 실제 행동과 최종 남긴 위치를 기록한 것이다. 정적 상태 라벨 복사, AntD active/loading/warning CSS 부착, 이미 삭제된 batch retry UI의 반복 부재 assertion은 의도적으로 coverage 대상에서 제외했다.

### 검증

- 최초 변경 범위 12 suite: 11 suite/63 case 통과, user-alimtalk 1 case는 잘못 가정한 mock.onSettled 오류로 실패. 실제 컴포넌트 onSuccess/onError 계약에 맞춘 현재 root fixture를 보존했다.
- /tmp/landy-admin-test-audit-operations-jest.log 및 .json
- 수정된 user-alimtalk 1 suite/2 case 최종 통과(3.212초): /tmp/landy-admin-test-audit-user-alimtalk-jest.log 및 .json. 최종 변경 범위에 해당하는 12개 고유 suite/65개 case는 두 실행을 합쳐 모두 통과했다(다른 11 suite/63 case는 변경 없음).
- 범위 ESLint 통과: /tmp/landy-admin-test-audit-operations-eslint.log
- 범위 git diff --check 통과.
- 저장 후 root가 최종 전체 Jest/타입 검사를 실행한다. 추가 설치/전체 테스트/프로덕션 source 수정은 수행하지 않았다.

### 최종 전체 실행 후 릴리즈 검증 fixture 보완

전체 실행에서 minSupportedBuildNumber=99 > latestBuildNumber=42 오류 문구를 찾지 못한 사례는 기존 코드의 단독 재현에서 통과했다(474ms). 제품 검증 오류는 재현하지 못했으므로 source/validator는 변경하지 않았다. openModal은 이름이 지정된 실제 dialog와 현재 정책의 버전/두 빌드 값이 표시되는 편집 준비를 기다린다. jsdom의 CSS motion만 공개 ConfigProvider token으로 끄고, 해당 사례는 숫자 필드 focus/change/blur 뒤 99와 최신42가 유지되는지 확인한 다음 저장한다. 오류 문구와 mutation 부재 단언은 유지했다.

보완 후 해당 파일 1 suite/10 case 전부 통과(5.794초): /tmp/landy-admin-release-validation-after.log 및 .json. 범위 ESLint(/tmp/landy-admin-release-validation-eslint.log), git diff --check 통과. case 수 154는 동일하며 최종 전체 검증은 root 재실행으로 확인한다.

### 후속 WIP 전수 확인: query-freshness.test.tsx

- 파일: src/__tests__/features/query-freshness.test.tsx
- 결정: **keep**, 1→1 case, 변경 없음.
- 근거: 실제 QueryClientProvider와 10개 기능 query hook을 연결하고 browser visibilitychange 이벤트를 발생시켜 API boundary mock 호출 횟수를 관찰한다. 최초 조회는 모두 한 번, hidden 전환에서는 운영 API 재호출 없음, visible 복귀에서는 notifications/outbox/alimtalk history/batch executions/OCR pending 목록만 재조회하며 일반·편집·원본 API는 추가 호출하지 않는다. 같은 client로 재마운트하면 운영 목록은 다시 조회하고 users/batch schedules/templates/편집 draft의 fresh 캐시는 유지한다. 이는 staleTime/refetchOnWindowFocus 리터럴 복사가 아니라, 기능별 정책이 실제 API 요청에 미치는 통합 계약이므로 라이브러리 자체 검증으로 삭제하지 않는다.
- cleanup: 두 hook mount를 unmount하고 client.clear, visibility getter 복원, 전역 focusManager 기본 상태 복원을 finally에서 수행한다.
- 검증 범위: 짧은 fresh 구간의 탭 복귀/재마운트 동작이다. 원본 file URL 재마운트 재발급이나 TTL 만료 이후 일반 query 재조회는 이 case의 최종 assertion 대상에 포함하지 않으며, 그 동작까지 증명했다고 기록하지 않는다. query-policy 27 case의 retry/header 함수 검증과도 대상이 다르다.
- 최신 root 전체 검증 77 suite/498 case PASS에 포함된 새 WIP이며 이번 읽기 전용 감사에서 테스트/source/config를 수정하지 않았고 재실행하지 않았다.
- 최초 범위 35→30 files/175→154 cases 수치는 해당 감사 당시 baseline을 유지한다. 이 후속 파일을 더한 운영/사용자/교차 query 감사 포함 범위는 36개 원본 파일 중 31개 유지, 최종155 cases다(별도로 추가된 app RangePicker 회귀 2 case는 이 35파일 원범위 밖).


## 전체 검증

- `npm test -- --maxWorkers=3`: 78 suites·502 tests 모두 통과, 85.809초. `/tmp/landy-admin-completion-tests.json`
- `npm run type-check`, `npm run lint`, `npm run build`: 통과.
- 배포 생략은 실제 임시 Git 저장소의 9개 경계를 검증했다.
- 최신 AntD의 입력 확정 지연으로 발견한 날짜·청구월·날짜 범위 조회 회귀는 기존 사용자 흐름 테스트에 추가했다.
- 실제 backend 변경이나 알림 발송을 수행하지 않는 fixture 브라우저 검증 결과는 의존성 업데이트 기록에 정리했다.

### 최종 추가 사례 확인

마지막 전체 실행에서 추가된 `DeferredContentBoundary`의 lazy tab 실패 사례를 확인해 유지했다. 실제 React.lazy 거절이 발생해도 페이지·작성 중 메모·다른 탭을 보존하고 복구 행동을 제공하는 실패 경계다. 건물 지연 모달의 로딩 실패 취소·명시 재로딩과 계약서 원본 이미지 URL 재발급(동일/새 URL)의 초안 보존도 각각 다른 실패·복구 경계로 유지했다. OAuth callback에서 code/state가 바뀌었을 때 이전 교환·타임아웃을 무시하는 사례도 새 인증 세션의 격리를 보호한다. 기존 구현 모양 단언의 삭제와 달리 이들 사례는 실제 사용자 상태를 보호한다.

현재 전체 실행: **78 suites·502 tests 모두 PASS**, 85.809초. `/tmp/landy-admin-completion-tests.json`. 메뉴의 비동기 초기화를 테스트 helper에서 기다리도록 보완해 해당 파일의 act 경고도 제거했다.

후속 메뉴 초기화 검증: `renderLayout` 공용 helper가 실제 비동기 메뉴 초기화를 `act` 안에서 기다린다. 원래 행동·단언을 유지한 6개 사례가 통과했고, 경고·오류는 0건이다. `/tmp/landy-admin-layout-act-quality-final.log`.

## 이번 세션 커밋만의 최종 검증

다른 세션의 코드와 신규 테스트를 제외한 독립 소스 트리에서 **67 suites·413 tests, 실패·skip 0**을 확인했다. 61 suites·309 tests와 데이터 화면 6 suites·104 tests를 서로 겹치지 않는 두 실행으로 검증했다. 마지막 사례 완료 시각은 `2026-10-05T00:41:13.652000+09:00`이다.

- native TypeScript 검사·ESLint·Turbopack 프로덕션 빌드 통과.
- 커밋 여섯 단계의 중간 소스 트리도 각각 타입 검사를 통과했다.
- 최신 AntD 확인창 애니메이션은 테스트 host의 `ConfigProvider`에서만 제어했다. 폼 값·요청·잠금·실패 복구 단언을 유지하고, 동적 필드 렌더 및 dirty 알림의 실제 완료를 기다린다. 생산 코드와 전역 테스트 timeout은 변경하지 않았다.
- 다른 세션의 대체 테스트에 의존하던 인증 테스트 삭제와 깨끗한 알림톡 폼의 재조회 사례 삭제는 커밋하지 않았다.
- 로컬 근거: `/tmp/landy-admin-session-commits-20261005/validation.json`, `remaining-tests.json`, `data-final-tests.json`, `build-final.log`, `typecheck-final.log`, `lint-final.log`.
