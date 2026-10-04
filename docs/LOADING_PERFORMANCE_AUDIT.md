# 페이지 로딩 성능과 남은 UX 선택

기준일: 2026-10-04 (Asia/Seoul). `/users`부터 `/batch/schedules`까지 어드민 16개 화면, 로그인·callback, 공통 탐색·필터·표·편집·발송 흐름을 조사했다. 즉시 반영한 화면별 UX는 [UI/UX 조사](UI_UX_AUDIT.md)에 기록했다.

## 측정 조건과 적용 결과

설치된 Next 16.3.8 / React 19.3.0 / Ant Design 6.6.5 / TanStack Query 5.104.1의 package·lockfile·로컬 문서·타입·구현을 확인했다. `npm run build`로 만든 프로덕션을 localhost에서 실행하고, Landy API는 별도 합성 fixture로 대체했다. 고객 정보·실제 발송·카카오 로그인 성공·운영 서버의 응답 성능을 시험하지 않았다.

- 사용하지 않는 Geist Mono preload 제거: 폰트 요청 **2→1개**, encoded body **52,396→29,288바이트**. 첫 방문의 불필요한 요청 1개와 23,108바이트를 줄였다. 동일 폰트를 캐시한 재방문마다 이만큼 전송이 줄어든다는 뜻은 아니다.
- 권한·임차인·알림톡 변경의 겹치는 캐시 무효화 제거: 실제 QueryObserver 검사에서 상세 또는 승인 템플릿 갱신 **2→1회**, 기존 최신성·갱신 범위 유지.
- 사용자 삭제 후 계정 소유 데이터의 관련 목록 캐시 갱신, 로그인·로그아웃의 조회·mutation 캐시 정리, 이탈한 세션의 늦은 401 갱신 결과 취소를 적용했다.
- 경로 전환의 `loading.tsx`는 화면 코드를 기다리는 동안 응답을 알린다. 서버/API 응답 시간을 단축한 구현과 구분한다.

표의 JS는 실제 리소스의 `encodedBodySize` 합계이며 브라우저 캐시로 인한 `transferSize=0`과 구분했다. 각 경로 1회·공유 캐시·1440px 조건이다. FCP/LCP는 이 로컬 합성 데이터 조건의 관측값으로, 실사용자의 75백분위 Core Web Vitals나 개선율이 아니다. INP·실제 대량 목록·저속 기기·느린 네트워크·실서비스 p95 API는 이 측정에서 확인하지 않았다.

| 화면 | 초기 JS encoded KiB | 로컬 FCP ms | 로컬 LCP ms |
| --- | ---: | ---: | ---: |
| `/users` | 456.3 | 100 | 140 |
| `/users/1` | 522.2 | 460 | 804 |
| `/properties` | 516.8 | 104 | 104 |
| `/tenants` | 498.2 | 64 | 100 |
| `/tenants/9` | 457.8 | 76 | 392 |
| `/contract-ocr` | 448.2 | 92 | 92 |
| `/contract-ocr/document-1` | 475.8 | 84 | 160 |
| `/payments` | 496.8 | 64 | 104 |
| `/payments/duplicates` | 444.2 | 144 | 156 |
| `/notifications` | 492.4 | 96 | 96 |
| `/notifications/outbox` | 492.4 | 116 | 116 |
| `/fcm` | 381.9 | 92 | 136 |
| `/alimtalk` | 514.3 | 100 | 160 |
| `/release-policies` | 386.7 | 60 | 96 |
| `/batch` | 524.8 | 92 | 140 |
| `/batch/schedules` | 524.8 | 72 | 72 |

초기 JS는 대략 382~525 KiB다. 로컬 시간만 보고 충분히 빠르다고 결론짓기보다, 아래 코드 분리 후보를 제한적으로 실험하고 실제 운영 환경의 데이터로 판단하는 편을 권장한다. 지금의 전후 비교는 여러 정확성 개선을 포함하며 JS 전체의 감소를 주장하지 않는다.

## 판단이 필요한 항목

