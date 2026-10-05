import { fetchDuplicates } from "@/features/payments/api";
import { apiClient } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({ apiClient: { get: jest.fn() } }));
const get = jest.mocked(apiClient.get);
beforeEach(() => jest.clearAllMocks());

test("실제 서버의 중복 그룹 두 건과 페이지 정보를 보존하며 임차인 조회 조건을 전달하고 이전 응답도 수용한다", async () => {
  const groups = [
    { tenantId: 7, billingMonth: "2026-10-01", count: 2, paymentIds: [90, 91] },
    { tenantId: 7, billingMonth: "2026-11-01", count: 3, paymentIds: [92, 93, 94] },
  ];
  const metadata = { page: 1, size: 20, totalElements: 22 };
  const params = { page: 2, size: 20, tenantId: 7 };
  get.mockResolvedValueOnce({ data: { groups, ...metadata } })
    .mockResolvedValueOnce({ data: { duplicates: groups, ...metadata } });

  await expect(fetchDuplicates(params)).resolves.toEqual({ duplicates: groups, ...metadata });
  expect(get).toHaveBeenNthCalledWith(1, "/v1/admin/payments/duplicates", { params });
  await expect(fetchDuplicates(params)).resolves.toEqual({ duplicates: groups, ...metadata });
  expect(get).toHaveBeenNthCalledWith(2, "/v1/admin/payments/duplicates", { params });
});
