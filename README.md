# Landy Admin

Landy 서버의 API를 소비하는 어드민 콘솔 (Next.js 16 App Router + Ant Design v6).

## 시작하기

1. `.env.example`을 `.env.local`로 복사하고 값을 채운다 (Kakao OAuth 로그인용 `KAKAO_*` 값 필요).
2. 의존성 설치 후 개발 서버 실행:

```bash
npm install
npm run dev
```

http://localhost:3000 접속 → Kakao 로그인 후 어드민 화면으로 이동한다.

## 구조 & 규칙

- 화면: `src/app/(admin)/*` · 도메인 로직: `src/features/*`
- 상세 구조/컨벤션/커맨드는 [CLAUDE.md](CLAUDE.md) 참고

## 배포

Vercel의 `admin-prod` / `admin-dev` 두 프로젝트가 같은 `main` 브랜치를 배포하며,
프로젝트별 환경 변수(`NEXT_PUBLIC_API_BASE_URL`, `KAKAO_REDIRECT_URI`, `NEXT_PUBLIC_APP_ENV=prod|dev`)로 구분된다.
`NEXT_PUBLIC_APP_ENV`는 탭 제목·파비콘·상단 스트립·헤더 배지 색상을 결정한다 (미설정 시 `local`).

계약서 관리는 `/v1/admin/contract-documents` API를 사용한다. 등록은 검수값을 평탄한 본문으로 보내
응답 시 완료한다. OCR은 필요할 때 별도로 요청하며, 제안값을 관리자가 선택해 적용한다. 보관 초안과 최신 OCR 조회의
`204`는 결과가 없는 상태다. 이 계약과 `/draft` 조회를 지원하는 백엔드를 먼저 배포한 뒤 어드민을 배포한다.
웹 페이지의 `/contract-ocr` 주소는 기존 Slack 링크를 위해 유지하며, 구 관리자 API 호출은 사용하지 않는다.
