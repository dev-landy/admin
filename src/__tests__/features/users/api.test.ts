import { fetchUserFcmTokens, fetchUserTenants } from "@/features/users/api";
import { apiClient } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({ apiClient: { get: jest.fn() } }));
const mockGet = jest.mocked(apiClient.get);
beforeEach(() => jest.clearAllMocks());

test.each([
  [fetchUserTenants, "tenants"],
  [fetchUserFcmTokens, "fcm-tokens"],
])("사용자 하위 %s 목록에 1-based 페이지를 전달하고 0-based 응답 메타데이터를 보존한다", async (fetch, path) => {
  const response = { page: 2, size: 50, totalElements: 120 };
  mockGet.mockResolvedValue({ data: response });
  await expect(fetch(12, { page: 3, size: 50 })).resolves.toEqual(response);
  expect(mockGet).toHaveBeenCalledWith(`/v1/admin/users/12/${path}`, { params: { page: 3, size: 50 } });
});
