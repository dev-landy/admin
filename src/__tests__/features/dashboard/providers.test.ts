/** @jest-environment node */
import { loadPosthog } from "@/features/dashboard/server/posthog";
import { loadGoogleAds } from "@/features/dashboard/server/googleAds";
import { posthogResults } from "@/features/dashboard/server/result-cache";
const mockFetch = jest.fn();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(() => {
  posthogResults.clear();
  jest.clearAllMocks(); global.fetch = mockFetch;
  process.env.POSTHOG_HOST = "https://us.posthog.com";
  process.env.POSTHOG_PROJECT_ID = "123"; process.env.POSTHOG_PERSONAL_API_KEY = "phx_secret";
  process.env.GOOGLE_ADS_CLIENT_ID = "client-secret-id"; process.env.GOOGLE_ADS_CLIENT_SECRET = "private-secret";
  process.env.GOOGLE_ADS_REFRESH_TOKEN = "refresh-secret"; process.env.GOOGLE_ADS_CUSTOMER_ID = "123-456-7890";
  delete process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
});
test("capture keys produce actionable errors without network calls or key leakage", async () => {
  process.env.POSTHOG_PERSONAL_API_KEY = "phc_secret";
  const result = await loadPosthog();
  expect(result).toMatchObject({ status: "error", code: "wrong_key_type" });
  expect(JSON.stringify(result)).not.toContain("phc_secret"); expect(mockFetch).not.toHaveBeenCalled();
});
test("query permissions denied have a visible explanation", async () => {
  mockFetch.mockImplementation(async () => json({ code: "permission_denied" }, 403));
  expect(await loadPosthog()).toMatchObject({ status: "error", code: "permission_denied" });
});
test("PostHog retries a gateway timeout once and preserves successful aggregates", async () => {
  let attempts = 0;
  mockFetch.mockImplementation(async (_url, init) => {
    const sql = JSON.parse(init.body).query.query as string;
    if (sql.includes("AS period")) {
      if (++attempts === 1) return new Response("Gateway timeout", { status: 504 });
      return json({ results: [[0,0,0,0],[1,0,0,0],[2,0,0,0],[3,75,0,75]] });
    }
    return json({ results: sql.includes("groupUniqArray") ? [] : [[0,0]] });
  });
  expect(await loadPosthog()).toMatchObject({ status: "success", data: { mau: 75 } });
  expect(attempts).toBe(2);
});
test("persistent PostHog gateway timeouts stop after one retry per query", async () => {
  mockFetch.mockImplementation(async () => new Response("Gateway timeout", { status: 504 }));
  expect(await loadPosthog()).toMatchObject({ status: "error", code: "query_timeout", message: expect.stringContaining("시간") });
  expect(mockFetch).toHaveBeenCalledTimes(6);
});
test("provider bodies and secrets are never echoed from OAuth failures", async () => {
  mockFetch.mockResolvedValue(json({ error: "invalid_grant", error_description: "private-secret refresh-secret" }, 400));
  const result = await loadGoogleAds();
  expect(result).toMatchObject({ status: "error", code: "invalid_grant" });
  expect(JSON.stringify(result)).not.toContain("private-secret"); expect(JSON.stringify(result)).not.toContain("refresh-secret");
});
test("Ads permission error points to account and MCC configuration", async () => {
  mockFetch.mockResolvedValueOnce(json({ access_token: "token-secret" })).mockResolvedValueOnce(json({ error: { details: [{ errors: [{ errorCode: { authorizationError: "USER_PERMISSION_DENIED" } }] }] } }, 403));
  expect(await loadGoogleAds()).toMatchObject({ status: "error", code: "USER_PERMISSION_DENIED", message: expect.stringContaining("GOOGLE_ADS_LOGIN_CUSTOMER_ID") });
});
test("Ads preserves currency, decimal conversions, zero-denominator CPA and forwards MCC", async () => {
  process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID = "987-654-3210";
  mockFetch.mockResolvedValueOnce(json({ access_token: "token-secret" }))
    .mockResolvedValueOnce(json({ results: [{ customer: { currencyCode: "USD", timeZone: "America/Los_Angeles" } }] }))
    .mockResolvedValueOnce(json({ results: [
      { campaign: { id: "1", name: "Test A" }, metrics: { costMicros: "2500000", conversions: 0.5 } },
      { campaign: { id: "2", name: "Test B" }, metrics: { costMicros: "1000000", conversions: 0 } },
    ] }));
  const result = await loadGoogleAds();
  expect(result).toMatchObject({ status: "success", data: { currency: "USD", cost: 3.5, conversions: 0.5, cpa: 7 } });
  if (result.status === "success") expect(result.data.campaigns[1].cpa).toBeNull();
  expect(mockFetch.mock.calls[1][1].headers["login-customer-id"]).toBe("9876543210");
  expect(mockFetch.mock.calls[2][0]).toContain("customers/1234567890");
});
test("PostHog zero history produces null retention, not a fake zero percent", async () => {
  mockFetch.mockImplementation(async (_url, init) => {
    const sql = JSON.parse(init.body).query.query as string;
    if (sql.includes("AS period")) return json({ results: [[0,0,0,0],[1,0,0,0],[2,0,0,0],[3,0,0,0]] });
    if (sql.includes("groupUniqArray")) return json({ results: [] });
    return json({ results: [[0,0]] });
  });
  expect(await loadPosthog()).toMatchObject({ status: "success", data: { mau: 0, retention: { rate: null, base: 0 }, cohorts: [] } });
});

