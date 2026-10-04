# 운영 Chrome 실측과 UX 결정·적용

측정: 2026-10-04 밤~2026-10-05 (Asia/Seoul). 사용자가 지정한 Chrome의 기존 `https://admin-prod.landy.co.kr` 로그인 세션을 Computer로 사용했다. 운영 화면에서는 조회·탐색만 실행했다. 운영 고객 데이터 변경, 발송, 권한 변경, 토큰 발급·복사, 로그아웃은 수행하지 않았다.

## 측정 조건

운영 배포는 이전 화면 구조이고 현재 로컬 작업 트리의 개선이 아직 배포되지 않았다. 운영 수치와 현재 로컬 개선 전후를 같은 배포의 전후처럼 비교하지 않는다.

- 운영: 메뉴 13개와 사용자·임차인·계약서 상세를 확인해 16개 화면을 측정. users는 5회 반복했다. 기본 데스크톱·캐시 비활성 조건이며 normal-cache 상세는 아래 표에 표시했다.
- 완료 계약서 조회에는 20개 문서가 있었다. 검수 대기 0건을 전체 문서가 없는 것으로 해석하지 않았다.
- 별도 320px·CPU4x 모의 조건에서 운영 사용자 상세 문서 폭 440px/viewport320px를 관측했다. 실제 모바일 기기·화면리더 검증이 아니다.
- Developer CDP의 Resource Timing·buffered PerformanceObserver를 읽었다. 고객 정보·인증 토큰·응답 본문·서명 URL을 수집하지 않았고, 개인 식별 경로는 `:id`/`:documentId`로 익명화했다.
- FCP/LCP·longtask는 자동화와 호스트 부하 영향을 포함한다. 테스트 중 host load 496/619/572도 관측됐다. 시간 개선율·실사용 75백분위·p95 API·INP를 선언하지 않는다.

## 운영 관측

대부분의 읽기 API는 약 30~147ms였고, JS encoded는 약 412~560KiB였다. 전송량뿐 아니라 실행·초기화 비용이 있으며, 작은 응답의 병렬화를 먼저 늘리기보다 초기 코드 분리와 조회 UX를 우선 적용했다. 사용자 상세 조회 52.5ms 뒤 기본 건물 조회 37.5ms가 시작되기까지의 추가 간격은 약37ms였다. 존재 확인의 이점을 버릴 만큼 큰 병목으로 판단하지 않았다.

| 화면 | JS encoded KiB | FCP ms | LCP ms | API duration ms | 조건 |
| --- | ---: | ---: | ---: | --- | --- |
| `/users` | 477.7 | 536 | 560 | 67 | cold |
| `/properties` | 550.0 | 452 | 468 | 111 | cold |
| `/tenants` | 526.9 | 648 | 660 | 56 | cold |
| `/contract-ocr` | 480.1 | 536 | 552 | 39 | cold |
| `/payments` | 481.1 | 700 | 696 | 61 | cold |
| `/payments/duplicates` | 472.1 | 604 | 616 | 33 | cold |
| `/notifications` | 501.6 | 684 | 696 | 39 | cold |
| `/notifications/outbox` | 492.1 | 812 | 840 | 57 | cold |
| `/fcm` | 412.0 | 828 | 852 | 없음 | cold |
| `/alimtalk` | 552.4 | 632 | 628 | 75 | cold |
| `/release-policies` | 416.4 | 776 | 788 | 52 | cold |
| `/batch/schedules` | 506.2 | 616 | 628 | 30 | cold |
| `/batch` | 521.1 | 752 | 764 | 68, 31 | cold |
| `/users/:id` | 560.0 | 880 | 892 | 52, 38 | cold |
| `/tenants/:id` | 495.6 | 464 | 444 | 45 | normal cache |
| `/contract-ocr/:documentId` | 515.2 | 364 | 364 | 130, 130 | normal cache; after detail data visible |

원본 이미지 1개는 naturalWidth/Height0이고 이미지 `ERR_BLOCKED_BY_ORB`도 관측됐다. 이 오류만으로 서명·보관 만료·삭제·권한의 원인을 단정하지 않는다. 이미지가 실패해도 분명한 복구 안내가 없는 UI 문제를 별도로 보완했다.

