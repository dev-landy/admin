import { act, fireEvent, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import ContractReviewPage from "@/app/(admin)/contract-documents/[documentId]/page";

let mockQuery = "";
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }), useSearchParams: () => new URLSearchParams(mockQuery) }));
jest.mock("@/features/contract-ocr/api", () => ({ fetchContractDocuments: jest.fn() }));
jest.mock("@/features/contract-ocr/components/ContractDocumentReview", () => ({
  ContractDocumentReview: ({ documentId, onBack, continuation }: { documentId: string; onBack: () => void; continuation: { returnPath: string; position: number } }) =>
    <div data-testid="review" data-return-path={continuation.returnPath} data-position={continuation.position}>{documentId}<button onClick={onBack}>목록으로</button></div>,
}));
beforeEach(() => { mockPush.mockClear(); mockQuery = ""; });
async function renderPage() {
  const params = Promise.resolve({ documentId: "document-1" });
  await act(async () => {
    render(<Suspense fallback="loading"><ContractReviewPage params={params} /></Suspense>);
    await params;
  });
}

test("완료 탭의 상세에서 원래 탭·페이지·행 수로 복귀한다", async () => {
  mockQuery = new URLSearchParams({ returnTo: "/contract-documents?status=completed&page=3&size=50", position: "8" }).toString();
  await renderPage();
  expect(screen.getByTestId("review")).toHaveAttribute("data-position", "8");
  fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
  expect(mockPush).toHaveBeenCalledWith("/contract-documents?status=completed&page=3&size=50");
});

test("외부 반환 주소를 전달해도 계약서 목록으로만 복귀한다", async () => {
  mockQuery = new URLSearchParams({ returnTo: "javascript:alert(1)", position: "-1" }).toString();
  await renderPage();
  expect(screen.getByTestId("review")).toHaveAttribute("data-position", "0");
  fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
  expect(mockPush).toHaveBeenCalledWith("/contract-documents");
});

test("기존 from=completed 상세 링크도 완료 목록 복귀를 유지한다", async () => {
  mockQuery = "from=completed";
  await renderPage();
  fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
  expect(mockPush).toHaveBeenCalledWith("/contract-documents?status=completed");
});
