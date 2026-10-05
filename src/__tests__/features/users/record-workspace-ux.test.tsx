import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";

import { useAdminViewport } from "@/components/useAdminViewport";
import { UserTable } from "@/features/users/components/UserTable";
import { TenantTable } from "@/features/tenants/components/TenantTable";
import type { UserSummary } from "@/features/users/types";
import type { TenantSummary } from "@/features/tenants/types";

jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: jest.fn(() => "wide") }));
const mockViewport = jest.mocked(useAdminViewport);

const mockPush = jest.fn();
const mockDeleteUser = jest.fn();
const mockDeleteTenant = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }) }));
jest.mock("@/features/users/hooks", () => ({ useDeleteUser: () => ({ mutateAsync: mockDeleteUser, isPending: false }) }));
jest.mock("@/features/tenants/hooks", () => ({ useDeleteTenant: () => ({ mutate: (...args: unknown[]) => { mockDeleteTenant(...args); }, mutateAsync: mockDeleteTenant, isPending: false }) }));

const user: UserSummary = { userId: 12, email: "landy@example.com", phone: "010-1234-5678", provider: "KAKAO", role: "ADMIN", status: "ONBOARDED", createdAt: "2026-10-05T09:00:00" };
const tenant: TenantSummary = { tenantId: 30, userId: 12, propertyId: 8, propertyName: "신관", userEmail: user.email, name: "홍길동", phone: "010-2345-6789", roomNumber: "A101", contractType: "COMMERCIAL", rentPrice: 12_000_000, maintenanceFee: 50_000, depositAmount: 10_000_000, paymentDay: 5, billingTiming: "POSTPAID", rentBillingCycle: "YEARLY", startDate: "2026-01-01", endDate: "2027-01-01", notifyEnabled: true, dueAlimtalkEnabled: false };
function wrapper({ children }: { children: React.ReactNode }) {
  return <ConfigProvider theme={{ token: { motion: false } }}><App>{children}</App></ConfigProvider>;
}
beforeEach(() => { jest.clearAllMocks(); mockViewport.mockReturnValue("wide"); mockDeleteUser.mockResolvedValue(undefined); mockDeleteTenant.mockResolvedValue(undefined); });

