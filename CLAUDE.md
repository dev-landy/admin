@AGENTS.md

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
src/
  app/
    layout.tsx          # 루트 레이아웃 (Geist 폰트 + EnvTopStrip + Providers 주입)
    providers.tsx       # 'use client' — AntdRegistry + ConfigProvider + App + QueryClientProvider + AuthProvider
    page.tsx            # 홈 — /users로 redirect
    icon.tsx            # 환경 색상 파비콘 (NEXT_PUBLIC_APP_ENV 기반, ImageResponse)
    globals.css         # 최소 글로벌 리셋 (antd가 자체 reset 제공)
    login/              # Kakao 로그인 페이지
    auth/kakao/         # OAuth start/exchange 라우트 핸들러 + callback 페이지
    (admin)/            # AuthGuard + 사이드바 레이아웃, 도메인별 페이지
                        # (users, tenants, payments, notifications, fcm, feedbacks, release-policies)
  components/           # 공용 컴포넌트 (EnvIndicator, PagedTable)
  config/
    env.ts              # 브라우저 노출 환경 변수 검증/접근 (NEXT_PUBLIC_*)
    env.server.ts       # 서버 전용 시크릿 (Kakao) — 클라이언트 임포트 시 throw
    app-env.ts          # 배포 환경(prod/dev/local)별 표시 메타 (라벨/색상)
  features/             # 도메인별 모듈 — 보통 api.ts / hooks.ts / types.ts / components/
                        # (auth, users, tenants, payments, notifications, fcm, feedbacks, releasePolicies)
  lib/
    api/
      client.ts         # 공유 axios 인스턴스 (토큰 부착, 401 refresh, admin-forbidden 403 처리)
      problem.ts        # Problem Detail 에러 응답 파싱
    query/
      get-query-client.ts  # 환경별 QueryClient 팩토리 (TanStack App Router 패턴)
  __tests__/            # Jest 테스트
```

## Conventions

- **환경 변수**: 브라우저 노출 변수는 `@/config/env`의 `env`, 서버 전용 시크릿(Kakao)은
  `@/config/env.server`의 `serverEnv`를 통해 접근. `process.env`를 직접 읽지 말 것.
  브라우저 노출 변수는 `NEXT_PUBLIC_` 접두사 필수. `.env.local`은 git 무시됨 (`.env.example` 참고).
- **API 호출**: `@/lib/api/client`의 `apiClient`(axios)를 사용. 기능별 API 함수는
  `src/features/<domain>/api.ts` 같은 형태로 도메인별로 묶고, TanStack Query 훅으로 감싼다.
- **antd 정적 메서드**(message/notification/Modal)는 `App` 컨텍스트(`App.useApp()`) 경유 사용 권장.
- 도메인별 화면/쿼리/타입은 `src/features/<domain>/`에 둔다 (보통 api.ts·hooks.ts·types.ts·components/ 구조).
  새 도메인도 같은 구조를 따른다.
