import "@/test-utils/antd";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ContractDocumentCompletion } from "@/features/contract-ocr/components/ContractDocumentCompletion";
import { findNextPendingContract } from "@/features/contract-ocr/navigation";
import { DOCUMENT } from "@/test-utils/contractDocumentFixtures";

jest.mock("@/features/contract-ocr/navigation", () => ({
  ...jest.requireActual("@/features/contract-ocr/navigation"),
  findNextPendingContract: jest.fn(),
}));
const mockFindNext = jest.mocked(findNextPendingContract);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
type NextContract = Awaited<ReturnType<typeof findNextPendingContract>>;
const returnPath = "/contract-documents?page=2&userId=12&propertyId=8&createdFrom=2026-10-01";
const next: NextContract = {
  document: { ...DOCUMENT, documentId: "next-document" }, returnPath, position: 1,
};
function completion(onNavigate = jest.fn()) {
  return <ContractDocumentCompletion status="REGISTERED" documentId={DOCUMENT.documentId}
    returnPath={returnPath} position={1} onNavigate={onNavigate} onBack={jest.fn()} />;
}
beforeEach(() => jest.clearAllMocks());

test("다음 계약서 조회는 한 번만 실행하고 현재 검수 화면의 완료에서만 이동한다", async () => {
  const request = deferred<NextContract>();
  mockFindNext.mockReturnValue(request.promise);
  const navigate = jest.fn();
  render(completion(navigate));
  const button = screen.getByRole("button", { name: "다음 계약서 검수" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(mockFindNext).toHaveBeenCalledTimes(1);
  expect(mockFindNext).toHaveBeenCalledWith(DOCUMENT.documentId, returnPath, 1);
  await act(async () => { request.resolve(next); });
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(navigate.mock.calls[0][0]).toContain("/contract-documents/next-document?");
  expect(new URL(navigate.mock.calls[0][0], "https://admin.test").searchParams.get("returnTo")).toBe(returnPath);
});

test("검수 화면을 떠난 이전 조회가 새 검수 화면을 이동시키거나 잠금을 해제하지 않는다", async () => {
  const oldRequest = deferred<NextContract>();
  const currentRequest = deferred<NextContract>();
  mockFindNext.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(currentRequest.promise);
  const oldNavigate = jest.fn();
  const old = render(completion(oldNavigate));
  fireEvent.click(screen.getByRole("button", { name: "다음 계약서 검수" }));
  old.unmount();
  const currentNavigate = jest.fn();
  render(completion(currentNavigate));
  fireEvent.click(screen.getByRole("button", { name: "다음 계약서 검수" }));
  await act(async () => { oldRequest.resolve(next); });
  expect(oldNavigate).not.toHaveBeenCalled();
  expect(currentNavigate).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "목록으로" })).toBeDisabled();
  await act(async () => { currentRequest.resolve(next); });
  expect(currentNavigate).toHaveBeenCalledTimes(1);
});

test("현재 화면의 조회 실패는 처리 성공을 유지하며 다시 조회할 수 있다", async () => {
  mockFindNext.mockRejectedValueOnce(new Error("queue failed")).mockResolvedValueOnce(next);
  const navigate = jest.fn();
  render(completion(navigate));
  fireEvent.click(screen.getByRole("button", { name: "다음 계약서 검수" }));
  expect(await screen.findByText("처리는 완료되었습니다 · 다음 계약서 조회 실패")).toBeInTheDocument();
  expect(screen.getByText("임차인 등록이 완료되었습니다.")).toBeInTheDocument();
  const retry = await screen.findByRole("button", { name: /다음 계약서 다시 조회$/ });
  await waitFor(() => expect(retry).not.toHaveClass("ant-btn-loading"));
  expect(screen.getByRole("button", { name: "목록으로" })).toBeEnabled();
  fireEvent.click(retry);
  await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
  expect(screen.queryByText("처리는 완료되었습니다 · 다음 계약서 조회 실패")).not.toBeInTheDocument();
  expect(mockFindNext).toHaveBeenCalledTimes(2);
});
