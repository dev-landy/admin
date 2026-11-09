import { apiClient } from "@/lib/api/client";
import { fetchSubscription, grantSubscription, reconcileSubscription, revokeSubscriptionGrant } from "@/features/subscriptions/api";
jest.mock("@/lib/api/client", () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));

test("배포된 관리자 계약을 사용하며 지급 멱등 키와 회수 대상·환경을 보존한다", async () => {
  jest.mocked(apiClient.get).mockResolvedValue({ data: { userId: 7 } });
  jest.mocked(apiClient.post).mockResolvedValue({ data: { grantId: 3 } });
  expect(await fetchSubscription(7)).toEqual({ userId: 7 });
  const request = { permanent: false, expiresAt: "2099-01-01T00:00:00Z", reason: "지원" };
  await grantSubscription(7, { request, requestKey: "same-request" });
  expect(apiClient.post).toHaveBeenCalledWith("/v1/admin/users/7/subscription/grants", request, { headers: { "Idempotency-Key": "same-request" } });
  await revokeSubscriptionGrant(7, 3, "종료");
  expect(apiClient.post).toHaveBeenCalledWith("/v1/admin/users/7/subscription/grants/3/revoke", { reason: "종료" });
  await reconcileSubscription(7, "SANDBOX");
  expect(apiClient.post).toHaveBeenCalledWith("/v1/admin/users/7/subscription/reconcile", { environment: "SANDBOX" });
});
