import { contractListReturnPath, contractReviewPath, contractReviewPosition, findNextPendingContract } from "@/features/contract-ocr/navigation";
import { fetchContractDocuments } from "@/features/contract-ocr/api";
import { DOCUMENT } from "@/test-utils/contractDocumentFixtures";

jest.mock("@/features/contract-ocr/api", () => ({ fetchContractDocuments: jest.fn() }));
const fetchDocuments = jest.mocked(fetchContractDocuments);
beforeEach(() => jest.resetAllMocks());

test("원래 목록 쿼리를 유지하고 외부 URL과 알려지지 않은 내부 경로를 거부한다", () => {
  expect(contractListReturnPath("/contract-ocr?status=completed&page=3&size=50&uploadId=upload-1")).toBe("/contract-ocr?status=completed&page=3&size=50&uploadId=upload-1");
  for (const path of ["https://evil.test/contract-ocr", "//evil.test/contract-ocr", "javascript:alert(1)", "/\\evil.test", "/users", "/contract-ocr/../users", "/contract-ocr%2F..%2Fusers", "/contract-ocr\n"]) {
    expect(contractListReturnPath(path)).toBe("/contract-ocr");
  }
  expect(contractListReturnPath(null, true)).toBe("/contract-ocr?status=completed");
  expect(contractListReturnPath("/contract-ocr?page=-1&size=Infinity&status=bad")).toBe("/contract-ocr?page=1&size=20");
});

test("상세 링크는 목록 위치와 현재 행 위치를 안전하게 전달한다", () => {
  const path = contractReviewPath("document/1", "/contract-ocr?page=2&size=50", 8);
  const url = new URL(path, "https://admin.test");
  expect(url.pathname).toBe("/contract-ocr/document%2F1");
  expect(url.searchParams.get("returnTo")).toBe("/contract-ocr?page=2&size=50");
  expect(url.searchParams.get("position")).toBe("8");
  expect(contractReviewPosition("-1", 20)).toBe(0);
  expect(contractReviewPosition("20", 20)).toBe(0);
});

test("처리 후 현재 페이지 큐를 새로 읽어 같은 행에 당겨진 다음 문서를 선택한다", async () => {
  const next = { ...DOCUMENT, documentId: "next" };
  fetchDocuments.mockResolvedValue({ documents: [{ ...DOCUMENT, documentId: "earlier" }, next], page: 1, size: 50, totalElements: 52 });
  const result = await findNextPendingContract(DOCUMENT.documentId, "/contract-ocr?page=2&size=50", 1);
  expect(fetchDocuments).toHaveBeenCalledWith("PENDING", 2, 50);
  expect(result).toEqual({ document: next, returnPath: "/contract-ocr?page=2&size=50", position: 1 });
});

test("완료 문서가 남아 있는 응답에서는 재검수를 피하고 첫 대기 페이지를 다시 확인한다", async () => {
  const next = { ...DOCUMENT, documentId: "next" };
  fetchDocuments.mockResolvedValueOnce({ documents: [DOCUMENT], page: 0, size: 1, totalElements: 2 })
    .mockResolvedValueOnce({ documents: [next], page: 1, size: 1, totalElements: 2 });
  const result = await findNextPendingContract(DOCUMENT.documentId, "/contract-ocr?size=1", 0);
  expect(fetchDocuments).toHaveBeenNthCalledWith(2, "PENDING", 1, 1);
  expect(result.document?.documentId).toBe("next");
  expect(result.returnPath).toBe("/contract-ocr?size=1&page=1");
});

test("마지막 행 처리로 페이지가 줄어도 남은 문서가 있으면 유효 페이지에서 검수를 이어간다", async () => {
  fetchDocuments.mockResolvedValueOnce({ documents: [], page: 2, size: 20, totalElements: 40 })
    .mockResolvedValueOnce({ documents: [{ ...DOCUMENT, documentId: "earlier" }], page: 1, size: 20, totalElements: 40 });
  expect(await findNextPendingContract(DOCUMENT.documentId, "/contract-ocr?page=3&size=20", 0))
    .toEqual({ document: { ...DOCUMENT, documentId: "earlier" }, returnPath: "/contract-ocr?page=2&size=20", position: 0 });
  expect(fetchDocuments).toHaveBeenNthCalledWith(2, "PENDING", 2, 20);
});

test("현재 위치 뒤에 문서가 없어도 같은 페이지의 앞 미처리 문서로 이어간다", async () => {
  const earlier = { ...DOCUMENT, documentId: "earlier" };
  fetchDocuments.mockResolvedValue({ documents: [earlier], page: 0, size: 20, totalElements: 1 });
  expect(await findNextPendingContract(DOCUMENT.documentId, "/contract-ocr", 19))
    .toEqual({ document: earlier, returnPath: "/contract-ocr", position: 0 });
});

test("다른 관리자가 처리한 후보를 제외하고 재조회한 미처리 문서로 이어간다", async () => {
  const next = { ...DOCUMENT, documentId: "next" };
  fetchDocuments.mockResolvedValueOnce({ documents: [{ ...DOCUMENT, documentId: "claimed", status: "REGISTERED" }], page: 1, size: 20, totalElements: 22 })
    .mockResolvedValueOnce({ documents: [next], page: 0, size: 20, totalElements: 1 });
  expect(await findNextPendingContract(DOCUMENT.documentId, "/contract-ocr?page=2", 0))
    .toEqual({ document: next, returnPath: "/contract-ocr?page=1", position: 0 });
});

test("조회가 불일치해 총 건수가 남았지만 후보가 없으면 전체 완료로 판단하지 않는다", async () => {
  fetchDocuments.mockResolvedValue({ documents: [], page: 0, size: 20, totalElements: 1 });
  await expect(findNextPendingContract(DOCUMENT.documentId, "/contract-ocr", 0)).rejects.toThrow("다음 계약서를 확정하지 못했습니다");
});

test("남은 다음 문서가 없으면 원래 목록으로 돌아가며 조회 실패는 상위 UI로 전달한다", async () => {
  fetchDocuments.mockResolvedValueOnce({ documents: [], page: 0, size: 50, totalElements: 0 });
  expect(await findNextPendingContract(DOCUMENT.documentId, "/contract-ocr?size=50", 0)).toEqual({ returnPath: "/contract-ocr?size=50", position: 0 });
  fetchDocuments.mockRejectedValueOnce(new Error("queue failed"));
  await expect(findNextPendingContract(DOCUMENT.documentId, "/contract-ocr", 0)).rejects.toThrow("queue failed");
});
