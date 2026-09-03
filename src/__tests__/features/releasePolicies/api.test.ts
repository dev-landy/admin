import { fetchReleasePolicies, updateReleasePolicy } from "@/features/releasePolicies/api";
import type { UpdateReleasePolicyRequest } from "@/features/releasePolicies/types";
import { apiClient } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  apiClient: { get: jest.fn(), patch: jest.fn() },
}));

const mockGet = jest.mocked(apiClient.get);
const mockPatch = jest.mocked(apiClient.patch);

const body: UpdateReleasePolicyRequest = {
  latestBuildNumber: 42,
  latestVersion: "1.4.2",
  minSupportedBuildNumber: 30,
  storeUrl: "https://apps.apple.com/app/id123456789",
  forceUpdateTitle: "업데이트가 필요합니다",
  forceUpdateMessage: "계속 사용하려면 최신 버전으로 업데이트하세요.",
  softUpdateTitle: "새 버전이 있습니다",
  softUpdateMessage: "지금 업데이트하면 더 편하게 쓸 수 있습니다.",
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("릴리즈 정책 목록을 조회한다", async () => {
  const response = { releasePolicies: [] };
  mockGet.mockResolvedValue({ data: response });

  await expect(fetchReleasePolicies()).resolves.toEqual(response);
  expect(mockGet).toHaveBeenCalledWith("/v1/admin/release-policies");
});

test("릴리즈 정책을 ID 경로로 수정하고 수정된 정책을 돌려준다", async () => {
  const updated = { appReleasePolicyId: 3, platform: "IOS", channel: "PRODUCTION", ...body };
  mockPatch.mockResolvedValue({ data: updated });

  await expect(updateReleasePolicy(3, body)).resolves.toEqual(updated);
  expect(mockPatch).toHaveBeenCalledWith("/v1/admin/release-policies/3", body);
});
