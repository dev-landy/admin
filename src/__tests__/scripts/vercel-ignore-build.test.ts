/** @jest-environment node */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

const script = resolve("scripts/vercel-ignore-build.mjs");
let directory: string;
function git(...args: string[]) {
  return execFileSync("git", args, { cwd: directory, encoding: "utf8", stdio: "pipe" }).trim();
}
function commit(path: string) {
  const target = resolve(directory, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${path}\n${Date.now()}\n`);
  git("add", ".");
  git("-c", "commit.gpgsign=false", "commit", "--no-verify", "-m", "test fixture");
  return git("rev-parse", "HEAD");
}
function decision(previous: string, current: string, extra: Record<string, string> = {}) {
  return spawnSync(process.execPath, [script], {
    cwd: directory,
    env: { ...process.env, VERCEL_GIT_PREVIOUS_SHA: previous, VERCEL_GIT_COMMIT_SHA: current, VERCEL_GIT_COMMIT_MESSAGE: "", LANDY_FORCE_VERCEL_BUILD: "", ...extra },
    encoding: "utf8",
  });
}
beforeEach(() => {
  directory = mkdtempSync(`${tmpdir()}/landy-vercel-ignore-`);
  git("init", "-b", "main");
  git("config", "user.name", "Build test");
  git("config", "user.email", "build-test@example.test");
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

test("마지막 성공 배포 이후 문서와 테스트만 바뀌었을 때 생략한다", () => {
  const base = commit("src/app/page.tsx");
  commit("docs/deployment.md");
  commit("src/__tests__/page.test.tsx");
  commit("src/test-utils/fixture.ts");
  const head = commit("README.md");
  expect(decision(base, head).status).toBe(0);
});

test("직전 커밋이 문서여도 아직 배포하지 않은 런타임 변경이 있으면 빌드한다", () => {
  const base = commit("README.md");
  commit("src/app/page.tsx");
  const head = commit("docs/deployment.md");
  expect(decision(base, head).status).toBe(1);
});

test.each(["package-lock.json", "next.config.ts", "vercel.json", "public/icon.svg", "src/config/env.ts"])("%s 변경은 빌드한다", (path) => {
  const base = commit("README.md");
  expect(decision(base, commit(path)).status).toBe(1);
});

test("첫 배포·얕은 히스토리·동일 SHA 재배포와 명시 요청은 빌드한다", () => {
  const base = commit("src/app/page.tsx");
  const head = commit("README.md");
  expect(decision("", head).status).toBe(1);
  expect(decision("f".repeat(40), head).status).toBe(1);
  expect(decision(head, head).status).toBe(1);
  expect(decision(base, head, { LANDY_FORCE_VERCEL_BUILD: "1" }).status).toBe(1);
  expect(decision(base, head, { VERCEL_GIT_COMMIT_MESSAGE: "docs: 배포 [vercel build]" }).status).toBe(1);
});

test("문서 경로로 이동한 런타임 파일도 기존 경로 삭제를 보고 빌드한다", () => {
  const base = commit("src/app/page.tsx");
  mkdirSync(resolve(directory, "docs"));
  git("mv", "src/app/page.tsx", "docs/page.md");
  git("-c", "commit.gpgsign=false", "commit", "--no-verify", "-m", "test fixture rename");
  expect(decision(base, git("rev-parse", "HEAD")).status).toBe(1);
});
