import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import UsersPage from "@/app/(admin)/users/page";
import PropertiesPage from "@/app/(admin)/properties/page";
import TenantsPage from "@/app/(admin)/tenants/page";
import PaymentsPage from "@/app/(admin)/payments/page";
import DuplicatesPage from "@/app/(admin)/payments/duplicates/page";

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
jest.mock("@/features/payments/hooks", () => ({ usePayments: (params: unknown) => { mockParams(params); return mockResult(); }, useDuplicates: (params: unknown) => { mockParams(params); return mockResult(); } }));
jest.mock("@/components/EntityLookupSelect", () => {
  const Lookup = ({ id, value, onChange }: { id?: string; value?: number; onChange?: (value?: number) => void }) => <input id={id} value={value ?? ""} onChange={(event) => onChange?.(Number(event.target.value) || undefined)} />;
  return { UserLookupSelect: Lookup, TenantLookupSelect: Lookup };
});
jest.mock("@/features/properties/components/PropertyLookupSelect", () => ({ PropertyLookupSelect: ({ id, value, onChange }: { id?: string; value?: number; onChange?: (value?: number) => void }) => <input id={id} value={value ?? ""} onChange={(event) => onChange?.(Number(event.target.value) || undefined)} /> }));
jest.mock("@/features/users/components/UserTable", () => ({ UserTable: ({ onPageChange }: { onPageChange: (page: number, size: number) => void }) => <button onClick={() => onPageChange(3, 50)}>행 수 변경</button> }));
jest.mock("@/features/properties/components/PropertyTable", () => ({ PropertyTable: () => null }));
jest.mock("@/features/tenants/components/TenantTable", () => ({ TenantTable: () => null }));
jest.mock("@/features/payments/components/PaymentTable", () => ({ PaymentTable: () => null }));
jest.mock("@/features/payments/components/DuplicateTable", () => ({ DuplicateTable: () => null }));

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

test.each([
  [PropertiesPage, "page=3&size=50&userId=12&propertyId=8&keyword=신관", [["임대인", "userId", "12"], ["건물", "propertyId", "8"]]],
  [TenantsPage, "page=3&size=50&userId=12&propertyId=8&tenantId=7&keyword=홍길동", [["임대인", "userId", "12"], ["건물", "propertyId", "8"], ["임차인", "tenantId", "7"]]],
] as const)("대상 이름으로 표시한 %p 필터는 키보드로 해당 조건만 해제한다", async (Page, query, filters) => {
  mockQuery = query;
  const view = render(<Page />);
  for (const [label, key, id] of filters) {
    expect(screen.getByRole("status", { name: "적용한 필터" })).toHaveTextContent(`${label}: #${id}`);
    const previous = new URLSearchParams(mockQuery);
    mockPush.mockClear();
    fireEvent.keyDown(screen.getByRole("button", { name: `${label} 조건 해제` }), { key: "Enter" });
    await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
    const next = new URLSearchParams(mockPush.mock.calls[0][0]);
    expect(next.get(key)).toBeNull();
    expect(next.has("undefined")).toBe(false);
    for (const [otherKey, value] of previous) {
      if (otherKey !== key && otherKey !== "page") expect(next.get(otherKey)).toBe(value);
    }
    expect(next.get("page")).toBe("1");
    mockQuery = next.toString(); view.rerender(<Page />);
    expect(screen.queryByRole("button", { name: `${label} 조건 해제` })).not.toBeInTheDocument();
  }
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
  expect(mockParams).toHaveBeenLastCalledWith({ page: 1, size: 20, keyword: undefined, userId: undefined, provider: undefined, role: undefined, status: undefined, accountState: "ALL" });
});

test("탈퇴 선택은 가입 단계 enum과 분리해 서버에 전달하고 검색과 정렬을 유지한다", () => {
  mockQuery = "page=2&keyword=withdrawn&status=WITHDRAWN&sort=createdAt,asc";
  render(<UsersPage />);
  expect(mockParams).toHaveBeenLastCalledWith(expect.objectContaining({ status: undefined, accountState: "WITHDRAWN", keyword: "withdrawn", sort: "createdAt,asc" }));
  expect(screen.getByRole("status", { name: "적용한 필터" })).toHaveTextContent("가입 상태: 탈퇴");
  fireEvent.click(screen.getByRole("button", { name: "가입 상태 조건 해제" }));
  const params = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(params.get("status")).toBeNull();
  expect(params.get("keyword")).toBe("withdrawn");
  expect(params.get("sort")).toBe("createdAt,asc");
  expect(params.get("page")).toBe("1");
});

