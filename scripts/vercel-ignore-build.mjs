import { execFileSync } from "node:child_process";

// Vercel: 0 = 배포 생략, 1 = 빌드 진행. 판단할 수 없으면 항상 빌드한다.
const build = (reason) => {
  console.log(`[vercel] Build: ${reason}`);
  process.exit(1);
};

if (process.env.LANDY_FORCE_VERCEL_BUILD === "1" || /\[vercel build\]/i.test(process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "")) {
  build("explicit request");
}

const previous = process.env.VERCEL_GIT_PREVIOUS_SHA ?? "";
const current = process.env.VERCEL_GIT_COMMIT_SHA ?? "";
const shaPattern = /^(?:[\da-f]{40}|[\da-f]{64})$/i;
if (!shaPattern.test(previous) || !shaPattern.test(current) || previous === current) {
  build("first deployment, missing Git metadata, or redeploy");
}

try {
  execFileSync("git", ["merge-base", "--is-ancestor", previous, current], { stdio: "pipe" });
  const paths = execFileSync("git", ["diff", "--name-only", "--no-renames", "-z", previous, current], { encoding: "utf8" })
    .split("\0").filter(Boolean);
  const nonRuntimeFile = (path) => path.startsWith("docs/") || path.startsWith("src/__tests__/") || path.startsWith("src/test-utils/") || /^[^/]+\.md$/i.test(path);
  if (!paths.length || paths.some((path) => !nonRuntimeFile(path))) build("runtime or build inputs changed");
  console.log(`[vercel] Skip: ${paths.length} documentation/test files changed since the last successful deployment`);
  process.exit(0);
} catch {
  build("Git history unavailable or branch history changed");
}
