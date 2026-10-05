import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ContractOcrPage from "@/app/(admin)/contract-documents/page";
import { useContractDocuments } from "@/features/contract-ocr/hooks";
import { DOCUMENT } from "@/test-utils/contractDocumentFixtures";
import { App, ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fetchTenants } from "@/features/tenants/api";

let mockQuery = "page=2&size=50";
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
jest.mock("next/navigation", () => ({ useRouter: () => mockRouter, useSearchParams: () => new URLSearchParams(mockQuery) }));
jest.mock("@/features/contract-ocr/hooks", () => ({ useContractDocuments: jest.fn() }));
jest.mock("@/features/contract-ocr/components/ContractStorageRetriesButton", () => ({ ContractStorageRetriesButton: () => null }));
jest.mock("@/features/contract-ocr/api", () => ({ fetchContractDocuments: jest.fn() }));
jest.mock("@/features/users/api", () => ({ fetchUser: jest.fn(async (userId: number) => ({ userId, email: `user${userId}@example.com` })), fetchUsers: jest.fn(async ({ keyword, userId }: { keyword?: string; userId?: number }) => ({ users: [7, 12, 19].filter((id) => userId !== undefined ? id === userId : !keyword || String(id) === keyword).map((userId) => ({ userId, email: `user${userId}@example.com`, phone: "010-****-1234" })) })) }));
jest.mock("@/features/tenants/api", () => ({ fetchTenant: jest.fn(async (tenantId: number) => ({ tenantId, name: "임차인", roomNumber: "101" })), fetchTenants: jest.fn(async () => ({ tenants: [] })) }));
jest.mock("@/features/properties/api", () => ({ fetchProperties: jest.fn(async ({ propertyId, userId }: { propertyId?: number; userId?: number }) => ({ properties: propertyId ? [{ propertyId, userId, name: "신관", address: null }] : [] })) }));
const useDocuments = jest.mocked(useContractDocuments);
const emptyFilters = { userId: undefined, propertyId: undefined, tenantId: undefined, uploadId: undefined, documentStatus: undefined, createdFrom: undefined, createdTo: undefined, updatedFrom: undefined, updatedTo: undefined };
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<ContractOcrPage />, { wrapper: ({ children }) => <QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App>{children}</App></ConfigProvider></QueryClientProvider> });
}
beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = "page=2&size=50";
  useDocuments.mockReturnValue({ data: { documents: [DOCUMENT], page: 1, size: 50, totalElements: 51 }, isLoading: false, error: null, refetch: jest.fn(), isRefetching: false } as unknown as ReturnType<typeof useContractDocuments>);
});

test("검수 링크에 원래 목록 페이지와 행 수를 전달한다", () => {
  renderPage();
  expect(useDocuments).toHaveBeenCalledWith("PENDING", 2, 50, emptyFilters);
  fireEvent.click(screen.getByRole("button", { name: "검수" }));
  const url = new URL(mockPush.mock.calls[0][0], "https://admin.test");
  expect(url.searchParams.get("returnTo")).toBe("/contract-documents?page=2&size=50");
  expect(url.searchParams.get("position")).toBe("0");
});

test("완료 상세의 링크도 탭·페이지·행 수를 그대로 전달한다", () => {
  mockQuery = "status=completed&page=2&size=50";
  renderPage();
  fireEvent.click(screen.getByRole("button", { name: "열람" }));
  const url = new URL(mockPush.mock.calls[0][0], "https://admin.test");
  expect(url.searchParams.get("returnTo")).toBe("/contract-documents?status=completed&page=2&size=50");
});

test("처리로 원래 페이지가 사라지면 다른 목록 쿼리를 유지하며 유효 페이지로 보정한다", async () => {
  mockQuery = "status=completed&page=3&size=50&uploadId=upload-1";
  useDocuments.mockReturnValue({ data: { documents: [], page: 2, size: 50, totalElements: 51 }, isLoading: false, error: null, refetch: jest.fn(), isRefetching: false } as unknown as ReturnType<typeof useContractDocuments>);
  renderPage();
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/contract-documents?status=completed&page=2&size=50&uploadId=upload-1"));
});