| 우선순위 | 현재 문제와 선택 | 권장 방향·결정에 필요한 근거 |
| --- | --- | --- |
| P1 | 닫힌 편집·발송·상세 모달까지 초기 client bundle에 포함 | 건물·사용자 상세의 큰 모달부터 첫 사용 시 `next/dynamic` 로딩을 비교. 초기 JS 절감과 첫 클릭 대기·포커스·닫기 애니메이션·초안 보호를 함께 측정한 뒤 확대 |
| P1 | 일반 조회의 전역 기본값이 60초 fresh, 포커스 복귀 재조회 없음 | 배치·Outbox·발송 결과처럼 빠르게 변하는 운영 목록과 일반 계정/건물을 구분해 최신성 기준을 정함. 편집 초안 보호를 유지하며 필요한 목록만 짧은 staleTime/복귀 재조회/polling 선택 |
| P1 | 페이지·필터 변경 때 표가 비며 높이가 줄어듦 | 우선 높이를 유지하는 skeleton 검토. 이전 행 유지는 같은 조건의 페이지 이동에 한정하고 이전 행의 편집·삭제와 새 페이지/조건 표시가 혼동되지 않게 해야 함 |
| P1 | Query의 AbortSignal이 Axios GET에 전달되지 않음 | 미사용 요청을 중단할지, 완료 결과를 캐시에 남겨 재방문을 빠르게 할지 결정. 취소 오류의 표시·로그·401 대기열 수명까지 함께 검증. QueryClient.clear가 캐시를 취소하는 것과 실제 HTTP 중단은 구분 |
| P2 | 메뉴가 `router.push`만 사용해 처음 보는 경로의 사전 로딩 없음 | hover/focus에서 의도가 드러난 목적지만 사전 로딩하는 방식 검토. 메뉴 13개 전체의 자동 prefetch는 다운로드량·기기 비용을 측정한 뒤 결정 |
| P2 | 납부↔중복 납부 헤더의 `Button href` 2개는 전체 문서를 재생성 | Next Link의 시각 스타일 조정 또는 modifier/새 탭/guard를 보존하는 공통 어댑터 선택. 설치 AntD Button에는 요소 치환 public API가 없고 Next `legacyBehavior`는 deprecated라 중첩 a/button 우회는 사용하지 않음 |
| P2 | 400/404/일반 403 조회도 전역 retry=1로 재시도 | 결정적인 오류와 네트워크·408·429·일시적 5xx를 구분할 정책 확정. Retry-After·사용자 재조회와 함께 처리 |
| P2 | 사용자 상세가 끝난 뒤 기본 건물 탭 조회 시작 | 실제 지연이 큰지 측정 후 병렬 조회/사전 조회 선택. 없는 사용자·잘못된 ID에도 불필요한 하위 조회를 보내는 비용을 함께 고려 |
| P2 | 여러 장 계약서 원본을 펼치면 모든 Image가 즉시 요청됨 | 첫 페이지 우선·후속 페이지 lazy 로딩 검토. DTO에 원본 비율/크기가 없어 공간 예약·레이아웃 흔들림·확대/preview 동작과 함께 검증 필요 |
| P2 | 사용자 소유 건물은 전체 응답·전체 렌더, pagination 없음 | 실제 계정별 건물 수를 확인하고 백엔드 페이지네이션 또는 가상 목록을 선택. 지금의 적은 fixture로 대량 성능을 판정하지 않음 |
| P2 | 카카오 callback의 fetch는 timeout 없이 로딩이 지속될 수 있음 | 적절한 인증 대기 시간과 재시도·재로그인 동선을 정함. 이미 소비된 인가 코드의 단순 재교환은 안전한 복구가 아님 |
| P2 | 로그아웃이 서버 revoke 완료/10초 timeout까지 현재 화면을 유지 | 요청 중 표시를 추가하거나 로컬 세션을 먼저 종료할지 결정. 이번에는 기존 철회 순서를 보존하고 완료 후 캐시·옛 갱신 결과만 정리 |
| P2 | 요청 중 편집·닫기는 운영 폼에서 잠겨 있음 | Mocket처럼 요청 snapshot과 새 초안 소유권을 분리해 입력/닫기 허용할 수 있으나, 과금 발송·배치·정책 변경의 확정 결과를 놓치지 않을 운영 UX가 필요 |
| P2 | 인앱 알림 목록 DTO에 본문·발송 시각 없음 | 실제 내용을 항상 보려면 백엔드 목록/상세 API 계약 확장 필요. 생성일을 발송일로 표시하거나 본문을 추측해서 채우지 않음 |
| P2 | 실제 느린 기기·운영 API·화면리더 발화 증거 부족 | 운영 Core Web Vitals/개인정보 없는 계측 도입 범위를 정하고 실제 기기·키보드·확대율·보조기기 검증. localhost 측정으로 운영 적합성 선언 불가 |