test("온보딩 단계 선택은 사용 중인 계정에 한정하고 초기화하면 전체 계정으로 돌아간다", async () => {
  mockQuery = "page=2&status=ONBOARDED&sort=userId,asc";
  const view = render(<UsersPage />);
  expect(mockParams).toHaveBeenLastCalledWith(expect.objectContaining({ status: "ONBOARDED", accountState: "ACTIVE" }));
  fireEvent.click(screen.getByRole("button", { name: "필터 초기화" }));
  await waitFor(() => expect(mockPush).toHaveBeenCalled());
  mockQuery = new URLSearchParams(mockPush.mock.calls[0][0]).toString();
  view.rerender(<UsersPage />);
  expect(mockParams).toHaveBeenLastCalledWith(expect.objectContaining({ status: undefined, accountState: "ALL", page: 1, sort: "userId,asc" }));
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
  expect(mockParams).toHaveBeenLastCalledWith({ page: 1, size: 20, source: undefined, from: undefined, to: undefined, userId: undefined, tenantId: undefined, paymentId: undefined, propertyId: undefined, paidFrom: undefined, paidTo: undefined });
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

test("청구월을 직접 입력하고 blur 직후 조회해도 새 두 월을 URL과 API 조건에 적용한다", async () => {
  mockQuery = "page=2&size=50&userId=7&source=MANUAL&to=2026-12-01";
  const view = render(<PaymentsPage />);
  const query = screen.getByRole("button", { name: "조회" });
  await act(async () => {
    for (const [label, value] of [["청구월 시작", "2026-11"], ["청구월 종료", "2027-02"]]) {
      const input = screen.getByLabelText(label);
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value } });
      fireEvent.blur(input, { relatedTarget: query });
    }
    fireEvent.click(query);
  });
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  const params = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(Object.fromEntries(params)).toEqual({ page: "1", size: "50", userId: "7", source: "MANUAL", from: "2026-11-01", to: "2027-02-01" });
  mockQuery = params.toString();
  view.rerender(<PaymentsPage />);
  expect(mockParams).toHaveBeenLastCalledWith({ page: 1, size: 50, userId: 7, tenantId: undefined, source: "MANUAL", from: "2026-11-01", to: "2027-02-01", paymentId: undefined, propertyId: undefined, paidFrom: undefined, paidTo: undefined });
});

test("이메일·전화번호 검색은 조회할 때 전체 사용자 조건으로 적용하고 페이지를 초기화한다", async () => {
  mockQuery = "page=4&size=50&provider=KAKAO";
  const view = render(<UsersPage />);
  fireEvent.change(screen.getByLabelText("이메일·전화번호"), { target: { value: "  010-1234  " } });
  expect(mockPush).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  const query = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(Object.fromEntries(query)).toEqual({ page: "1", size: "50", provider: "KAKAO", keyword: "010-1234" });
  mockQuery = query.toString(); view.rerender(<UsersPage />);
  expect(mockParams).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: "010-1234", page: 1, provider: "KAKAO" }));
});

test("임차인 URL의 검색·건물·계약 상태와 비활성 알림을 서버 조건으로 복원한다", () => {
  mockQuery = "keyword=%20홍길동%20&tenantId=7&propertyId=8&contractType=COMMERCIAL&contractStatus=ACTIVE&notifyEnabled=false&startDate=2026-10-05";
  render(<TenantsPage />);
  expect(screen.getByLabelText("이름·전화번호·호실")).toHaveValue("홍길동");
  expect(mockParams).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: "홍길동", tenantId: 7, propertyId: 8, contractType: "COMMERCIAL", contractStatus: "ACTIVE", notifyEnabled: false, startDate: "2026-10-05" }));
});

test("실제 납부일을 직접 입력하고 곧바로 조회해도 청구월과 독립된 날짜 범위를 전달한다", async () => {
  mockQuery = "page=3&from=2026-09-01&to=2026-10-01&propertyId=8&paymentId=90";
  const view = render(<PaymentsPage />);
  await act(async () => {
    for (const [label, value] of [["납부일 시작", "2026-10-04"], ["납부일 종료", "2026-10-05"]]) {
      const input = screen.getByLabelText(label); fireEvent.focus(input); fireEvent.change(input, { target: { value } }); fireEvent.blur(input);
    }
    fireEvent.click(screen.getByRole("button", { name: "조회" }));
  });
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  const query = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(Object.fromEntries(query)).toEqual({ page: "1", from: "2026-09-01", to: "2026-10-01", propertyId: "8", paymentId: "90", paidFrom: "2026-10-04", paidTo: "2026-10-05" });
  mockQuery = query.toString(); view.rerender(<PaymentsPage />);
  expect(mockParams).toHaveBeenLastCalledWith(expect.objectContaining({ from: "2026-09-01", to: "2026-10-01", paidFrom: "2026-10-04", paidTo: "2026-10-05", propertyId: 8, paymentId: 90 }));
});

