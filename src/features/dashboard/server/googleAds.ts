import { serverEnv } from "@/config/env.server";
import type { AdsCampaign, AdsData, SourceResult } from "../types";
import { AnalyticsError, dateInZone, numeric, readJson, shiftDate, sourceError } from "./shared";

type AdsRow = { customer?: { currencyCode?: string; timeZone?: string }; campaign?: { id?: string; name?: string }; metrics?: { costMicros?: string; conversions?: number } };
function adsFailure(body: Record<string, unknown>, status: number): AnalyticsError {
  const error = body.error as { status?: string; details?: { errors?: { errorCode?: Record<string, string> }[] }[] } | undefined;
  const codes = error?.details?.flatMap(detail => detail.errors?.flatMap(item => Object.values(item.errorCode ?? {})) ?? []) ?? [];
  if (codes.includes("USER_PERMISSION_DENIED")) return new AnalyticsError("USER_PERMISSION_DENIED", "토큰을 승인한 Google 계정이 이 광고 계정에 접근할 수 없습니다. GOOGLE_ADS_CUSTOMER_ID를 확인하고, MCC를 통한 접근이면 GOOGLE_ADS_LOGIN_CUSTOMER_ID에 관리자 계정 ID를 설정하세요.");
  if (codes.includes("CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION") || codes.includes("ACTION_NOT_PERMITTED")) return new AnalyticsError("API_ACCESS_REQUIRED", "Google Cloud 프로젝트의 Google Ads API 운영 계정 접근 권한(Explorer 이상)을 확인하세요.");
  return new AnalyticsError("google_ads_failed", `Google Ads 조회가 거절됐습니다. (HTTP ${status}) 계정 접근 권한과 API 사용 설정을 확인하세요.`);
}
export async function loadGoogleAds(): Promise<SourceResult<AdsData>> {
  try {
    const config = serverEnv.googleAds;
    if (!/^\d{10}$/.test(config.customerId) || (config.loginCustomerId && !/^\d{10}$/.test(config.loginCustomerId))) throw new AnalyticsError("invalid_customer_id", "Google Ads 계정 ID는 하이픈을 제외한 10자리 숫자여야 합니다.");
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000), body: new URLSearchParams({ grant_type: "refresh_token", client_id: config.clientId, client_secret: config.clientSecret, refresh_token: config.refreshToken }) });
    const token = await readJson(tokenResponse);
    if (!tokenResponse.ok || typeof token.access_token !== "string") {
      const invalidGrant = token.error === "invalid_grant";
      throw new AnalyticsError(invalidGrant ? "invalid_grant" : "oauth_failed", invalidGrant ? "Google Refresh Token이 만료되었거나 취소됐습니다. 같은 OAuth 클라이언트로 토큰을 다시 발급하세요. 테스트 상태에서 발급한 토큰은 7일 후 만료될 수 있습니다." : "Google OAuth 인증에 실패했습니다. Client ID·Client Secret·Refresh Token이 같은 클라이언트에서 발급됐는지 확인하세요.");
    }
    const headers: Record<string, string> = { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" };
    if (config.loginCustomerId) headers["login-customer-id"] = config.loginCustomerId;
    async function query(query: string): Promise<AdsRow[]> {
      const rows: AdsRow[] = []; let pageToken: string | undefined;
      for (let page = 0; page < 10; page++) {
        const response = await fetch(`https://googleads.googleapis.com/v25/customers/${config.customerId}/googleAds:search`, { method: "POST", headers, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000), body: JSON.stringify({ query, ...(pageToken ? { pageToken } : {}) }) });
        const body = await readJson(response);
        if (!response.ok) throw adsFailure(body, response.status);
        if (body.results !== undefined && !Array.isArray(body.results)) throw new AnalyticsError("invalid_response", "Google Ads 응답 형식이 올바르지 않습니다.");
        rows.push(...(body.results as AdsRow[] ?? []));
        pageToken = typeof body.nextPageToken === "string" ? body.nextPageToken : undefined;
        if (!pageToken) return rows;
      }
      throw new AnalyticsError("too_many_results", "캠페인 조회량이 많아 집계를 완료하지 못했습니다.");
    }
    const account = (await query("SELECT customer.currency_code, customer.time_zone FROM customer LIMIT 1"))[0]?.customer;
    if (!account?.currencyCode || !account.timeZone) throw new AnalyticsError("invalid_response", "광고 계정의 통화·시간대를 조회하지 못했습니다.");
    const today = dateInZone(new Date(), account.timeZone); const start = shiftDate(today, -30); const end = shiftDate(today, -1);
    const rows = await query(`SELECT campaign.id, campaign.name, metrics.cost_micros, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${start}' AND '${end}'`);
    const campaigns: AdsCampaign[] = rows.map(row => {
      if (!row.campaign?.id || !row.campaign.name) throw new AnalyticsError("invalid_response", "캠페인 정보를 읽을 수 없습니다.");
      const cost = numeric(row.metrics?.costMicros ?? 0) / 1e6; const conversions = numeric(row.metrics?.conversions ?? 0);
      return { id: row.campaign.id, name: row.campaign.name, cost, conversions, cpa: conversions > 0 ? cost / conversions : null };
    }).sort((a, b) => b.cost - a.cost);
    const cost = campaigns.reduce((sum, row) => sum + row.cost, 0); const conversions = campaigns.reduce((sum, row) => sum + row.conversions, 0);
    return { status: "success", fetchedAt: new Date().toISOString(), data: { start, end, currency: account.currencyCode, timezone: account.timeZone, campaigns, cost, conversions, cpa: conversions > 0 ? cost / conversions : null } };
  } catch (error) { return sourceError(error); }
}
