import {
  deleteProperty,
  fetchProperties,
  geocodeProperties,
  updateProperty,
} from "@/features/properties/api";
import { apiClient } from "@/lib/api/client";

jest.mock("@/lib/api/client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockGet = jest.mocked(apiClient.get);
const mockPost = jest.mocked(apiClient.post);
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

test("전체 건물 좌표 조회는 본문과 시간 제한 없이 요청하고 처리 집계를 반환한다", async () => {
  const response = {
    targetCount: 25,
    attemptedCount: 25,
    updatedCount: 23,
    skippedCount: 1,
    failedCount: 1,
    stopReason: "EXHAUSTED",
    failures: [{ propertyId: 125, reason: "AMBIGUOUS_ADDRESS" }],
  };
  mockPost.mockResolvedValue({ data: response });

  await expect(geocodeProperties()).resolves.toEqual(response);
  expect(mockPost).toHaveBeenCalledWith("/v1/admin/properties/geocoding", undefined, { timeout: 0 });
});

test("건물 삭제 API를 호출하고 응답 body를 요구하지 않는다", async () => {
  mockDelete.mockResolvedValue({ status: 204 });

  await expect(deleteProperty(11)).resolves.toBeUndefined();
  expect(mockDelete).toHaveBeenCalledWith("/v1/admin/properties/11");
});