test("실제 납부일의 역전 범위는 조회하지 않고 입력 오류를 안내한다", async () => {
  mockQuery = "paidFrom=2026-10-05&paidTo=2026-10-04";
  render(<PaymentsPage />);
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  expect(await screen.findByText("시작일보다 이전일 수 없습니다.")).toBeInTheDocument();
  expect(mockPush).not.toHaveBeenCalled();
});

test("납부 필터에서 임대인·건물을 바꾸면 이전 하위 대상만 지우고 기간·출처·복귀 조건을 보존한다", async () => {
  mockQuery = "page=3&size=50&userId=12&tenantId=7&propertyId=8&source=BANK_AUTO&from=2026-09-01&paidFrom=2026-10-04&returnTo=%2Fusers%2F12%3Ftab%3Dtenants";
  const view = render(<PaymentsPage />);
  fireEvent.click(screen.getByText(/^상세 조건 (펼치기|접기)$/));
  expect(screen.getByLabelText("임차인")).toHaveValue("7");
  expect(screen.getByLabelText("건물")).toHaveValue("8");
  fireEvent.change(screen.getByLabelText("임대인"), { target: { value: "13" } });
  await waitFor(() => {
    expect(screen.getByLabelText("건물")).toHaveValue("");
    expect(screen.getByLabelText("임차인")).toHaveValue("");
  });
  expect(mockPush).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("건물"), { target: { value: "10" } });
  fireEvent.change(screen.getByLabelText("임차인"), { target: { value: "9" } });
  fireEvent.change(screen.getByLabelText("건물"), { target: { value: "11" } });
  await waitFor(() => expect(screen.getByLabelText("임차인")).toHaveValue(""));
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  const query = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(Object.fromEntries(query)).toEqual({ page: "1", size: "50", userId: "13", propertyId: "11", source: "BANK_AUTO", from: "2026-09-01", paidFrom: "2026-10-04", returnTo: "/users/12?tab=tenants" });
  mockQuery = query.toString(); view.rerender(<PaymentsPage />);
  expect(mockParams).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, size: 50, userId: 13, propertyId: 11, tenantId: undefined, source: "BANK_AUTO", from: "2026-09-01", paidFrom: "2026-10-04" }));
  expect(screen.getByRole("status", { name: "적용한 필터" })).toHaveTextContent("임대인: #13");
  expect(screen.getByRole("status", { name: "적용한 필터" })).toHaveTextContent("건물: #11");
});

test("중복 납부의 임차인 조건을 복원하고 초기화하면 페이지와 조건을 함께 재설정한다", async () => {
  mockQuery = "tenantId=7&page=3&size=50";
  render(<DuplicatesPage />);
  expect(mockParams).toHaveBeenLastCalledWith({ tenantId: 7, page: 3, size: 50 });
  expect(screen.getByLabelText("임차인")).toHaveValue("7");
  fireEvent.click(screen.getAllByRole("button", { name: "필터 초기화" })[0]);
  expect(mockPush).toHaveBeenCalledWith("?page=1&size=50");
  await waitFor(() => expect(screen.getByLabelText("임차인")).toHaveValue(""));
});


test("임차인 검색에서 임대인을 바꾸면 이전 건물을 지우고 다른 검색·계약·복귀 조건은 유지한다", async () => {
  mockQuery = "page=3&size=50&userId=12&propertyId=8&keyword=홍길동&contractStatus=ACTIVE&notifyEnabled=false&returnTo=%2Fusers%2F12";
  const view = render(<TenantsPage />);
  fireEvent.click(screen.getByText(/^상세 조건 (펼치기|접기)$/));
  expect(screen.getByLabelText("건물")).toHaveValue("8");
  fireEvent.change(screen.getByLabelText("임대인"), { target: { value: "13" } });
  await waitFor(() => expect(screen.getByLabelText("건물")).toHaveValue(""));
  expect(mockPush).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  const query = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(Object.fromEntries(query)).toEqual({ page: "1", size: "50", userId: "13", keyword: "홍길동", contractStatus: "ACTIVE", notifyEnabled: "false", returnTo: "/users/12" });
  mockQuery = query.toString(); view.rerender(<TenantsPage />);
  expect(mockParams).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, size: 50, userId: 13, propertyId: undefined, keyword: "홍길동", contractStatus: "ACTIVE", notifyEnabled: false }));
});
