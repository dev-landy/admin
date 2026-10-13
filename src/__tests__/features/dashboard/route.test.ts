/** @jest-environment node */
import { GET } from "@/app/api/dashboard/route";
import { loadPosthog } from "@/features/dashboard/server/posthog";
import { loadGoogleAds } from "@/features/dashboard/server/googleAds";
jest.mock("@/features/dashboard/server/posthog", () => ({ loadPosthog: jest.fn() }));
jest.mock("@/features/dashboard/server/googleAds", () => ({ loadGoogleAds: jest.fn() }));
const mockFetch = jest.fn();
beforeEach(() => { jest.clearAllMocks(); global.fetch = mockFetch; });
test("unauthenticated requests cannot query analytics", async () => {
  const response = await GET(new Request("https://admin.test/api/dashboard?source=posthog"));
  expect(response.status).toBe(401); expect(mockFetch).not.toHaveBeenCalled(); expect(loadPosthog).not.toHaveBeenCalled();
});
test("backend role denial prevents secret-bearing provider requests", async () => {
  mockFetch.mockResolvedValue(new Response("{}", { status: 403 }));
  const response = await GET(new Request("https://admin.test/api/dashboard?source=posthog", { headers: { Authorization: "Bearer user-token" } }));
  expect(response.status).toBe(403); expect(loadPosthog).not.toHaveBeenCalled(); expect(loadGoogleAds).not.toHaveBeenCalled();
});
test("authenticated admins receive provider results without response caching", async () => {
  mockFetch.mockResolvedValue(new Response("{}", { status: 200 }));
  jest.mocked(loadPosthog).mockResolvedValue({ status: "error", code: "authentication_failed", message: "Personal API Key를 확인하세요." });
  const response = await GET(new Request("https://admin.test/api/dashboard?source=posthog", { headers: { Authorization: "Bearer admin-token" } }));
  expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toContain("no-store");
  expect(await response.json()).toMatchObject({ status: "error", code: "authentication_failed" });
  expect(loadPosthog).toHaveBeenCalledTimes(1); expect(loadGoogleAds).not.toHaveBeenCalled();
});

test("selected retention range is forwarded after admin authorization", async () => {
 mockFetch.mockResolvedValue(new Response("{}", { status: 200 }));
 await GET(new Request("https://admin.test/api/dashboard?source=retention&retentionStart=2026-08-01&retentionEnd=2026-08-31", { headers: { Authorization: "Bearer admin-token" } }));
 expect(loadPosthog).toHaveBeenCalledWith({ start: "2026-08-01", end: "2026-08-31" }, "retention");
});
test("malformed retention dates never reach provider SQL", async () => {
 const response = await GET(new Request("https://admin.test/api/dashboard?source=retention&retentionStart=bad&retentionEnd=2026-08-31", { headers: { Authorization: "Bearer admin-token" } }));
 expect(response.status).toBe(400); expect(loadPosthog).not.toHaveBeenCalled();
});
