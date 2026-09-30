import { apiClient } from "@/lib/api/client";
import {
  fetchContractDocument, fetchContractDocuments, fetchContractDocumentDraft, fetchContractDocumentFiles,
  fetchLatestContractOcrAnalysis, registerContractDocument, rejectContractDocument, requestContractOcrAnalysis,
} from "@/features/contract-ocr/api";
import { ANALYSIS, DOCUMENT, VALUES } from "@/test-utils/contractDocumentFixtures";

jest.mock("@/lib/api/client", () => ({ apiClient: { get: jest.fn(), post: jest.fn() } }));
const mockGet = jest.mocked(apiClient.get);
const mockPost = jest.mocked(apiClient.post);
const base = "/v1/admin/contract-documents";
beforeEach(() => jest.resetAllMocks());

test.each(["PENDING", "COMPLETED"] as const)("목록은 %s 상태와 0-based 페이지를 신규 경로로 전송한다", async (status) => {
  const result = { documents: [DOCUMENT], page: 1, size: 20, totalElements: 21 };
  mockGet.mockResolvedValue({ data: result });
  await expect(fetchContractDocuments(status, 2, 20)).resolves.toEqual(result);
  expect(mockGet).toHaveBeenCalledWith(base, { params: { status, page: 1, size: 20 } });
});

test("문서와 원본 파일은 uploadId, fileId/fileIndex 계약을 그대로 반환한다", async () => {
  mockGet.mockResolvedValueOnce({ data: DOCUMENT });
  await expect(fetchContractDocument("document-1")).resolves.toEqual(DOCUMENT);
  const files = { files: [{ fileId: "file-1", fileIndex: 0, contentType: "image/jpeg", url: "https://example.test/image", expiresAt: "2026-09-30T10:00:00Z" }] };
  mockGet.mockResolvedValueOnce({ data: files });
  await expect(fetchContractDocumentFiles("document-1")).resolves.toEqual(files);
  expect(mockGet.mock.calls.map(([path]) => path)).toEqual([`${base}/document-1`, `${base}/document-1/files`]);
});

test("등록은 values 래퍼 없이 보내고 동기 완료 결과를 반환한다", async () => {
  const result = { documentId: "document-1", status: "REGISTERED", tenantId: 9, uploadStatus: "REGISTERED" };
  mockPost.mockResolvedValue({ status: 200, data: result });
  await expect(registerContractDocument("document-1", VALUES)).resolves.toEqual(result);
  expect(mockPost).toHaveBeenCalledWith(`${base}/document-1/registration`, VALUES);
});

test.each(["UNREADABLE", "NOT_A_CONTRACT", "EXPIRED", "DUPLICATE"] as const)("반려는 선택한 %s 사유를 전달한다", async (reason) => {
  mockPost.mockResolvedValue({ data: { status: "REJECTED" } });
  await rejectContractDocument("document-1", reason);
  expect(mockPost).toHaveBeenCalledWith(`${base}/document-1/rejection`, { reason });
});

test("OCR 요청은 별도 analyses 경로의 202 응답을 반환한다", async () => {
  mockPost.mockResolvedValue({ status: 202, data: ANALYSIS });
  await expect(requestContractOcrAnalysis("document-1")).resolves.toEqual(ANALYSIS);
  expect(mockPost).toHaveBeenCalledWith(`${base}/document-1/ocr-analyses`);
});

test.each([
  ["draft", fetchContractDocumentDraft, { documentId: "document-1", values: VALUES }],
  ["ocr-analyses/latest", fetchLatestContractOcrAnalysis, ANALYSIS],
] as const)("%s는 200과 204를 구분하고 조회 오류를 삼키지 않는다", async (path, fetcher, data) => {
  mockGet.mockResolvedValueOnce({ status: 200, data }).mockResolvedValueOnce({ status: 204, data: "" }).mockRejectedValueOnce(new Error("forbidden"));
  await expect(fetcher("document-1")).resolves.toEqual(data);
  await expect(fetcher("document-1")).resolves.toBeNull();
  await expect(fetcher("document-1")).rejects.toThrow("forbidden");
  expect(mockGet).toHaveBeenCalledWith(`${base}/document-1/${path}`);
});
