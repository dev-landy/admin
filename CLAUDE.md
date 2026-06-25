@AGENTS.md

# Landy Admin

Landy 서버의 API를 소비하는 Next.js 기반 어드민 콘솔.

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Ant Design v6** — UI 컴포넌트 (`antd`, `@ant-design/icons`)
  - App Router SSR 스타일 추출: `@ant-design/nextjs-registry`
- **TanStack Query v5** — 서버 상태/데이터 페칭 (`@tanstack/react-query`)
- **axios** — HTTP 클라이언트
- 패키지 매니저: **npm**

> Tailwind는 사용하지 않음 (antd v5/v6의 CSS-in-JS reset과 충돌 방지).

## Commands

```bash
npm run dev         # 개발 서버 (Turbopack)
npm run build       # 프로덕션 빌드
npm run start       # 프로덕션 서버
npm run lint        # ESLint
npm run type-check  # tsc --noEmit
```

## Structure

```
src/
  app/
    layout.tsx          # 루트 레이아웃 (Geist 폰트 + Providers 주입)
    providers.tsx       # 'use client' — AntdRegistry + ConfigProvider + App + QueryClientProvider
    page.tsx            # 홈 (현재는 환경 설정 확인용 플레이스홀더)
    globals.css         # 최소 글로벌 리셋 (antd가 자체 reset 제공)
  config/
    env.ts              # 환경 변수 검증/접근 (process.env 직접 접근 금지)
  lib/
    api/
      client.ts         # 공유 axios 인스턴스 (baseURL, 인터셉터)
    query/
      get-query-client.ts  # 환경별 QueryClient 팩토리 (TanStack App Router 패턴)
```

## Conventions

- **환경 변수**: 항상 `@/config/env`의 `env`를 통해 접근. `process.env`를 직접 읽지 말 것.
  브라우저 노출 변수는 `NEXT_PUBLIC_` 접두사 필수. `.env.local`은 git 무시됨 (`.env.example` 참고).
- **API 호출**: `@/lib/api/client`의 `apiClient`(axios)를 사용. 기능별 API 함수는
  `src/features/<domain>/api.ts` 같은 형태로 도메인별로 묶고, TanStack Query 훅으로 감싼다.
- **antd 정적 메서드**(message/notification/Modal)는 `App` 컨텍스트(`App.useApp()`) 경유 사용 권장.
- API 명세가 도착하면 도메인별 `src/features/*`로 화면/쿼리/타입을 추가한다.
