import {
  deleteProperty,
  fetchProperties,
  fetchPropertyTenants,
  fetchUserProperties,
  updateProperty,
} from "@/features/properties/api";
import { apiClient } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  apiClient: { get: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockGet = jest.mocked(apiClient.get);
const mockPatch = jest.mocked(apiClient.patch);
const mockDelete = jest.mocked(apiClient.delete);

beforeEach(() => {
  jest.clearAllMocks();
});

test("필터와 페이지 조건으로 전체 건물 목록을 조회한다", async () => {
  const response = { properties: [], page: 1, size: 20, totalElements: 0 };
  mockGet.mockResolvedValue({ data: response });
  const params = { page: 1, size: 20, userId: 3, isDefault: false, keyword: "역삼" };

  await expect(fetchProperties(params)).resolves.toEqual(response);
  expect(mockGet).toHaveBeenCalledWith("/v1/admin/properties", { params });
});

test("유저의 건물과 건물 소속 임차인을 조회한다", async () => {
  mockGet
    .mockResolvedValueOnce({ data: { properties: [] } })
    .mockResolvedValueOnce({ data: { tenants: [], page: 1, size: 20, totalElements: 0 } });

  await fetchUserProperties(7);
  await fetchPropertyTenants(11, { page: 1, size: 20 });

  expect(mockGet).toHaveBeenNthCalledWith(1, "/v1/admin/users/7/properties");
  expect(mockGet).toHaveBeenNthCalledWith(2, "/v1/admin/properties/11/tenants", {
    params: { page: 1, size: 20 },
  });
});

test("건물 정보를 수정한다", async () => {
  const body = { name: "새 건물명", address: "서울시" };
  mockPatch.mockResolvedValue({ data: { propertyId: 11, userId: 7, ...body, isDefault: false } });

  await updateProperty(11, body);

  expect(mockPatch).toHaveBeenCalledWith("/v1/admin/properties/11", body);
});

test("건물 삭제 API를 호출하고 응답 body를 요구하지 않는다", async () => {
  mockDelete.mockResolvedValue({ status: 204 });

  await expect(deleteProperty(11)).resolves.toBeUndefined();
  expect(mockDelete).toHaveBeenCalledWith("/v1/admin/properties/11");
});
