import { resolveRetentionRange, type RetentionRange } from "@/features/dashboard/retention-range";
import { dateInZone } from "@/features/dashboard/server/shared";
import { env } from "@/config/env";
import { loadGoogleAds } from "@/features/dashboard/server/googleAds";
import { loadPosthog } from "@/features/dashboard/server/posthog";

export const runtime = "nodejs";
export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
function problem(status: number, detail: string) {
  return Response.json({ type: status === 403 ? "/problems/admin-forbidden" : "/problems/dashboard", title: "대시보드 조회 실패", status, detail }, { status, headers });
}
export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization || !/^Bearer \S+$/i.test(authorization)) return problem(401, "관리자 로그인이 필요합니다.");
  const source = new URL(request.url).searchParams.get("source");
  if (source !== "posthog" && source !== "retention" && source !== "googleAds" && source !== "activation") return problem(400, "지원하지 않는 데이터 소스입니다.");
  const params = new URL(request.url).searchParams;
  let range: RetentionRange | undefined;
  if (source === "retention" && (params.has("retentionStart") || params.has("retentionEnd"))) {
    range = { start: params.get("retentionStart") || "", end: params.get("retentionEnd") || "" };
    try { resolveRetentionRange(range, dateInZone(new Date(), "Asia/Seoul")); }
    catch { return problem(400, "리텐션 조회 기간이 올바르지 않습니다. 오늘까지 최대 1년 범위로 선택하세요."); }
  }
  // The client AuthGuard is not a server authorization boundary. Always ask the
  // backend's admin-role-protected endpoint before using provider credentials.
  try {
    const access = await fetch(`${env.apiBaseUrl}/v1/admin/users?page=1&size=1`, {
      headers: { Authorization: authorization }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000),
    });
    await access.body?.cancel();
    if (access.status === 401) return problem(401, "로그인이 만료되었습니다.");
    if (access.status === 403) return problem(403, "관리자 권한이 필요합니다.");
    if (!access.ok) return problem(502, "관리자 권한 확인에 실패했습니다. Landy API 연결 상태를 확인하세요.");
  } catch { return problem(502, "관리자 권한을 확인할 수 없습니다. Landy API 연결 상태를 확인하세요."); }
  const result = source === "posthog" ? await loadPosthog(undefined, "activity") : source === "retention" ? await loadPosthog(range, "retention") : source === "activation" ? await loadPosthog(undefined, "activation") : await loadGoogleAds();
  return Response.json(result, { headers });
}
