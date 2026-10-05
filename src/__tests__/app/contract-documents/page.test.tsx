import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ContractOcrPage from "@/app/(admin)/contract-documents/page";
import { useContractDocuments } from "@/features/contract-ocr/hooks";
import { DOCUMENT } from "@/test-utils/contractDocumentFixtures";

let mockQuery = "page=2&size=50";
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
jest.mock("next/navigation", () => ({ useRouter: () => mockRouter, useSearchParams: () => new URLSearchParams(mockQuery) }));
jest.mock("@/features/contract-ocr/hooks", () => ({ useContractDocuments: jest.fn() }));
jest.mock("@/features/contract-ocr/components/ContractStorageRetriesButton", () => ({ ContractStorageRetriesButton: () => null }));
jest.mock("@/features/contract-ocr/api", () => ({ fetchContractDocuments: jest.fn() }));
const useDocuments = jest.mocked(useContractDocuments);
beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = "page=2&size=50";
  useDocuments.mockReturnValue({ data: { documents: [DOCUMENT], page: 1, size: 50, totalElements: 51 }, isLoading: false, error: null, refetch: jest.fn(), isRefetching: false } as unknown as ReturnType<typeof useContractDocuments>);
});

test("검수 링크에 원래 목록 페이지와 행 수를 전달한다", () => {
  render(<ContractOcrPage />);
  expect(useDocuments).toHaveBeenCalledWith("PENDING", 2, 50);
  fireEvent.click(screen.getByRole("button", { name: "검수" }));
  const url = new URL(mockPush.mock.calls[0][0], "https://admin.test");
  expect(url.searchParams.get("returnTo")).toBe("/contract-documents?page=2&size=50");
  expect(url.searchParams.get("position")).toBe("0");
});

test("완료 상세의 링크도 탭·페이지·행 수를 그대로 전달한다", () => {
  mockQuery = "status=completed&page=2&size=50";
  render(<ContractOcrPage />);
  fireEvent.click(screen.getByRole("button", { name: "열람" }));
  const url = new URL(mockPush.mock.calls[0][0], "https://admin.test");
  expect(url.searchParams.get("returnTo")).toBe("/contract-documents?status=completed&page=2&size=50");
});

test("처리로 원래 페이지가 사라지면 다른 목록 쿼리를 유지하며 유효 페이지로 보정한다", async () => {
  mockQuery = "status=completed&page=3&size=50&uploadId=upload-1";
  useDocuments.mockReturnValue({ data: { documents: [], page: 2, size: 50, totalElements: 51 }, isLoading: false, error: null, refetch: jest.fn(), isRefetching: false } as unknown as ReturnType<typeof useContractDocuments>);
  render(<ContractOcrPage />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/contract-documents?status=completed&page=2&size=50&uploadId=upload-1"));
});

test("목록 조회 실패에서는 총 건수를 0으로 간주해 페이지를 초기화하지 않는다", () => {
  useDocuments.mockReturnValue({ data: undefined, isLoading: false, error: new Error("failed"), refetch: jest.fn(), isRefetching: false } as unknown as ReturnType<typeof useContractDocuments>);
  render(<ContractOcrPage />);
  expect(screen.getByText("계약서 목록을 불러오지 못했습니다.")).toBeInTheDocument();
  expect(mockReplace).not.toHaveBeenCalled();
});
