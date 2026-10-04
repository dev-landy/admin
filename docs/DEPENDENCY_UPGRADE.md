# 의존성 업데이트 및 호환성 대응

확인일: 2026-10-04. 직접 의존성 25개를 npm `latest` 안정판과 대조하고 설치 버전을 맞췄다. 기존 UI/UX 변경을 보존하면서 설치·타입 검사·린트·빌드·테스트 환경의 호환성 문제를 대응했다. 최종 전체 Jest·타입 검사·린트·프로덕션 빌드와 fixture 브라우저 검증을 통과했다.

## 직접 의존성

업데이트 전 열은 `/tmp/landy-admin-package-before-upgrade.json`의 선언 범위다. 최종 열은 현재 `package.json`·`package-lock.json`·설치 버전·npm registry를 대조한 값이다. 버전 메타데이터 `/tmp/landy-admin-dependency-versions-final.json`은 dayjs를 포함한 직접 의존성 25개를 기록한다.

| 구분 | 직접 선언 이름 | 업데이트 전 선언 | 최종 선언 | 잠금·설치 버전 |
| --- | --- | --- | --- | --- |
| 운영 | @ant-design/icons | ^6.2.5 | ^6.3.4 | 6.3.4 |
| 운영 | @ant-design/nextjs-registry | ^1.3.0 | ^1.3.0 | 1.3.0 |
| 운영 | @tanstack/react-query | ^5.101.1 | ^5.104.1 | 5.104.1 |
| 운영 | antd | ^6.4.5 | ^6.6.5 | 6.6.5 |
| 운영 | axios | ^1.18.1 | ^1.20.0 | 1.20.0 |
| 운영 | dayjs | 직접 선언 없음 | ^1.11.23 | 1.11.23 |
| 운영 | next | 16.2.9 | 16.3.8 | 16.3.8 |
| 운영 | react | 19.2.4 | 19.3.0 | 19.3.0 |
| 운영 | react-dom | 19.2.4 | 19.3.0 | 19.3.0 |
| 개발 | @tanstack/react-query-devtools | ^5.101.1 | ^5.104.1 | 5.104.1 |
| 개발 | @testing-library/jest-dom | ^6.9.1 | ^7.0.1 | 7.0.1 |
| 개발 | @testing-library/react | ^16.3.2 | ^16.3.3 | 16.3.3 |
| 개발 | @types/jest | ^30.0.0 | ^30.0.0 | 30.0.0 |
| 개발 | @types/node | ^20 | ^26.6.4 | 26.6.4 |
| 개발 | @types/react | ^19 | ^19.3.0 | 19.3.0 |
| 개발 | @types/react-dom | ^19 | ^19.3.0 | 19.3.0 |
| 개발 | eslint | ^9 | ^10.12.0 | 10.12.0 |
| 개발 | eslint-config-next | 16.2.9 | 16.3.8 | 16.3.8 |
| 개발 | jest | ^30.4.2 | ^30.5.2 | 30.5.2 |
| 개발 | @jest/environment-jsdom-abstract | 직접 선언 없음 | ^30.5.2 | 30.5.2 |
| 개발 | jsdom | 직접 선언 없음 | ^30.1.2 | 30.1.2 |
| 개발 | @types/jsdom | 직접 선언 없음 | ^30.0.0 | 30.0.0 |
| 개발 | typescript | ^5 | npm:@typescript/typescript6@^6.0.2 | @typescript/typescript6 6.0.2 |
| 개발 | @typescript/native | 직접 선언 없음 | npm:typescript@^7.0.2 | typescript 7.0.2 |
| 개발 | @eslint/compat | 직접 선언 없음 | ^2.1.1 | 2.1.1 |

`typescript` 두 선언은 Microsoft의 공식 병행 설치 방식이다. native CLI는 최신 TypeScript 7을 사용하고, ESLint 등 컴파일러 API가 필요한 도구는 공식 TypeScript 6 호환 패키지를 사용한다. [공식 병행 설치 안내](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)

