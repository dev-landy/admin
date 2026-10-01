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

계약서 목록의 `미완료 작업 재처리`는 `POST /v1/admin/contract-uploads/storage-retries`를 호출한다.
전체 계약서의 보관·삭제 등 파일 작업과 이전 처리 흐름의 임차인 등록·결과 알림을 이어서 처리하며,
OCR을 새로 요청하지 않는다. 응답의 `attempted`는 실패를 포함한 파일 작업 시도 건수이며 등록·알림 건수는
포함하지 않는다. 0건이어도 backoff 등으로 대기 중인 작업이 남을 수 있다. 응답 유실·오류 때도 일부 작업이
처리됐을 수 있으므로 관련 목록을 갱신하고, 자동으로 재요청하지 않는다.

배치 화면은 실행 이력·Step 상세·지연 경고와 Job·상태·종료 코드·대상 날짜 필터를 제공한다.
예약의 실행 시각·활성 여부는 배치 설정 화면에서 변경하며, 수동 실행·실행 재시도는 제공하지 않는다.
집수리 요청 만료·사진 정리 예약도 같은 화면에서 관리한다. 예약 변경은 DB 저장 후 기본 1분 주기의
동기화에서 반영되며 지연될 수 있다. 비활성화해도 이미 실행 중인 작업은 중단하지 않는다.