추천 순서는 운영 목록의 최신성 기준 결정 → 큰 모달의 코드 분리 한 곳 실험 → 페이지 전환 높이 유지 → 의도 기반 메뉴 prefetch다. SSR 인증 전환은 현재 localStorage 클라이언트 인증을 cookie/server 경계로 옮기는 별도 설계·보안·배포 작업이므로 속도 개선만을 이유로 자동 적용하지 않았다.

## 유지할 현재 구현과 제외한 변경

Next 16.3.8은 `antd`·`@ant-design/icons`를 이미 기본 import 최적화한다. 같은 설정을 추가하거나 private 경로로 전체 import를 바꾸는 변경은 하지 않았다. React Query devtools의 static import만으로 운영 번들 문제라고 단정하지 않았다.

서버 QueryClient는 요청별 객체, 브라우저는 singleton이다. 같은 query의 배경 재조회는 기존 정보를 유지한다. 계약서 document/files는 병렬 조회, OCR 분석은 진행 상태에서만 3초 polling, 원본 URL은 만료를 고려한 별도 캐시 정책이다. 공급자 승인 템플릿은 사용자가 열 때 조회한다.

Mocket의 `done/interface-guidelines-audit.md`, `done/input-priority-ui-audit.md`, `ui-regression-guidelines.md`, `interactions.md`, `navigation.md`, `done/reusable-ui-primitives.md`, `done/startup-dark-launch-cache.md`에서 상태·초안·선택·실행 구분, 요청 완료 소유권, 준비된 화면 전환, 실제 검증의 경계를 참고했다. native 44pt/48dp·스플래시 최소 1100ms·탭 모션을 웹 어드민의 의무로 옮기지 않았다.

## 공식 레퍼런스

- [Next lazy loading](https://nextjs.org/docs/app/guides/lazy-loading), [loading.js](https://nextjs.org/docs/app/api-reference/file-conventions/loading), [font preload](https://nextjs.org/docs/app/api-reference/components/font), [prefetch](https://nextjs.org/docs/app/guides/prefetching)
- [TanStack pagination](https://tanstack.com/query/latest/docs/framework/react/guides/paginated-queries), [Query cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation)
- [Web Vitals](https://web.dev/articles/vitals), [이미지 lazy loading](https://web.dev/articles/browser-level-image-lazy-loading), [CLS 공간 예약](https://web.dev/articles/optimize-cls)
- [WCAG 상태 메시지](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), [키보드](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html), [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [Ant Design 데이터 표시](https://ant.design/docs/spec/data-display/)

설치 버전의 로컬 문서·타입을 구현 계약으로 사용했다. 공식 사이트의 최신 설명은 판단 근거로 대조했다.

## 검증 산출물

- 최종 명령·테스트 수와 실제 화면 검증은 [UI/UX 조사](UI_UX_AUDIT.md)의 검증 절에 기록한다.
- 전후 상세 리소스/타이밍: `.gstack/benchmark-reports/baselines/baseline.json`, `.gstack/benchmark-reports/2026-10-04-benchmark.json`.
- 최종 브라우저 조건과 32개 화면 assertion: `.gstack/benchmark-reports/2026-10-04-browser-verification.json`.
- 이 파일들은 저장소의 기존 `.gstack/` ignore 정책에 따라 로컬 검증 산출물이다. 보고서와 최종 검증 결론은 `docs/`에 보존한다.


## 운영 세션 실측 후 판단·적용

2026-10-05의 [운영 Chrome 실측·최종 결정](PRODUCTION_UX_MEASUREMENTS.md)에 이전15개항목의 적용/유지 결정과 새로운 검증 결과를 기록했다. 위 판단 후보 표는 최초 조사 당시 기록이다.
