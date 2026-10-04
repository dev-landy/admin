# Vercel 배포 빌드 개선

확인일: 2026-10-04. `admin-prod`와 `admin-dev`는 같은 저장소의 `main`을 배포한다. 최근 커밋 `513af4e`의 GitHub Vercel 상태 기록에서 pending→success는 각각 56초·127초였다. 이 값은 대기와 배포 처리를 포함하며 순수 컴파일 시간은 아니다.

## 반영한 변경

- Next.js 16.3.8의 기본 Turbopack 생산 빌드 캐시를 사용한다. Vercel은 `.next/cache`를 자동 보존한다. [Next 캐시 안내](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopackFileSystemCache), [Vercel의 Next 캐시](https://nextjs.org/docs/app/guides/ci-build-caching)
- TypeScript 7의 증분 검사 파일을 `.next/cache/typescript-native.tsbuildinfo`에 저장한다. Vercel 캐시 복원에 포함되며 Next의 TypeScript 6 검사 파일과 분리된다. native 7의 전체 타입 검사와 Next의 빌드 검사는 유지한다.
- `vercel.json`에서 `npm run build`를 명시하고, 문서·테스트 전용 변경은 `scripts/vercel-ignore-build.mjs`로 배포를 생략한다. 두 프로젝트 모두 적용되는 저장소 설정이다. [빌드 설정](https://vercel.com/docs/project-configuration/vercel-json#buildcommand), [Ignored Build Step](https://vercel.com/kb/guide/how-do-i-use-the-ignored-build-step-field-on-vercel)

생략 판단은 **프로젝트·브랜치의 마지막 성공 배포 SHA부터 현재 SHA까지** 비교한다. `HEAD^` 한 커밋만 비교하지 않으므로, 아직 배포하지 않은 기능 변경 뒤에 문서 커밋이 추가돼도 빌드를 수행한다. rename을 분리해 이전 런타임 경로가 삭제된 경우도 감지한다. [이전 배포 SHA](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_git_previous_sha)

다음 경우에는 빌드한다.

- 첫 배포, SHA 누락, 얕은 Git 이력으로 비교 불가, 브랜치 이력 변경
- 같은 SHA 재배포 또는 변경 파일이 없는 경우
- 소스·정적 자산·의존성·빌드 설정 등 문서/테스트 전용 경로 밖의 변경
- `LANDY_FORCE_VERCEL_BUILD=1` 또는 커밋 메시지의 `[vercel build]`

환경 변수 변경 후 문서 커밋을 재배포하는 등 변경 파일 외의 이유로 빌드해야 하면 강제 빌드 조건을 사용한다. 사용자에게 비용이 발생하는 빌드 머신이나 동시 실행 설정은 변경하지 않았다.

## 로컬 측정

아래 측정은 당시 공동 작업 스냅샷 기준이며 다른 세션의 미커밋 소스도 포함한다. 이번 커밋은 이 세션의 배포 설정만 반영한다. 따라서 66.6% 수치를 이 커밋 전용 소스의 개선율로 확대하지 않는다.

동일한 런타임 소스·의존성·설정의 SHA256을 대조한 뒤 `.next/cache`가 없는 빌드와 캐시가 있는 빌드를 순서대로 실행했다. 기존 캐시는 임시 폴더에 보존했다. Node.js 24.18.0 환경이며 각 빌드에서 타입 검사와 전체 정적 페이지 생성을 수행했다.

| 단계 | 캐시 없음 | 캐시 있음 |
| --- | ---: | ---: |
| `npm run build` 전체 | 12.11초 | 4.04초 |
| Turbopack 컴파일 | 5.8초 | 0.306초 |

측정 스냅샷의 전체 로컬 빌드 시간은 66.6% 감소했다. 비교에 사용한 소스 해시는 `/tmp/landy-admin-vercel-final-benchmark-state.json`에 기록했다. 클라우드 머신·설치·대기·업로드 조건은 다르므로 이 비율을 Vercel의 실제 배포 단축률로 사용하지 않는다. 실제 효과는 다음 Git 배포의 Build Diagnostics에서 확인한다. [Vercel 빌드 진단](https://vercel.com/docs/builds/managing-builds)

측정 로그는 `/tmp/landy-admin-vercel-final-{cold,warm}.log`, 동일 소스 검증은 `/tmp/landy-admin-vercel-final-benchmark-state.json`, 요약은 `/tmp/landy-admin-vercel-final-benchmark.json`이다. 배포 생략은 실제 임시 Git 저장소에서 문서/테스트 변경, 누적 기능 변경, 의존성·설정·자산 변경, 최초·재배포·이력 누락, 명시 요청, 런타임 파일 이동 등 9개 경계를 검증했다.

변경은 저장소 파일에 반영했다. 실제 Vercel 배포를 새로 실행하지 않았으므로 클라우드의 개선 후 시간은 아직 측정하지 않았다.
