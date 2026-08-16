<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Landy Admin

Landy 서버의 API를 소비하는 Next.js 기반 어드민 콘솔.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Ant Design v6** — UI 컴포넌트 (`antd`, `@ant-design/icons`)
  - App Router SSR 스타일 추출: `@ant-design/nextjs-registry`
- **TanStack Query v5** — 서버 상태/데이터 페칭 (`@tanstack/react-query`)
- **axios** — HTTP 클라이언트
- **Jest** + Testing Library — 테스트 (`src/__tests__/`)
- 패키지 매니저: **npm**

> Tailwind는 사용하지 않음 (antd의 CSS-in-JS reset과 충돌 방지).

## Commands

```bash
npm run dev            # 개발 서버 (Turbopack)
npm run build          # 프로덕션 빌드
npm run start          # 프로덕션 서버
npm run lint           # ESLint
npm run type-check     # tsc --noEmit
npm test               # Jest 테스트
npm run test:watch     # Jest watch 모드
npm run test:coverage  # 커버리지 리포트
```

## Structure

```
.env.example            # 로컬·배포 환경 변수 템플릿
next.config.ts          # 브라우저의 /api 요청을 Landy API 서버로 전달하는 rewrite
src/
  app/
    layout.tsx          # 루트 레이아웃 (Geist 폰트 + EnvTopStrip + Providers 주입)
    providers.tsx       # Ant Design·QueryClient·AuthProvider 및 개발용 Query Devtools 주입
    page.tsx            # 홈 — /users로 redirect
    icon.tsx            # 환경 색상 파비콘 (NEXT_PUBLIC_APP_ENV 기반, ImageResponse)
    globals.css         # 최소 글로벌 리셋 (antd가 자체 reset 제공)
    login/              # Kakao 로그인 페이지
    auth/kakao/         # OAuth start/exchange 라우트 핸들러 + callback 페이지
    (admin)/
      layout.tsx        # 클라이언트 AuthGuard + 사이드바·헤더
      users/ properties/ tenants/ contract-ocr/
      payments/ notifications/ fcm/ release-policies/
                        # 상세·운영 하위 라우트는 각 도메인 디렉터리 아래에 둔다
  components/           # 공용 환경 표시·테이블·날짜/ID 필터 컴포넌트
  config/
    env.ts              # 브라우저 노출 환경 변수 검증/접근 (NEXT_PUBLIC_*)
    env.server.ts       # 서버 전용 시크릿 (Kakao) — 클라이언트 임포트 시 throw
    app-env.ts          # 배포 환경(prod/dev/local)별 표시 메타 (라벨/색상)
  features/             # 도메인별 모듈 — 보통 api.ts / hooks.ts / types.ts / components/
                        # auth, users, properties, tenants, contract-ocr, payments,
                        # notifications, fcm, releasePolicies
  lib/
    api/
      client.ts         # 공유 axios 인스턴스 (토큰 부착, 401 refresh, admin-forbidden 403 처리)
      problem.ts        # Problem Detail 에러 응답 파싱
    format/             # 날짜·금액 표시용 순수 포맷 함수
    query/
      get-query-client.ts  # 환경별 QueryClient 팩토리 (TanStack App Router 패턴)
  __tests__/            # app/components/config/features/lib 구조를 따르는 Jest·Testing Library 테스트
```

## Conventions

- **라이브러리 API 확인**: 프레임워크나 외부 라이브러리 API를 사용·수정하기 전에 `package.json`과
  lockfile로 설치 버전을 확인하고, 해당 버전의 로컬 문서와 타입 정의를 기준으로 구현한다. 학습된 지식이나
  다른 버전의 예제를 현재 API 계약으로 간주하지 않는다.
- **Deprecated API 금지**: 타입 정의의 `@deprecated`, 빌드·테스트 로그, 브라우저 콘솔의 deprecation
  경고는 수정 대상 오류로 취급한다. 새 코드에 deprecated API를 도입하지 않으며, 변경한 파일과 영향받는
  흐름에서는 동일 사용처를 모두 검색해 현재 권장 API로 교체한다.
- **마이그레이션 동작 보존**: API 교체가 컴포넌트 구조를 바꾸는 경우 값·이벤트·ref 전달, 폼 바인딩,
  validation, 접근성, disabled/loading 상태, 서버·클라이언트 경계를 확인한다. 단순히 경고만 사라지는지
  확인하지 말고 핵심 사용자 동작을 회귀 테스트로 검증한다.
- **완료 검증**: 변경 범위에 맞는 타입 검사·린트·테스트·프로덕션 빌드를 실행하고, 런타임 경고와 관련된
  작업은 영향받는 화면의 브라우저 콘솔도 확인한다. 기존 경고가 변경 범위 밖에 남아 있으면 새 문제와
  구분하여 명시한다.
- **환경 변수**: 기능 코드의 배포 설정은 `@/config/env`의 `env`, 서버 전용 시크릿(Kakao)은
  `@/config/env.server`의 `serverEnv`를 통해 접근한다. `process.env` 직접 접근은 config·Next.js 설정·
  런타임 환경 분기와 테스트 같은 경계 코드에 한정한다. 브라우저 노출 변수는 `NEXT_PUBLIC_` 접두사가
  필요하고 정적 프로퍼티로 참조해야 한다. `.env.local`은 git 무시됨 (`.env.example` 참고).
- **API 경계**: 브라우저의 Landy API 호출은 `/api`와 `next.config.ts` rewrite를 경유하고, 서버 컨텍스트만
  설정된 백엔드 주소를 직접 사용한다. 관리자 도메인 API는 `@/lib/api/client`의 `apiClient`를 기본으로
  `src/features/<domain>/api.ts`에 모은다. 인증 bootstrap처럼 순환 의존성을 피해야 하는 경계와 외부 OAuth
  통신은 별도 클라이언트 또는 서버 전용 구현을 유지한다.
- **인증 경계**: 현재 관리자 인증은 middleware/SSR 세션이 아니라 `AuthProvider`·`AuthGuard`와
  `localStorage` 토큰을 사용하는 클라이언트 경계다. Kakao 키·client secret·인가 코드 교환은 서버 전용
  모듈과 Route Handler 밖으로 노출하지 않는다.
- **서버 상태**: 기능별 TanStack Query 훅이 query key와 mutation을 관리한다. mutation이 여러 화면의
  데이터를 바꾸면 직접 영향받는 다른 도메인 캐시까지 함께 무효화한다.
- **오류 처리**: 백엔드 Problem Detail은 임의 캐스팅하지 않고 `@/lib/api/problem`의
  `parseProblemDetail`로 해석한다.
- **antd 정적 메서드**(message/notification/Modal)는 `App` 컨텍스트(`App.useApp()`)를 경유한다.
- **코드 배치**: 라우트·page·layout은 `src/app`, 도메인 API·훅·타입·재사용 UI는
  `src/features/<domain>/`에 둔다. 새 도메인도 같은 구조를 따른다.
- **테스트 배치**: 테스트는 `src/__tests__/`에서 소스 구조를 따라 배치한다. 기본 환경은 jsdom이며,
  Route Handler나 서버 전용 모듈은 파일 단위 Node 테스트 환경을 사용한다.
