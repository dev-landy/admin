import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import UsersPage from "@/app/(admin)/users/page";
import PropertiesPage from "@/app/(admin)/properties/page";
import TenantsPage from "@/app/(admin)/tenants/page";
import PaymentsPage from "@/app/(admin)/payments/page";

let mockQuery = "";
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockResult = jest.fn();
const mockParams = jest.fn();
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockQuery),
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));
jest.mock("@/features/users/hooks", () => ({ useUsers: (params: unknown) => { mockParams(params); return mockResult(); } }));
jest.mock("@/features/properties/hooks", () => ({ useProperties: (params: unknown) => { mockParams(params); return mockResult(); } }));
jest.mock("@/features/tenants/hooks", () => ({ useTenants: (params: unknown) => { mockParams(params); return mockResult(); } }));
jest.mock("@/features/payments/hooks", () => ({ usePayments: (params: unknown) => { mockParams(params); return mockResult(); } }));
jest.mock("@/features/users/components/UserTable", () => ({ UserTable: ({ onPageChange }: { onPageChange: (page: number, size: number) => void }) => <button onClick={() => onPageChange(3, 50)}>행 수 변경</button> }));
jest.mock("@/features/properties/components/PropertyTable", () => ({ PropertyTable: () => null }));
jest.mock("@/features/tenants/components/TenantTable", () => ({ TenantTable: () => null }));
jest.mock("@/features/payments/components/PaymentTable", () => ({ PaymentTable: () => null }));

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = "";
  mockResult.mockReturnValue({ data: { totalElements: 80 }, isLoading: false, isFetching: false, error: null, refetch: jest.fn() });
});

test("초기 조건이 없는 건물 검색도 미적용 입력을 초기화한다", async () => {
  render(<PropertiesPage />);
  const input = screen.getByLabelText("건물명 또는 주소");
  fireEvent.change(input, { target: { value: "아직 조회하지 않은 건물" } });
  expect(input).toHaveValue("아직 조회하지 않은 건물");
  fireEvent.click(screen.getByRole("button", { name: "필터 초기화" }));
  await waitFor(() => expect(input).toHaveValue(""));
  expect(mockPush).toHaveBeenCalledWith("?page=1");
});

test("건물 조건은 조회 버튼에서 함께 적용하고 기존 페이지를 초기화한다", async () => {
  mockQuery = "page=3&size=20&userId=12";
  render(<PropertiesPage />);
  fireEvent.change(screen.getByLabelText("건물명 또는 주소"), { target: { value: "  신관  " } });
  expect(mockPush).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(mockPush).toHaveBeenCalled());
  const params = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(params.get("page")).toBe("1");
  expect(params.get("userId")).toBe("12");
  expect(params.get("keyword")).toBe("신관");
});

test("사용자 행 수 변경은 필터를 보존하고 1페이지에서 시작한다", () => {
  mockQuery = "page=3&provider=KAKAO&size=20";
  render(<UsersPage />);
  fireEvent.click(screen.getByRole("button", { name: "행 수 변경" }));
  const params = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(params.get("page")).toBe("1");
  expect(params.get("size")).toBe("50");
  expect(params.get("provider")).toBe("KAKAO");
});

test.each([UsersPage, PropertiesPage, TenantsPage, PaymentsPage])("%p 마지막 페이지가 사라지면 남은 마지막 페이지로 복귀한다", async (Page) => {
  mockQuery = "page=3&size=20&userId=12";
  mockResult.mockReturnValue({ data: { totalElements: 21 }, isLoading: false, isFetching: false, error: null });
  render(<Page />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("?page=2&size=20&userId=12"));
});

test("잘못된 숫자와 가입 상태는 API 요청에서 안전한 기본값으로 처리한다", () => {
  mockQuery = "page=NaN&size=0&status=UNKNOWN&role=ROOT&provider=INVALID";
  render(<UsersPage />);
  expect(mockParams).toHaveBeenLastCalledWith({ page: 1, size: 20, provider: undefined, role: undefined, status: undefined });
});

test("청구월 기간 입력을 표시하고 종료월이 시작월보다 빠르면 조회하지 않는다", async () => {
  mockQuery = "from=2026-10-04&to=2026-09-01";
  render(<PaymentsPage />);
  expect(screen.getByLabelText("청구월 시작")).toHaveValue("2026-10");
  expect(screen.getByLabelText("청구월 종료")).toHaveValue("2026-09");
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  expect(await screen.findByText("시작월보다 이전일 수 없습니다.")).toBeInTheDocument();
  expect(mockPush).not.toHaveBeenCalled();
});

test("존재하지 않는 날짜와 ID는 납부 요청에 포함하지 않는다", () => {
  mockQuery = "from=2026-02-31&userId=-1&tenantId=oops&source=UNKNOWN";
  render(<PaymentsPage />);
  expect(mockParams).toHaveBeenLastCalledWith({ page: 1, size: 20, source: undefined, from: undefined, to: undefined, userId: undefined, tenantId: undefined });
  expect(screen.getByLabelText("청구월 시작")).toHaveValue("");
});

test("선택한 청구월은 날짜 계약을 유지하며 각 월 1일로 함께 직렬화한다", async () => {
  mockQuery = "from=2026-09-20&to=2026-10-31&size=50&page=2";
  render(<PaymentsPage />);
  expect(mockParams).toHaveBeenLastCalledWith(expect.objectContaining({ from: "2026-09-01", to: "2026-10-01" }));
  expect(screen.getByLabelText("청구월 시작")).toHaveValue("2026-09");
  expect(screen.getByLabelText("청구월 종료")).toHaveValue("2026-10");
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(mockPush).toHaveBeenCalled());
  const params = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(params.get("from")).toBe("2026-09-01");
  expect(params.get("to")).toBe("2026-10-01");
  expect(params.get("page")).toBe("1");
});