test("cohorts distinguish observed zero retention from incomplete and future weeks", async () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-13T03:00:00Z"));
  try {
    mockFetch.mockImplementation(async (_url, init) => {
      const sql = JSON.parse(init.body).query.query as string;
      if (sql.includes("AS period")) return json({ results: [[0,10,8,5],[1,20,15,8],[2,30,20,15],[3,40,30,20]] });
      if (sql.includes("groupUniqArray")) return json({ results: [["2026-09-28",10,0,0,0],["2026-10-05",20,0,0,0]] });
      return json({ results: [[20,10]] });
    });
    const result = await loadPosthog();
    expect(result).toMatchObject({ status: "success", data: { start: "2026-09-13", end: "2026-10-12", mau: 40, previousMau: 30, retention: { rate: 50, from: "2026-09-28", to: "2026-10-05" }, cohorts: [{ week: "2026-09-28", values: [100,0,"집계 중","—"] }, { week: "2026-10-05", values: [100,"집계 중","—","—"] }] } });
  } finally { jest.useRealTimers(); }
});

 test.each(["2026-10-11T14:59:59Z", "2026-10-11T15:00:00Z"])("weekly retention uses KST Monday boundaries at %s", async now => {
  jest.useFakeTimers().setSystemTime(new Date(now));
  try {
    mockFetch.mockImplementation(async (_url, init) => {
      const sql = JSON.parse(init.body).query.query as string;
      if (sql.includes("AS period")) return json({ results: [[0,0,0,0],[1,0,0,0],[2,0,0,0],[3,0,0,0]] });
      if (sql.includes("groupUniqArray")) return json({ results: [] });
      const monday = now.includes("14:59") ? "2026-10-05" : "2026-10-12";
      expect(sql).toContain(`timestamp < toDateTime('${monday} 00:00:00', 'Asia/Seoul')`);
      return json({ results: [[10,5]] });
    });
    const result = await loadPosthog();
    expect(result).toMatchObject({ status: "success", data: { retention: { rate: 50, from: now.includes("14:59") ? "2026-09-21" : "2026-09-28", to: now.includes("14:59") ? "2026-09-28" : "2026-10-05" } } });
  } finally { jest.useRealTimers(); }
});

test('retention-only requests do not execute MAU queries', async () => {
  mockFetch.mockImplementation(async (_url, init) => {
    const sql = JSON.parse(init.body).query.query as string;
    if (sql.includes('AS period')) throw new Error('MAU must not be requested');
    return json({ results: sql.includes('groupUniqArray') ? [] : [[10,5]] });
  });
  expect(await loadPosthog(undefined, 'retention')).toMatchObject({ status: 'success', data: { retention: { rate: 50 } } });
  expect(mockFetch).toHaveBeenCalledTimes(2);
});
test('activity-only requests do not execute retention queries', async () => {
  mockFetch.mockImplementation(async (_url, init) => {
    if (!JSON.parse(init.body).query.query.includes('AS period')) throw new Error('Retention must not be requested');
    return json({ results: [[0,1,1,1],[1,2,2,2],[2,3,3,3],[3,4,4,4]] });
  });
  expect(await loadPosthog(undefined, 'activity')).toMatchObject({ status: 'success', data: { mau: 4 } });
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

test('sparse activity periods are zero-filled after a single event scan', async () => {
 mockFetch.mockResolvedValue(json({results:[[3,12,8,7]]}));
 expect(await loadPosthog(undefined,'activity')).toMatchObject({status:'success', data:{mau:12,previousMau:0,activity:[{all:0},{all:0},{all:0},{all:12}]}});
 const sql = JSON.parse(mockFetch.mock.calls[0][1].body).query.query;
 expect(sql).not.toContain('UNION ALL');
 expect(sql.match(/FROM events/g)).toHaveLength(1);
});
test('duplicate activity buckets are rejected instead of silently losing counts', async () => {
 mockFetch.mockResolvedValue(json({results:[[3,12,8,7],[3,12,8,7]]}));
 expect(await loadPosthog(undefined,'activity')).toMatchObject({status:'error',code:'invalid_response'});
});
test('cached activity is isolated by project and preserves its fetch time', async () => {
 mockFetch.mockImplementation(async () => json({results:[[3,12,8,7]]}));
 const first = await loadPosthog(undefined,'activity');
 expect(await loadPosthog(undefined,'activity')).toEqual(first);
 expect(mockFetch).toHaveBeenCalledTimes(1);
 process.env.POSTHOG_PROJECT_ID = '456';
 await loadPosthog(undefined,'activity');
 expect(mockFetch).toHaveBeenCalledTimes(2);
});
