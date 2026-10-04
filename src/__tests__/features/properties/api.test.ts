import {
  deleteProperty,
  fetchProperties,
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
  const params = { page: 1, size: 20, userId: 3, keyword: "역삼" };

  await expect(fetchProperties(params)).resolves.toEqual(response);
  expect(mockGet).toHaveBeenCalledWith("/v1/admin/properties", { params });
});

test("주소 삭제는 명시 clearAddress 값으로 요청한다", async () => {
  const body = { name: "건물", clearAddress: true };
  mockPatch.mockResolvedValue({ data: { propertyId: 11, userId: 7, name: "건물", address: null } });
  await updateProperty(11, body);
  expect(mockPatch).toHaveBeenCalledWith("/v1/admin/properties/11", body);
});

test("건물 삭제 API를 호출하고 응답 body를 요구하지 않는다", async () => {
  mockDelete.mockResolvedValue({ status: 204 });

  await expect(deleteProperty(11)).resolves.toBeUndefined();
  expect(mockDelete).toHaveBeenCalledWith("/v1/admin/properties/11");
});
