import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fetchLatestContractOcrAnalysis, registerContractDocument, rejectContractDocument, requestContractOcrAnalysis, retryContractStorage } from "@/features/contract-ocr/api";
import { contractDocumentKeys, useLatestContractOcrAnalysis, useRegisterContractDocument, useRejectContractDocument, useRequestContractOcrAnalysis, useRetryContractStorage } from "@/features/contract-ocr/hooks";
import { ANALYSIS, VALUES } from "@/test-utils/contractDocumentFixtures";

jest.mock("@/features/contract-ocr/api", () => ({
  fetchLatestContractOcrAnalysis: jest.fn(), registerContractDocument: jest.fn(), rejectContractDocument: jest.fn(), requestContractOcrAnalysis: jest.fn(), retryContractStorage: jest.fn(),
}));
const mockLatest = jest.mocked(fetchLatestContractOcrAnalysis);
const mockRegister = jest.mocked(registerContractDocument);
const mockReject = jest.mocked(rejectContractDocument);
const mockRequest = jest.mocked(requestContractOcrAnalysis);
const mockStorageRetry = jest.mocked(retryContractStorage);
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}
beforeEach(() => jest.resetAllMocks());
afterEach(() => jest.useRealTimers());

test("등록 후 계약서와 임차인·유저·건물·납부 캐시를 모두 무효화한다", async () => {
  const { client, wrapper } = setup();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  mockRegister.mockResolvedValue({ documentId: "document-1", status: "REGISTERED", tenantId: 9, uploadStatus: "REGISTERED" });
  const { result } = renderHook(() => useRegisterContractDocument(), { wrapper });
  await act(() => result.current.mutateAsync({ documentId: "document-1", values: VALUES }));
  for (const key of ["contract-documents", "tenants", "users", "properties", "payments"]) {
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] });
  }
  client.clear();
});

test.each([true, false])("반려는 notifyUser=%s를 전송하고 계약서 캐시를 무효화한다", async (notifyUser) => {
  const { client, wrapper } = setup();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  mockReject.mockResolvedValue({ documentId: "document-1", status: "REJECTED", uploadStatus: "COMPLETED" });
  const { result } = renderHook(() => useRejectContractDocument(), { wrapper });
  await act(() => result.current.mutateAsync({ documentId: "document-1", reason: "DUPLICATE", notifyUser }));
  expect(mockReject).toHaveBeenCalledWith("document-1", { reason: "DUPLICATE", notifyUser });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: contractDocumentKeys.all });
  client.clear();
});

test("OCR 접수 응답을 캐시에 즉시 반영한다", async () => {
  const { client, wrapper } = setup();
  mockRequest.mockResolvedValue(ANALYSIS);
  const { result } = renderHook(() => useRequestContractOcrAnalysis(), { wrapper });
  await act(() => result.current.mutateAsync("document-1"));
  expect(client.getQueryData(contractDocumentKeys.analysis("document-1"))).toEqual(ANALYSIS);
  client.clear();
});

test.each([null, "SUCCEEDED", "FAILED", "TIMED_OUT"] as const)("분석 상태 %s는 반복 조회하지 않는다", async (status) => {
  jest.useFakeTimers();
  const { client, wrapper } = setup();
  mockLatest.mockResolvedValue(status ? { ...ANALYSIS, status } : null);
  const { result } = renderHook(() => useLatestContractOcrAnalysis("document-1", true), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await act(() => jest.advanceTimersByTimeAsync(12_000));
  expect(mockLatest).toHaveBeenCalledTimes(1);
  client.clear();
});

test("대기/진행 중만 반복 조회하고 완료 응답을 받으면 멈춘다", async () => {
  jest.useFakeTimers();
  const { client, wrapper } = setup();
  mockLatest.mockResolvedValueOnce(ANALYSIS).mockResolvedValueOnce({ ...ANALYSIS, status: "PROCESSING" }).mockResolvedValue({ ...ANALYSIS, status: "SUCCEEDED", values: VALUES });
  const { result } = renderHook(() => useLatestContractOcrAnalysis("document-1", true), { wrapper });
  await waitFor(() => expect(result.current.data?.status).toBe("QUEUED"));
  await act(() => jest.advanceTimersByTimeAsync(3_100));
  expect(result.current.data?.status).toBe("PROCESSING");
  await act(() => jest.advanceTimersByTimeAsync(3_100));
  expect(result.current.data?.status).toBe("SUCCEEDED");
  await act(() => jest.advanceTimersByTimeAsync(12_000));
  expect(mockLatest).toHaveBeenCalledTimes(3);
  client.clear();
});

test.each([false, true])("미완료 작업 회수 실패 여부=%s에서도 영향받은 캐시를 갱신하고 POST를 자동 재시도하지 않는다", async (fails) => {
  const { client, wrapper } = setup();
  // 앱의 기본 재시도 설정이 있어도 응답 유실 후 전역 회수를 반복하면 안 된다.
  client.setDefaultOptions({ queries: { retry: false }, mutations: { retry: 2, retryDelay: 0 } });
  const affectedKeys = ["contract-documents", "tenants", "users", "properties", "payments", "notifications"];
  for (const key of affectedKeys) client.setQueryData([key, "recovery-test"], { before: true });
  if (fails) mockStorageRetry.mockRejectedValue(new Error("response lost"));
  else mockStorageRetry.mockResolvedValue({ attempted: 0 });
  const { result } = renderHook(() => useRetryContractStorage(), { wrapper });
  await act(async () => {
    if (fails) await expect(result.current.mutateAsync()).rejects.toThrow("response lost");
    else await result.current.mutateAsync();
  });
  expect(mockStorageRetry).toHaveBeenCalledTimes(1);
  for (const key of affectedKeys) expect(client.getQueryState([key, "recovery-test"])?.isInvalidated).toBe(true);
  client.clear();
});