## 동일 로컬 조건의 적용 효과

기존 Chrome 세션과 같은 브라우저에서 별도 LOCAL 프로덕션 앱 두 개를 열었다. 모두 Next16.3.8·동일 합성 API·캐시 비활성·동일 라이브러리 버전이며 실제 운영 인증 정보는 복사하지 않았다. `.js` 리소스의 encodedBodySize 합계는 script와 preload link를 모두 포함한다.

| 화면 | 적용 전 bytes | 적용 후 bytes | 감소 |
| --- | ---: | ---: | ---: |
| 건물 목록 | 532,806 | 492,630 | 40,176 (7.5%) |
| 사용자 상세 초기 탭 | 538,405 | 474,961 | 63,444 (11.8%) |

최초 건물 수정 때 추가 JS chunk는 별도로 로드됐다. 한 관측의 새 chunk 전송은 약7ms, 자동화 대기까지 포함한 첫 dialog 관측 상한은 약812ms였다. 초안·초점·취소 복구를 확인했으며 이 숫자를 사용자의 실제 첫 클릭 지연이나 개선율로 일반화하지 않는다. 재현된 빈 첫 입력/늦은 초기화가 초안을 덮어쓰는 문제도 세션별 첫 렌더 초기값으로 수정했다.

## 이전 15개 항목의 최종 결정

| # | 항목 | 결정·반영 | 근거 |
| --- | --- | --- | --- |
| 1 | 모달·비활성 탭 초기 코드 | 적용 | 건물 모달2개와 사용자 임차인/FCM 탭을 첫 사용까지 분리. 첫 활성 이후 mount 유지, 실패 경계·취소·초점·초안 보존. 위 JS 감소 확인 |
| 2 | 운영 목록 최신성 | 적용 | 알림·Outbox·알림톡 이력·배치 실행·계약서 목록만 staleTime0/visibility복귀 재조회. 일반 조회60초·편집/draft/files 유지, polling 없음 |
| 3 | 표 높이/이전 행 | 적용 | 이전 행은 복사하지 않고 마지막 완료 높이를 loading중 유지. 미확정 건수/빈 결과 구분. 로컬 표1343px 유지·0행·busy=true 확인 |
| 4 | 전 GET AbortSignal | 유지 | 짧은 API 비용, 빠른 재방문 cache 이익, signal 소비 시 완료 결과 cache 취소를 고려해 일괄 적용하지 않음. 세션 종료의 결과 취소는 기존 적용 |
| 5 | 메뉴 사전 로딩 | 적용 | hover/focus한 경로만 prefetch. 최초13개 전부 요청하지 않음. 키보드 focus만으로 경로별 RSC 준비·현재URL 유지 확인 |
| 6 | 납부↔중복 내부 링크 | 적용 | 실제 AntD anchor·수정키/새 탭을 유지하고 일반 클릭만 SPA. 브라우저 performance.timeOrigin 동일 확인, capture guard 중복 확인 없음 |
| 7 | 조회 재시도 | 적용 | 결정적4xx·취소는 재시도 없음. 일시적 network/408/429/500/502/503/504는최대1회, Retry-After존중. 30초초과 지시에는 자동 재시도 없음 |
| 8 | 사용자 상세 waterfall | 유지 | 측정된 두 API와 간격이 작고 기본 탭만 필요. 존재하지 않는 사용자에 불필요한 하위 조회를 보내지 않는 gate 유지 |
| 9 | 다중 계약서 이미지 lazy/비율 | 유지 | 원본1개 실패로 다중 규모·치수 미측정. AntD Image가mount때별도img.src검증하므로loading=lazy만은효과없음. 임의 ratio·backend치수계약을 추가하지 않음 |
| 10 | 대량 건물 표시 | 적용 | 전체 응답·이름순을 보존하면서20/50/100 client페이지. 로컬 합성21건→20/1 표시 확인. 응답 크기를 줄였다고 주장하지 않음 |
| 11 | 카카오 무제한 대기 | 적용 | upstream10초·callback30초. 새 로그인 복구, 단일 코드 교환/StrictMode, 늦은 완료·params변경 ownership 보호, 무한Spinner복구. 실제 취소 복구 확인 |
| 12 | 로그아웃 진행 | 적용 | 서버 전체 세션 철회→로컬 종료 순서 유지. 같은Promise singleflight·loading/disabled·새 로그인 늦은 결과 방어. 가짜 세션에서pending→login 확인 |
| 13 | 발송/정책/배치 pending편집·닫기 | 유지 | 제출snapshot/초안revision/result owner의 전면 재설계 근거 부족. 현재잠금과 분명한 결과 확인 유지 |
| 14 | 알림 본문/발송 시각 DTO | 유지 | 현재backend목록계약 미제공, entity.sentAt은 생성 때 기록되어실제push성공시각과다름. 범위를넘는backend계약을 자동 변경하지 않음 |
| 15 | 운영 계측·느린 기기·접근성 | 실측 적용·범위 유지 | 운영 세션16화면과320/CPU4x 조건 측정. 상시 원격 telemetry추가·실기기/화면리더/전체WCAG 적합성 선언은 하지 않음 |