사용하지 않는 `ts-jest ^29.4.11`은 제거했다. 현재 Jest 변환은 `next/jest`의 SWC가 담당한다. 소스에서 직접 가져오는 dayjs는 AntD의 전이 의존성에 기대지 않도록 운영 의존성으로 명시했다. 최종 소스의 외부 import 목록에서 미선언 패키지는 발견하지 못했다.

## 런타임과 타입 검사

`engines.node`는 `^22.22.2 || ^24.15.0 || >=26.0.0`이다. jsdom 30의 Node 조건과 ESLint 10·jest-dom 7의 지원 범위를 함께 적용했다. 로컬 검증은 Node `v24.18.0`에서 수행했다. [jest-dom 7 변경 사항](https://github.com/testing-library/jest-dom/releases/tag/v7.0.0), [ESLint 10 마이그레이션](https://eslint.org/docs/latest/use/migrate-to-10.0.0)

타입 도구의 역할은 다음과 같다.

| 실행 경로 | 실제 역할 |
| --- | --- |
| `node_modules/.bin/tsc` | `@typescript/native/bin/tsc`를 통한 TypeScript 7.0.2 검사 |
| `node_modules/.bin/tsc6` | `typescript/bin/tsc6`를 통한 TypeScript 6 호환 CLI |
| `require("typescript")` | 공식 호환 패키지의 컴파일러 API. 현재 API 보고 버전은 6.0.3 |
| `next build` 내부 검사 | Next의 `getTypeScriptPackageInfo`가 `typescript/bin/tsc6`를 선택하는 TypeScript 6 검사 |

호환 패키지의 npm 버전 6.0.2와 재노출하는 API 버전 6.0.3은 서로 다른 값이다. Next 내부 검사만으로 native 7 검사까지 완료했다고 간주하지 않도록 명시적인 게이트를 둔다.

```json
{
  "type-check": "next typegen && tsc --noEmit",
  "build": "npm run type-check && next build"
}
```

`next typegen`으로 라우트 타입을 먼저 만들고 native 7이 테스트 파일까지 포함한 프로젝트를 검사한 다음, Next 빌드와 내부 TypeScript 6 검사를 수행한다. native 7의 증분 정보는 Vercel이 보존하는 `.next/cache/typescript-native.tsbuildinfo`에 저장한다. 타입 오류를 무시하는 옵션은 추가하지 않았다. 배치 테스트 fixture는 `BatchSchedule` 타입을 명시해 키가 일반 문자열로 넓혀지는 문제를 수정했다. [Next TypeScript 7 안내](https://nextjs.org/docs/app/api-reference/config/typescript#using-typescript-7), [Next CLI 검사 동작](https://nextjs.org/docs/app/api-reference/config/next-config-js/useTypeScriptCli)

## ESLint 10 호환성

`eslint.config.mjs`에서 Next의 Core Web Vitals·TypeScript preset을 `@eslint/compat`의 `fixupConfigRules`로 감쌌다. ESLint 10에서 제거된 rule context API를 쓰는 기존 plugin을 대응하면서 규칙을 유지한다. 실제 규칙 위반 probe 3개로 규칙이 계속 실행됨을 확인했다. [공식 compatibility utilities](https://eslint.org/blog/2024/05/eslint-compatibility-utilities/)

현재 Next preset의 React·접근성·import plugin은 peer 범위에 ESLint 10을 아직 포함하지 않는다. 아래 세 plugin의 ESLint peer를 프로젝트의 직접 선언으로 제한해 override했다.

```json
{
  "eslint-plugin-react": { "eslint": "$eslint" },
  "eslint-plugin-jsx-a11y": { "eslint": "$eslint" },
  "eslint-plugin-import": { "eslint": "$eslint" }
}
```

이는 upstream의 공식 ESLint 10 지원 선언을 대신하지 않는다. 현재 조합의 재설치·린트·규칙 동작을 검증한 호환 조치이며, plugin이 지원 범위를 갱신하면 제거 여부를 재검토한다. `--force`나 `--legacy-peer-deps` 설치에 의존하지 않는다. 최종 의존성 트리의 problems는 0개다. [npm overrides 규칙](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#overrides)

## AntD·아이콘·Jest 대응

아이콘 6.3 계열은 가벼운 일반 아이콘 runtime과 ESM 정의 경로를 사용한다. CommonJS 경로에서도 `@ant-design/colors/es/generate`를 가져오기 때문에 `next.config.ts`의 `transpilePackages: ["@ant-design/colors"]`로 Next/Jest SWC 변환에 포함했다. 아이콘 SVG 패키지는 필요한 `@ant-design/icons-svg 4.6.0`으로 잠겼다. [아이콘 runtime 변경](https://github.com/ant-design/ant-design-icons/pull/736), [ESM 정의 변경](https://github.com/ant-design/ant-design-icons/pull/768), [SVG 의존성 수정](https://github.com/ant-design/ant-design-icons/pull/770), [Next transpilePackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages)

AntD 6.6의 `popupRender` 타입·Tooltip 타입 제한·Drawer 경고와 추가 deprecated API를 현재 사용부와 대조했다. 새 deprecated 사용처는 발견하지 못했다. [AntD changelog](https://ant.design/changelog/)

최신 확인창의 제목 전달 변경은 rc-util이 테스트 환경에서 고정하는 `test-id`와 충돌했다. 중첩 편집창과 폐기 확인창이 같은 제목 ID를 참조해 접근성 이름과 Escape 스택을 잘못 연결했다. 폼 값·dirty 상태는 정상적으로 전달되고 있었다.

`jest.setup.ts`에서 rc-util의 `lib/hooks/useId`와 `es/hooks/useId`를 실제 `React.useId`로 보완했다. 명시한 ID와 `getId`·`resetUuid` 등 나머지 모듈 API는 보존한다. 생산 코드의 dirty 검사나 폼 이벤트를 바꾸지 않았으며, 테스트의 접근성 이름 단언도 유지했다. 배치 테스트는 미리보기 갱신과 중첩 dialog 렌더를 추가로 확인한다.

실제 AntD 폼의 값·접근성·제출을 검사하는 jsdom 테스트가 기본 5초를 넘는 사례를 재현해 Jest의 개별 테스트 제한을 30초로 늘렸다. 테스트를 제외하거나 validation 단언을 약화하지 않았다.

axios 1.20의 설정 정규화 변경도 현재 인증 인터셉터와 대조했다. 기존 config를 반환하는 방식과 재시도 표식을 유지하고, 인증 재시도·토큰 회전 회귀 및 coverage 실행을 확인했다. [axios 1.20 공식 변경 사항](https://github.com/axios/axios/releases/tag/v1.20.0), [설정 처리 호환성 변경](https://github.com/axios/axios/pull/11141)

## 전이 의존성과 남은 항목

`babel-plugin-istanbul`이 사용하는 `test-exclude`만 `^8.0.0`으로 제한해 override했다. 전역 패턴 라이브러리를 일괄 교체하지 않았으며, coverage가 실제 생성되는지 검증했다. `test-exclude 8.0.0`은 `glob ^13.0.6`·`minimatch ^10.2.2`를 사용한다. 8의 주요 호환성 변경인 Node 20 하한과 glob 13 전환은 현재 Node 조건 및 coverage 실행에서 확인했다. Babel plugin 8 자체는 여전히 `test-exclude ^7.0.1`을 선언하므로 이 소비 경로에 한정한 조치다. [test-exclude 공식 changelog](https://github.com/istanbuljs/test-exclude/blob/3a37faa17cc4f0f602a7c1ec23ef0b0fcf44ab37/CHANGELOG.md), [Babel plugin 의존성](https://github.com/istanbuljs/babel-plugin-istanbul/blob/d28730cb9503bd1039bffbe3da1555641a3230e9/package.json)

```json
{
  "babel-plugin-istanbul": {
    "test-exclude": "^8.0.0"
  }
}
```

전체 audit은 업데이트 과정에서 moderate 1·high 7에서 **high 5**로 줄었다. 남은 5개는 아래 개발 의존성 경로에 대한 동일한 braces advisory의 영향 패키지 수다.

```text
eslint-config-next
└─ @next/eslint-plugin-next
   └─ fast-glob
      └─ micromatch
         └─ braces 3.0.3
```

`braces <=3.0.3`의 깊은 중괄호 패턴에 의한 스택 고갈 문제는 확인일 기준 패치 버전이 없다. npm이 제안하는 `eslint-config-next 14.2.35`로의 강제 변경은 Next 16 업데이트 목적과 맞지 않아 적용하지 않았다. 이 항목을 해결 완료로 표시하지 않는다. 운영 의존성을 대상으로 한 `npm audit --omit=dev` 결과는 **0건**이다. 이는 개발 도구까지 취약점이 없다는 뜻은 아니다. [공식 advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)

Jest의 공식 `@jest/environment-jsdom-abstract`에 최신 jsdom 30.1.2를 연결하는 `jest.environment.mjs`를 사용한다. 기존 `jest-environment-jsdom`은 제거했다. 삭제된 `ResourceLoader` 대신 `resources.userAgent`로 옵션을 전달하고, Window·VM·타이머·종료 처리는 공식 환경을 사용한다. 최신 DOM의 selector·CSSOM 계산을 유지하며 스타일과 접근성 검증도 실행한다. `whatwg-encoding`과 NWSAPI의 구버전 경로가 제거되어 재설치 deprecation 경고도 사라졌다. [Jest 공식 확장 환경](https://jestjs.io/blog/2025/06/04/jest-30#known-issues), [jsdom 30 변경](https://github.com/jsdom/jsdom/releases/tag/v30.0.0), [최신 DOM·CSS 수정](https://github.com/jsdom/jsdom/releases/tag/v30.1.2)

npm 설치 로그에는 `@parcel/watcher`·`unrs-resolver`의 install script가 로컬 allowScripts 목록에 아직 포함되지 않았다는 경고도 있다. 아래 재설치·타입·빌드는 이 경고가 있는 환경에서 통과했다.

## 검증 기록

아래 2026-10-04 검증은 동일 작업 폴더의 공동 스냅샷 기준이다. 이번 커밋에는 이 세션의 코드만 포함한다. 따라서 다른 세션이 추가한 인증·쿼리 정책 테스트까지 포함한 78 suites·502 tests와 API client 8 tests는 당시 측정값이며, 커밋 전용 검증 결과와 구분한다. 커밋 전용 API client 테스트는 이 세션에서 작성한 두 경계 사례를 포함한다.

`/tmp` 파일은 이 로컬 작업의 증거이며 저장소의 영구 산출물이 아니다. 버전과 설정의 재현 기준은 커밋 대상인 `package.json`·`package-lock.json`·설정 파일이다. dayjs를 직접 선언하기 전에도 잠금·설치 버전은 이미 1.11.23이었고, 추가 후 설치에서도 일치를 확인했다.

| 범위 | 상태 | 증거·한계 |
| --- | --- | --- |
| 직접 의존성 최신판 대조 | PASS | 직접 25개. 버전 메타데이터와 현재 manifest·lock·설치값 일치 |
| 재설치 | PASS | `/tmp/landy-admin-dependency-ci-latest-dom.log`; dayjs 직접 추가 설치는 `/tmp/landy-admin-dependency-dayjs.log` |
| 의존성 트리 | PASS | `npm ls` problems 0. peer override가 있는 현재 조합 기준 |
| ESLint | PASS | `/tmp/landy-admin-verified-lint.log`; 규칙 활성 probe 3개 PASS |
| 타입 검사 | PASS | `/tmp/landy-admin-verified-typecheck.log`; typegen + native 7 |
| 프로덕션 빌드 | PASS | `/tmp/landy-admin-vercel-final-warm.log`; native 7 게이트 + Next 내부 6 검사. 최종 빌드 `/tmp/landy-admin-completion-build.log` |
| API client 회귀 | PASS | 1 suite·8 tests. `/tmp/landy-admin-final-api-coverage.log` |
| API client coverage | PASS | 1 suite·8 tests, coverage 생성. `/tmp/landy-admin-final-api-coverage.log`. 프로젝트 전체 coverage 측정은 아님 |
| 배치 회귀 | PASS | unsaved·pending·table 3 suites·32 tests. `/tmp/landy-admin-batch-upgrade-regression.log` |
| 개발 서버 브라우저 | PASS | 41 checks, 콘솔 오류·경고 0. `/tmp/landy-admin-dependency-browser.log` |
| 프로덕션 서버 브라우저 | PASS | 41 checks, 콘솔 오류·경고 0. `/tmp/landy-admin-browser-all-final.log` |
| 운영 의존성 audit | PASS | 0건. `/tmp/landy-admin-dependency-audit-runtime.json` |
| 전체 의존성 audit | 미해결 항목 있음 | high 5, 단일 미패치 braces advisory 경로. `/tmp/landy-admin-dependency-audit-final.json` |
| 전체 Jest 최종 실행 | PASS | 78 suites·502 tests, 85.809초. `/tmp/landy-admin-completion-tests.json` |

브라우저의 41 checks는 16개 관리 라우트를 1440px·320px에서 확인한 32개 화면과 9개 상호작용이다. 목록 복귀 조건 보존, 모바일 메뉴, 알림 키보드 상세 열기, 임차인·릴리즈 정책·배치 초안 폐기 확인, 청구월 필터 직렬화, 로그인 복귀 동작을 확인했다. 화면 전체 overflow·누락된 heading·미확인 API 요청은 없었다. API는 로컬 fixture로 응답했으므로 실제 운영 데이터 변경·FCM/알림 발송·Kakao 인증 성공을 검증한 결과는 아니다. 상세 결과와 화면은 `/tmp/landy-admin-dependency-qa/results.json` 및 같은 디렉터리 PNG에 있다.

## 입력 확정과 테스트 정리

최신 Picker에서 blur 확정이 다음 클릭보다 늦게 전달될 수 있음을 실제 브라우저로 확인했다. `components/date-input.ts`에서 표준 날짜·숫자 8자리·청구월을 엄격히 파싱해 먼저 확정하고, 기존 값·잘못된 입력·빈값·disabled/readOnly·같은 날짜의 중복 변경을 처리한다. 계약 기간 버튼은 최신 Form 값으로 계산한다. 날짜 및 청구월 필터와 배치·알림톡의 열린 날짜 범위도 즉시 조회 시 정확한 URL·API 조건을 사용한다. 범위의 기본 순서 정렬과 빈 경계도 유지한다.

프로덕션 fixture 브라우저에서 기본 41 checks, 계약 날짜 7 flows, 달력 포커스/Escape 1 flow, 즉시 필터 조회 3 flows의 11조건을 확인했다. 콘솔 오류·경고, 미확인 API, 실제 서버 쓰기는 없었다. `/tmp/landy-admin-browser-dates-final.log`, `/tmp/landy-admin-final-filter-immediate-stable-qa/results.json`에 날짜 표시와 실제 mock 요청 조건을 기록했다.

테스트의 삭제·통합 및 유지 근거는 [전수 조사](TEST_AUDIT.md), 배포 캐시와 불필요한 배포 생략의 측정은 [빌드 개선](DEPLOYMENT_BUILD.md)에 정리했다.

## 이번 세션 커밋만의 최종 검증

다른 세션의 코드와 신규 테스트를 제외한 독립 소스 트리에서 **67 suites·413 tests, 실패·skip 0**을 확인했다. 61 suites·309 tests와 데이터 화면 6 suites·104 tests를 서로 겹치지 않는 두 실행으로 검증했다. 마지막 사례 완료 시각은 `2026-10-05T00:41:13.652000+09:00`이다.

- native TypeScript 검사·ESLint·Turbopack 프로덕션 빌드 통과.
- 커밋 여섯 단계의 중간 소스 트리도 각각 타입 검사를 통과했다.
- 최신 AntD 확인창 애니메이션은 테스트 host의 `ConfigProvider`에서만 제어했다. 폼 값·요청·잠금·실패 복구 단언을 유지하고, 동적 필드 렌더 및 dirty 알림의 실제 완료를 기다린다. 생산 코드와 전역 테스트 timeout은 변경하지 않았다.
- 다른 세션의 대체 테스트에 의존하던 인증 테스트 삭제와 깨끗한 알림톡 폼의 재조회 사례 삭제는 커밋하지 않았다.
- 로컬 근거: `/tmp/landy-admin-session-commits-20261005/validation.json`, `remaining-tests.json`, `data-final-tests.json`, `build-final.log`, `typecheck-final.log`, `lint-final.log`.
