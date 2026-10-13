import { createHash } from "node:crypto";
import { posthogResults } from "./result-cache";
import { loadActivationData } from "./activation";
import { resolveRetentionRange, type RetentionRange } from "../retention-range";
import { serverEnv } from "@/config/env.server";
import type { ActivationData, ActivityData, RetentionData, Cohort, PosthogData, SourceResult } from "../types";
import { AnalyticsError, dateInZone, numeric, readJson, shiftDate, sourceError } from "./shared";

// Only known interactive events and meaningful screens. Do not count lifecycle,
// login, registration submission or automatic bank-notification events as value.
const info = "(event = 'room_updated' OR (event = '$screen' AND properties.$screen_name IN ('rooms/[id]', 'rooms/[id]/edit', 'rooms/contract-ocr/[documentId]', 'rooms/contract-ocr/[documentId]/viewer')))";
const rent = "((event IN ('payment_recorded', 'payment_updated') AND properties.source = 'manual') OR event = 'tenant_overdue_notification_changed' OR (event = '$screen' AND properties.$screen_name IN ('rooms', 'profit', 'profit/income')))";
const active = `(${info} OR ${rent})`;
// Mobile uses the backend's numeric userId as distinct_id after identify.
const audience = "match(distinct_id, '^[0-9]+$') AND coalesce(toString(person.properties.is_internal), '') NOT IN ('true', '1') AND coalesce(toString(person.properties.is_test), '') NOT IN ('true', '1')";
const ts = (date: string) => `toDateTime('${date} 00:00:00', 'Asia/Seoul')`;
export function loadPosthog(range?: RetentionRange): Promise<SourceResult<PosthogData>>;
export function loadPosthog(range: RetentionRange | undefined, section: "activity"): Promise<SourceResult<ActivityData>>;
export function loadPosthog(range: RetentionRange | undefined, section: "retention"): Promise<SourceResult<RetentionData>>;
export function loadPosthog(range: undefined, section: "activation"): Promise<SourceResult<ActivationData>>;
export async function loadPosthog(range?: RetentionRange, section: "all" | "activity" | "retention" | "activation" = "all"): Promise<SourceResult<PosthogData | ActivityData | RetentionData | ActivationData>> {
  try {
    const config = serverEnv.posthog;
    const today = dateInZone(new Date(), "Asia/Seoul");
    const selected = section === "retention" || section === "all" ? resolveRetentionRange(range, today) : undefined;
    // Scope cached data to credentials/project/query version and KST report day.
    const key = createHash("sha256").update(JSON.stringify([config, section, selected, today])).digest("hex");
    return await posthogResults.get(key, () => loadUncached(range, section));
  } catch (error) { return sourceError(error); }
}
async function loadUncached(range: RetentionRange | undefined, section: "all" | "activity" | "retention" | "activation"): Promise<SourceResult<PosthogData | ActivityData | RetentionData | ActivationData>> {
  try {
    const config = serverEnv.posthog;
    if (config.apiKey.startsWith("phc_")) throw new AnalyticsError("wrong_key_type", "POSTHOG_PERSONAL_API_KEY에 이벤트 전송용 키(phc_)가 들어 있습니다. PostHog 개인 설정에서 Query Read 권한의 Personal API Key(phx_)를 만들고 교체하세요.");
    const host = new URL(config.host);
    if (host.protocol !== "https:" || host.username || host.password || !/^\d+$/.test(config.projectId)) throw new AnalyticsError("invalid_configuration", "POSTHOG_HOST는 HTTPS 주소, POSTHOG_PROJECT_ID는 숫자 프로젝트 ID여야 합니다.");
    if (host.hostname === "us.i.posthog.com") host.hostname = "us.posthog.com";
    if (host.hostname === "eu.i.posthog.com") host.hostname = "eu.posthog.com";
    // One deadline includes all queries and retries, below the client's 55s timeout.
    const signal = AbortSignal.timeout(45000);
    async function query(sql: string, retried = false): Promise<unknown[][]> {
      const response = await fetch(`${host.origin}/api/projects/${config.projectId}/query/`, { method: "POST", cache: "no-store", redirect: "error", signal, headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: { kind: "HogQLQuery", query: sql }, refresh: "blocking" }) });
      // Gateways may send HTML instead of JSON. Check status before parsing.
      if (response.status === 504) {
        await response.body?.cancel();
        if (!retried) return query(sql, true);
        throw new AnalyticsError("query_timeout", "PostHog 집계 시간이 초과되었습니다. 자동 재시도 후에도 완료되지 않았습니다. 잠시 후 다시 조회하세요. (HTTP 504)");
      }
      const body = await readJson(response);
      if (!response.ok) {
        if (response.status === 401 || body.code === "authentication_failed") throw new AnalyticsError("authentication_failed", "PostHog 인증에 실패했습니다. Personal API Key와 US/EU 호스트가 맞는지 확인하세요.");
        if (response.status === 403) throw new AnalyticsError("permission_denied", "PostHog 조회 권한이 없습니다. 키의 Query Read 권한과 해당 프로젝트 접근 범위를 확인하세요.");
        if (response.status === 404) throw new AnalyticsError("project_not_found", "PostHog 프로젝트를 찾을 수 없습니다. 프로젝트 ID와 US/EU 호스트를 확인하세요.");
        if (response.status === 429) throw new AnalyticsError("rate_limited", "PostHog 조회 한도에 도달했습니다. 잠시 후 다시 시도하세요.");
        throw new AnalyticsError("query_failed", `PostHog 집계 요청에 실패했습니다. (HTTP ${response.status})`);
      }
      if (body.hasMore === true || body.has_more === true) throw new AnalyticsError("incomplete_results", "PostHog 집계 결과가 일부만 반환되어 수치를 표시하지 않습니다.");
      if (!Array.isArray(body.results) || body.results.some(row => !Array.isArray(row))) throw new AnalyticsError("invalid_response", "PostHog 집계가 아직 완료되지 않았거나 응답 형식이 올바르지 않습니다. 다시 조회하세요.");
      return body.results;
    }
    const today = dateInZone(new Date(), "Asia/Seoul"); const start = shiftDate(today, -30); const end = shiftDate(today, -1);
    if (section === "activation") return await loadActivationData(query, today);
    const currentWeek = shiftDate(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
    const selected = resolveRetentionRange(range, today);
    const comparisonEnd = selected.until < currentWeek ? selected.until : currentWeek;
    const previous = shiftDate(comparisonEnd, -7); const before = shiftDate(comparisonEnd, -14);
    const ends = [-90, -60, -30, 0].map(days => shiftDate(today, days));
    const trends = `SELECT multiIf(timestamp < ${ts(ends[0])}, 0, timestamp < ${ts(ends[1])}, 1, timestamp < ${ts(ends[2])}, 2, 3) AS period, uniqExact(person_id), uniqExactIf(person_id, ${info}), uniqExactIf(person_id, ${rent}) FROM events WHERE timestamp >= ${ts(shiftDate(today, -120))} AND timestamp < ${ts(today)} AND ${active} AND ${audience} GROUP BY period ORDER BY period`;
    const retention = `SELECT countIf(prior > 0), countIf(prior > 0 AND recent > 0) FROM (SELECT person_id, countIf(timestamp < ${ts(previous)}) AS prior, countIf(timestamp >= ${ts(previous)}) AS recent FROM events WHERE ${audience} AND ${active} AND timestamp >= ${ts(before)} AND timestamp < ${ts(comparisonEnd)} GROUP BY person_id)`;
    // Compute first observed activity over all available history, then restrict
    // cohorts. Starting the first-event scan at the report window mislabels old users.
    // Older cohorts only need history through their third follow-up week.
    const followupEnd = shiftDate(selected.until, 21);
    const cohortEnd = followupEnd < currentWeek ? followupEnd : currentWeek;
    const cohortSql = `SELECT formatDateTime(first_week, '%Y-%m-%d'), count(), countIf(has(weeks, addWeeks(first_week, 1))), countIf(has(weeks, addWeeks(first_week, 2))), countIf(has(weeks, addWeeks(first_week, 3))) FROM (SELECT toStartOfWeek(toTimeZone(min(timestamp), 'Asia/Seoul'), 1) AS first_week, groupUniqArrayIf(toStartOfWeek(toTimeZone(timestamp, 'Asia/Seoul'), 1), timestamp >= ${ts(selected.start)}) AS weeks FROM events WHERE ${audience} AND ${active} AND timestamp < ${ts(cohortEnd)} GROUP BY person_id) WHERE first_week >= toDate('${selected.start}') AND first_week < toDate('${selected.until}') GROUP BY first_week ORDER BY first_week LIMIT 100`;
    const [trendRows, retained, cohortRows] = await Promise.all([section === "retention" ? [] : query(trends), section === "activity" ? [] : query(retention), section === "activity" ? [] : query(cohortSql)]);
    if ((section !== "retention" && trendRows.length > 4) || (section !== "activity" && retained.length !== 1)) throw new AnalyticsError("invalid_response", "PostHog 집계 응답이 누락되었습니다.");
    if (trendRows.some(row => row.length !== 4 || !Number.isInteger(Number(row[0])) || Number(row[0]) < 0 || Number(row[0]) > 3) || new Set(trendRows.map(row => Number(row[0]))).size !== trendRows.length) {
      throw new AnalyticsError("invalid_response", "활동 추세 응답 형식이 올바르지 않습니다.");
    }
    const activity = section === "retention" ? [] : ends.map((date, index) => {
      const row = trendRows.find(row => Number(row[0]) === index);
      if (!row) return { date: shiftDate(date, -1), all: 0, info: 0, rent: 0 };
      return { date: shiftDate(date, -1), all: numeric(row[1]), info: numeric(row[2]), rent: numeric(row[3]) };
    });
    if (section === "activity") return { status: "success", fetchedAt: new Date().toISOString(), data: { start, end, activity, mau: activity[3].all, previousMau: activity[2].all } };
    const cohorts: Cohort[] = [];
    for (const row of cohortRows) {
      const week = String(row[0]); if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) throw new AnalyticsError("invalid_response", "리텐션 날짜 형식이 올바르지 않습니다.");
      const users = numeric(row[1]);
      cohorts.push({ week, users, values: [0, 1, 2, 3].map(offset => {
        const period = shiftDate(week, offset * 7);
        if (period === currentWeek) return "집계 중";
        if (period > currentWeek) return "—";
        return users ? Math.round(numeric(row[offset + 1]) / users * 1000) / 10 : 0;
      }) });
    }
    const base = numeric(retained[0][0]); const returned = numeric(retained[0][1]);
    const retentionData: RetentionData = { retentionRange: { start: selected.start, end: selected.end }, retention: { base, returned, rate: base ? Math.round(returned / base * 1000) / 10 : null, from: before, to: previous }, cohorts };
    if (section === "retention") return { status: "success", fetchedAt: new Date().toISOString(), data: retentionData };
    return { status: "success", fetchedAt: new Date().toISOString(), data: { start, end, retentionRange: { start: selected.start, end: selected.end }, activity, mau: activity[3].all, previousMau: activity[2].all, retention: { base, returned, rate: base ? Math.round(returned / base * 1000) / 10 : null, from: before, to: previous }, cohorts } };
  } catch (error) { return sourceError(error); }
}