## 추가 결함과 실브라우저 확인

- 원본 이미지별 실패 Alert/원본 새로고침. 같은 URL의 재발급 성공에서도 오류가 해제되고 임차인 입력을 보존한다. 정상PNG와404를 전환한 합성 원본으로 확인했다.
- 건물 수정은 열림 애니메이션 완료의 setFieldsValue를 제거했다. 첫 render부터 값이 있으며, 빠른 입력 뒤 callback이 초안을 덮어쓰지 않는다. 다른 건물/같은 건물 재열림은 새 세션, 닫기 animation은 유지한다.
- 지연 모듈을 실제로 차단해 현재 페이지가 유지되고 실패 dialog를 취소할 수 있는 것을 확인했다. cache 해제 후 차단을 복구하고 재로딩해 정상 수정창을 확인했다.
- 키보드 취소/계속 수정/폐기와 원래 수정 버튼 focus 복귀 확인.
- 로컬320px 사용자 상세는 documentWidth320/viewport320였다. 좁은 화면의 설명 표 라벨이 한 글자씩 줄바꿈되던 문제를 sm 미만에서만 세로 배치로 바꿨고 데스크톱 배치는 유지했다. 반응형 회귀1개와 실제320px 화면을 추가 확인했다. 앞선 반응형 개선까지 포함한 결과이며 이번 코드 분리만의 효과라고 설명하지 않는다.

## 검증과 적용 범위

최종 type-check/native7·프로덕션 build·ESLint·git diff --check 통과. 주요 회귀9suites/63tests 통과, 이후 이미지·초기값 관련 집중 검증도 통과했다.

전수는79suites/505cases를 실행해76suites와497cases가 통과했다. 나머지8case는 named-case로 재검증했고 모두 확인했다. 주차·청구월·OCR5개는 수정 없이 통과했고, 원본조작1개는 동일 assertion과시간제한을 유지한채DOM조회scope만줄여16.817초에통과했다. **단일 전수 실행의 전체green이나 테스트 실행 안정성을 주장하지 않는다.** 동시 실행의 높은 호스트 부하와 시간초과를 남은 한계로 기록한다.

수정은 로컬 작업 트리에 반영했다. Git push·운영 배포를 수행하지 않았으므로 admin-prod는 현재 기존 배포다. 배포 후 같은 세션·조건으로 적용본의 운영 수치를 다시 확인할 수 있다.

근거: `.gstack/benchmark-reports/live-prod/{baseline,local-comparison,test-verification}.json`, `after-property-modal.png`, `after-320-user.png`. 공개 가능한 합성 화면만 screenshot으로 남겼다. 기존 [UI/UX 조사](UI_UX_AUDIT.md), [로딩 성능 조사](LOADING_PERFORMANCE_AUDIT.md), 해당문서의 공식레퍼런스와설치버전문서를 함께 대조했다.
