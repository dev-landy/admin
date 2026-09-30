import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { fetchLatestContractOcrAnalysis, registerContractDocument, requestContractOcrAnalysis } from "@/features/contract-ocr/api";
import { contractDocumentKeys, useLatestContractOcrAnalysis, useRegisterContractDocument, useRequestContractOcrAnalysis } from "@/features/contract-ocr/hooks";
import { ANALYSIS, VALUES } from "@/test-utils/contractDocumentFixtures";

jest.mock("@/features/contract-ocr/api", () => ({
  fetchLatestContractOcrAnalysis: jest.fn(), registerContractDocument: jest.fn(), requestContractOcrAnalysis: jest.fn(),
}));
const mockLatest = jest.mocked(fetchLatestContractOcrAnalysis);
const mockRegister = jest.mocked(registerContractDocument);
const mockRequest = jest.mocked(requestContractOcrAnalysis);
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}
beforeEach(() => jest.resetAllMocks());
afterEach(() => jest.useRealTimers());

test("등록 후 계약서와 임차인·유저·건물 캐시를 모두 무효화한다", async () => {
  const { client, wrapper } = setup();
  const invalidate = jest.spyOn(client, "invalidateQueries");
  mockRegister.mockResolvedValue({ documentId: "document-1", status: "REGISTERED", tenantId: 9, uploadStatus: "REGISTERED" });
  const { result } = renderHook(() => useRegisterContractDocument(), { wrapper });
  await act(() => result.current.mutateAsync({ documentId: "document-1", values: VALUES }));
  for (const key of ["contract-documents", "tenants", "users", "properties"]) {
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [key] });
  }
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