test("목록 조회 실패에서는 총 건수를 0으로 간주해 페이지를 초기화하지 않는다", () => {
  useDocuments.mockReturnValue({ data: undefined, isLoading: false, error: new Error("failed"), refetch: jest.fn(), isRefetching: false } as unknown as ReturnType<typeof useContractDocuments>);
  renderPage();
  expect(screen.getByText("계약서 목록을 불러오지 못했습니다.")).toBeInTheDocument();
  expect(mockReplace).not.toHaveBeenCalled();
});

test("계약서 서버 필터와 전체 건수를 상세 검수 링크의 복귀 경로까지 보존한다", async () => {
  const uploadId = "11111111-1111-1111-1111-111111111111";
  mockQuery = `page=2&size=50&userId=12&propertyId=8&uploadId=${uploadId}&createdFrom=2026-10-01&createdTo=2026-10-05`;
  renderPage();
  expect(useDocuments).toHaveBeenLastCalledWith("PENDING", 2, 50, { ...emptyFilters, userId: 12, propertyId: 8, uploadId, createdFrom: "2026-10-01", createdTo: "2026-10-05" });
  expect(screen.getByText("총 51건")).toBeVisible();
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "임차인" }));
  await waitFor(() => expect(fetchTenants).toHaveBeenLastCalledWith({ page: 1, size: 20, userId: 12, propertyId: 8, keyword: undefined }));
  fireEvent.click(screen.getByRole("button", { name: "검수" }));
  const detail = new URL(mockPush.mock.calls[0][0], "https://admin.test");
  expect(detail.searchParams.get("returnTo")).toBe(`/contract-documents?${mockQuery}`);
});

test("계약서 조회 전 임대인·건물을 바꾸면 이전 관계를 해제하고 선택 중인 새 범위에서 임차인을 찾는다", async () => {
  mockQuery = "page=2&size=50&userId=7&propertyId=8&tenantId=12";
  renderPage();
  const user = screen.getByRole("combobox", { name: "유저" });
  fireEvent.mouseDown(user); fireEvent.change(user, { target: { value: "19" } });
  fireEvent.click(await screen.findByText("user19@example.com · 010-****-1234 · #19", { selector: ".ant-select-item-option-content" }));
  await waitFor(() => expect(user.closest(".ant-select")).toHaveTextContent("user19@example.com"));
  const tenant = screen.getByRole("combobox", { name: "임차인" });
  fireEvent.mouseDown(tenant);
  await waitFor(() => expect(fetchTenants).toHaveBeenLastCalledWith({ page: 1, size: 20, userId: 19, propertyId: undefined, keyword: undefined }));
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(mockPush).toHaveBeenLastCalledWith("?page=1&size=50&userId=19"));

  const property = screen.getByRole("combobox", { name: "건물" });
  fireEvent.mouseDown(property); fireEvent.change(property, { target: { value: "21" } });
  fireEvent.click(await screen.findByText("#21 · 신관", { selector: ".ant-select-item-option-content" }));
  fireEvent.mouseDown(tenant);
  await waitFor(() => expect(fetchTenants).toHaveBeenLastCalledWith({ page: 1, size: 20, userId: 19, propertyId: 21, keyword: undefined }));
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(mockPush).toHaveBeenLastCalledWith("?page=1&size=50&userId=19&propertyId=21"));
});

test("완료에서 대기 탭으로 바꿀 때 완료 전용 조건을 지우고 사용자·건물·요청 기간을 유지한다", () => {
  mockQuery = "status=completed&page=2&size=50&userId=12&propertyId=8&createdFrom=2026-10-01&documentStatus=REJECTED&updatedFrom=2026-10-04&updatedTo=2026-10-05";
  const view = renderPage();
  fireEvent.click(screen.getByRole("radio", { name: "검수 대기" }));
  const query = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(Object.fromEntries(query)).toEqual({ size: "50", userId: "12", propertyId: "8", createdFrom: "2026-10-01" });
  mockQuery = query.toString(); view.rerender(<ContractOcrPage />);
  expect(useDocuments).toHaveBeenLastCalledWith("PENDING", 1, 50, { ...emptyFilters, userId: 12, propertyId: 8, createdFrom: "2026-10-01" });
});