test("사용자 식별정보는 한 행에서 읽고 주요 상세 동작과 별도 삭제 확인을 제공한다", async () => {
  render(<UserTable data={[user]} loading={false} page={1} pageSize={20} total={1} filters={{}} onFilterChange={jest.fn()} onPageChange={jest.fn()} returnPath="/users?keyword=landy&page=3" />, { wrapper });
  const row = screen.getByRole("row", { name: /landy@example.com.*12.*010-1234-5678.*카카오/ });
  expect(screen.getAllByRole("columnheader")).toHaveLength(8);
  expect(within(row).getByText(user.email)).toBeVisible();
  expect(within(row).getByText(user.phone!)).toBeVisible();
  expect(within(row).getByRole("button", { name: "상세" })).toBeVisible();
  expect(within(row).queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  fireEvent.click(within(row).getByRole("button", { name: "상세" }));
  const detail = new URL(mockPush.mock.calls[0][0], "https://landy.internal");
  expect(detail.searchParams.get("returnTo")).toBe("/users?keyword=landy&page=3");
  fireEvent.click(within(row).getByRole("button", { name: "유저 #12 더보기" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "사용자 삭제" }));
  await waitFor(() => expect(screen.getByText(/유저 #12 · landy@example.com.*계정을 삭제/)).toBeVisible());
  expect(mockDeleteUser).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  expect(mockDeleteUser).not.toHaveBeenCalled();
});

test("임차인·공간·계약·청구를 묶어 읽고 실제 금액과 관계 조회 및 삭제 대상을 보존한다", async () => {
  render(<TenantTable data={[tenant]} loading={false} page={1} pageSize={20} total={1} filters={{}} onFilterChange={jest.fn()} onPageChange={jest.fn()} returnPath="/tenants?keyword=A101&page=2" />, { wrapper });
  const row = screen.getByRole("row", { name: /홍길동.*신관.*A101/ });
  expect(screen.getAllByRole("columnheader")).toHaveLength(9);
  expect(within(row).getByText(tenant.phone!)).toBeVisible();
  expect(within(row).getByText("매년 · 1,200만원")).toBeVisible();
  expect(within(row).getByText("5만원")).toBeVisible();
  expect(within(row).getByText("1,000만원")).toBeVisible();
  expect(within(row).getByText("2026-01-01 → 2027-01-01")).toBeVisible();
  expect(within(row).getByRole("link", { name: "신관" })).toHaveAttribute("href", expect.stringContaining("propertyId=8"));
  fireEvent.click(within(row).getByRole("button", { name: "임차인 #30 더보기" }));
  const payments = await screen.findByRole("link", { name: "납부 내역" });
  const destination = new URL(payments.getAttribute("href")!, "https://landy.internal");
  expect(destination.searchParams.get("tenantId")).toBe("30");
  expect(destination.searchParams.get("userId")).toBe("12");
  expect(destination.searchParams.get("returnTo")).toBe("/tenants?keyword=A101&page=2");
  fireEvent.click(screen.getByRole("menuitem", { name: "임차인 삭제" }));
  await waitFor(() => expect(screen.getByText(/임차인 #30 · 홍길동 계약을 삭제/)).toBeVisible());
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "삭제" })); });
  expect(mockDeleteTenant).toHaveBeenCalledWith(30, expect.any(Object));
});


test("임차인 삭제 요청이 끝나기 전에는 확인창 취소·Escape와 중복 요청을 막는다", async () => {
  let finish!: () => void;
  mockDeleteTenant.mockReturnValueOnce(new Promise<void>((resolve) => { finish = resolve; }));
  const props = { data: [tenant], loading: false, page: 1, pageSize: 20, total: 1, filters: {}, onFilterChange: jest.fn(), onPageChange: jest.fn() };
  const view = render(<TenantTable {...props} />, { wrapper });
  fireEvent.click(screen.getByRole("button", { name: "임차인 #30 더보기" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "임차인 삭제" }));
  const dialog = await screen.findByRole("dialog", { name: "임차인을 삭제하시겠습니까?" });
  await waitFor(() => expect(dialog).toBeVisible());
  fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "취소" })).toBeDisabled());
  mockViewport.mockReturnValue("mobile");
  view.rerender(<TenantTable {...props} />);
  expect(screen.queryByRole("table", { hidden: true })).not.toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "취소" })).toBeDisabled();
  fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
  expect(dialog).toBeVisible();
  expect(mockDeleteTenant).toHaveBeenCalledTimes(1);
  await act(async () => { finish(); });
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "임차인을 삭제하시겠습니까?" })).not.toBeInTheDocument());
});


test("모바일은 표 없이 임차인 핵심 정보 카드와 추가 정보·관계 작업을 제공한다", async () => {
  mockViewport.mockReturnValue("mobile");
  render(<TenantTable data={[tenant]} loading={false} page={2} pageSize={20} total={25} filters={{}} onFilterChange={jest.fn()} onPageChange={jest.fn()} returnPath="/tenants?keyword=A101&page=2" />, { wrapper });
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  const card = screen.getByRole("article", { name: "임차인 #30 홍길동" });
  expect(within(card).getByText(tenant.phone!)).toBeVisible();
  expect(within(card).getByText("매년 · 1,200만원")).toBeVisible();
  expect(within(card).getByText("관리비 5만원")).toBeVisible();
  expect(within(card).getByRole("link", { name: "신관" })).toBeVisible();
  expect(within(card).getByRole("button", { name: "상세" })).toBeVisible();
  const extra = within(card).getByText("추가 정보").closest("details")!;
  fireEvent.click(within(card).getByText("추가 정보"));
  expect(extra).toHaveAttribute("open");
  await waitFor(() => expect(within(extra).getByText("미수신")).toBeVisible());
  fireEvent.click(within(card).getByRole("button", { name: "임차인 #30 더보기" }));
  const destination = new URL((await screen.findByRole("link", { name: "납부 내역" })).getAttribute("href")!, "https://landy.internal");
  expect(destination.searchParams.get("returnTo")).toBe("/tenants?keyword=A101&page=2");
});

test("중간 화면에서는 핵심 열과 읽기 전용 펼침을 사용하고 넓은 화면에서는 금액별로 비교한다", async () => {
  mockViewport.mockReturnValue("compact");
  const props = { data: [tenant], loading: false, page: 1, pageSize: 20, total: 1, filters: {}, onFilterChange: jest.fn(), onPageChange: jest.fn() };
  const view = render(<TenantTable {...props} />, { wrapper });
  expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  const row = screen.getByRole("row", { name: /홍길동.*신관/ });
  expect(within(row).getAllByRole("button", { name: "상세" })).toHaveLength(1);
  expect(within(row).getByText(tenant.phone!)).toBeVisible();
  expect(within(row).getByRole("link", { name: "신관 · 호실 A101" })).toBeVisible();
  expect(within(row).getByRole("link", { name: `임대인 ${user.email}` })).toBeVisible();
  expect(screen.queryByRole("link", { name: "임차인 #30" })).not.toBeInTheDocument();
  fireEvent.click(row);
  expect(await screen.findByText("관리비 5만원")).toBeVisible();
  expect(screen.getByRole("link", { name: "임차인 #30" })).toBeVisible();
  expect(screen.getByRole("link", { name: "건물 #8" })).toBeVisible();
  expect(screen.getByRole("link", { name: "유저 #12" })).toBeVisible();
  expect(screen.getAllByRole("button", { name: "상세" })).toHaveLength(1);
  mockViewport.mockReturnValue("wide");
  view.rerender(<TenantTable {...props} />);
  expect(screen.getAllByRole("columnheader")).toHaveLength(9);
  expect(screen.getByRole("columnheader", { name: "관리비" })).toBeVisible();
});


test("모바일 사용자 카드에서 가입일을 펼치지 않고 확인하고 연락처·권한과 상세 복귀 경로를 유지한다", () => {
  mockViewport.mockReturnValue("mobile");
  render(<UserTable data={[user]} loading={false} page={1} pageSize={20} total={1} filters={{}} onFilterChange={jest.fn()} onPageChange={jest.fn()} returnPath="/users?provider=KAKAO&page=4" />, { wrapper });
  const card = screen.getByRole("article", { name: "유저 #12 landy@example.com" });
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(within(card).getByText(user.phone!)).toBeVisible();
  expect(within(card).getByText("카카오 · 관리자")).toBeVisible();
  expect(within(card).getByText("가입일")).toBeVisible();
  expect(within(card).getByText("2026년 10월 5일")).toBeVisible();
  expect(within(card).queryByText("추가 정보")).not.toBeInTheDocument();
  fireEvent.click(within(card).getByRole("button", { name: "상세" }));
  const path = new URL(mockPush.mock.calls[0][0], "https://landy.internal");
  expect(path.searchParams.get("returnTo")).toBe("/users?provider=KAKAO&page=4");
});

test("중간 화면에서도 가입일을 기본 셀에서 읽고 넓은 화면에서는 가입일 열로 비교한다", () => {
  mockViewport.mockReturnValue("compact");
  const props = { data: [user], loading: false, page: 1, pageSize: 20, total: 1, filters: {}, onFilterChange: jest.fn(), onPageChange: jest.fn() };
  const view = render(<UserTable {...props} />, { wrapper });
  const row = screen.getByRole("row", { name: /landy@example.com.*010-1234-5678/ });
  expect(within(row).getByText("가입일 2026년 10월 5일")).toBeVisible();
  expect(within(row).getByText("카카오 · 관리자")).toBeVisible();
  expect(within(row).queryByRole("button", { name: "추가 정보 펼치기" })).not.toBeInTheDocument();

  mockViewport.mockReturnValue("wide");
  view.rerender(<UserTable {...props} />);
  expect(screen.getByRole("columnheader", { name: "가입일" })).toBeVisible();
  expect(screen.getByText("2026년 10월 5일")).toBeVisible();
});
