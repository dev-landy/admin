import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { App, Button, ConfigProvider, Form } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserLookupSelect, TenantLookupSelect } from "@/components/EntityLookupSelect";
import { fetchUser, fetchUsers } from "@/features/users/api";
import { fetchTenant, fetchTenants } from "@/features/tenants/api";
import type { UserDetail, UserSummary } from "@/features/users/types";
import type { TenantDetail } from "@/features/tenants/types";

jest.mock("@/features/users/api", () => ({ fetchUser: jest.fn(), fetchUsers: jest.fn() }));
jest.mock("@/features/tenants/api", () => ({ fetchTenant: jest.fn(), fetchTenants: jest.fn() }));
const getUser = jest.mocked(fetchUser);
const searchUsers = jest.mocked(fetchUsers);
const getTenant = jest.mocked(fetchTenant);
const searchTenants = jest.mocked(fetchTenants);

function renderForm(field: "userId" | "tenantId", initialValue: number | null, submit: jest.Mock) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App>
    <Form initialValues={{ [field]: initialValue }} onFinish={submit}>
      <Form.Item name={field} label={field === "userId" ? "유저" : "임차인"}>
        {field === "userId" ? <UserLookupSelect /> : <TenantLookupSelect userId={12} />}
      </Form.Item>
      <Button htmlType="submit">조회</Button>
    </Form>
  </App></ConfigProvider></QueryClientProvider>);
}

beforeEach(() => jest.clearAllMocks());

test("운영 사용자 선택은 탈퇴 ID의 상세 조회를 사용하지 않고 ACTIVE 목록에서 선택 가능 여부를 확인한다", async () => {
  searchUsers.mockResolvedValue({ users: [], page: 0, size: 1, totalElements: 0 });
  getUser.mockResolvedValue({ userId: 150, email: "withdrawn@example.test", deletedAt: "2026-10-05T15:42:09" } as UserDetail);
  const submit = jest.fn();
  renderForm("userId", 150, submit);
  await waitFor(() => expect(searchUsers).toHaveBeenCalledWith({ page: 1, size: 1, userId: 150, accountState: "ACTIVE" }));
  await waitFor(() => expect(screen.getByRole("combobox", { name: "유저" }).closest(".ant-select")).not.toHaveTextContent("#150"));
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(submit).toHaveBeenLastCalledWith({ userId: undefined }));
  expect(getUser).not.toHaveBeenCalled();
});

test("사용자 선택은 첫 페이지 밖의 연락처와 숫자 ID OR 검색을 서버에 요청하고 null·선택·초기화 값을 폼에 전달한다", async () => {
  const users: UserSummary[] = [1, 77, 7777].map((userId) => ({ userId, email: `user${userId}@example.com`, phone: "010-****-7777", provider: "KAKAO", role: "USER", status: "ONBOARDED", createdAt: "2026-10-01" }));
  searchUsers.mockImplementation(async (params) => ({ users: params.userId ? users.filter((user) => user.userId === params.userId) : params.keyword === "010-7777" || params.keyword === "7777" ? [users[1]] : [users[0]], page: 0, size: params.size ?? 20, totalElements: params.userId ? 1 : 200 }));
  getUser.mockImplementation(async (id) => ({ ...users.find((user) => user.userId === id)!, notifyDue: true, notifyOverdue: false, alimtalkEnabled: true, updatedAt: "2026-10-01" } as UserDetail));
  const submit = jest.fn();
  renderForm("userId", null, submit);
  expect(getUser).not.toHaveBeenCalled();
  const input = screen.getByRole("combobox", { name: "유저" });
  fireEvent.mouseDown(input);
  await screen.findByText("user1@example.com · 010-****-7777 · #1", { selector: ".ant-select-item-option-content" });
  expect(screen.queryByText("user77@example.com · 010-****-7777 · #77", { selector: ".ant-select-item-option-content" })).not.toBeInTheDocument();
  fireEvent.change(input, { target: { value: "  010-7777  " } });
  fireEvent.click(await screen.findByText("user77@example.com · 010-****-7777 · #77", { selector: ".ant-select-item-option-content" }));
  expect(searchUsers).toHaveBeenCalledWith({ page: 1, size: 20, keyword: "010-7777" });
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(submit).toHaveBeenLastCalledWith({ userId: 77 }));
  const select = input.closest(".ant-select")!;
  await waitFor(() => expect(select).toHaveTextContent("user77@example.com · #77"));

  fireEvent.mouseDown(input);
  fireEvent.change(input, { target: { value: "7777" } });
  await screen.findByText("user77@example.com · 010-****-7777 · #77", { selector: ".ant-select-item-option-content" });
  fireEvent.click(await screen.findByText("user7777@example.com · 010-****-7777 · #7777", { selector: ".ant-select-item-option-content" }));
  expect(searchUsers).toHaveBeenCalledWith({ page: 1, size: 20, keyword: "7777" });
  expect(searchUsers).toHaveBeenCalledWith({ page: 1, size: 1, userId: 7777 });
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(submit).toHaveBeenLastCalledWith({ userId: 7777 }));
  fireEvent.click(within(select as HTMLElement).getByRole("button", { name: "Clear" }));
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(submit).toHaveBeenLastCalledWith({ userId: undefined }));
  expect(getUser.mock.calls.every(([id]) => typeof id === "number" && id > 0)).toBe(true);
});

test("임차인 검색은 임대인 범위와 건물 식별 정보를 보존하고 검색 실패·숫자 ID 조회를 처리한다", async () => {
  const tenant = (tenantId: number, propertyName: string): TenantDetail => ({
    tenantId, userId: 12, propertyId: tenantId, propertyName, name: "홍길동", phone: "010-****-7777", roomNumber: "A101", contractType: "ROOM", rentPrice: 500000, paymentDay: 1, billingTiming: "PREPAID", rentBillingCycle: "MONTHLY", startDate: "2026-10-01", endDate: null, notifyEnabled: false, dueAlimtalkEnabled: false, createdAt: "2026-10-01", updatedAt: "2026-10-01",
  });
  const tenants = [tenant(99, "신관"), tenant(100, "본관")];
  let failSearch = true;
  searchTenants.mockImplementation(async (params) => {
    if (params.keyword === "홍길동" && failSearch) { failSearch = false; throw new Error("network"); }
    const matches = params.tenantId ? tenants.filter((entry) => entry.tenantId === params.tenantId) : params.keyword === "100" ? [tenants[0]] : params.keyword ? tenants : [];
    return { tenants: matches, page: 0, size: params.size ?? 20, totalElements: params.tenantId ? matches.length : params.keyword ? 200 : 0 };
  });
  getTenant.mockImplementation(async (id) => tenants.find((entry) => entry.tenantId === id)!);
  const submit = jest.fn();
  renderForm("tenantId", 99, submit);
  const input = screen.getByRole("combobox", { name: "임차인" });
  await waitFor(() => expect(input.closest(".ant-select")).toHaveTextContent("홍길동"));
  fireEvent.mouseDown(input);
  fireEvent.change(input, { target: { value: "  홍길동  " } });
  fireEvent.click(await screen.findByRole("button", { name: "검색 실패 · 다시 조회" }));
  const option = await screen.findByText("홍길동 · 010-****-7777 · 본관 A101 · 유저 #12 · 임차인 #100", { selector: ".ant-select-item-option-content" });
  expect(screen.getByText("홍길동 · 010-****-7777 · 신관 A101 · 유저 #12 · 임차인 #99", { selector: ".ant-select-item-option-content" })).toBeVisible();
  expect(searchTenants).toHaveBeenLastCalledWith({ page: 1, size: 20, userId: 12, keyword: "홍길동" });
  fireEvent.click(option);
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(submit).toHaveBeenLastCalledWith({ tenantId: 100 }));
  await waitFor(() => expect(input.closest(".ant-select")).toHaveTextContent("임차인 #100"));
  fireEvent.mouseDown(input); fireEvent.change(input, { target: { value: "100" } });
  await screen.findByText("홍길동 · 010-****-7777 · 본관 A101 · 유저 #12 · 임차인 #100", { selector: ".ant-select-item-option-content" });
  const contact = screen.getByText("홍길동 · 010-****-7777 · 신관 A101 · 유저 #12 · 임차인 #99", { selector: ".ant-select-item-option-content" });
  expect(searchTenants).toHaveBeenCalledWith({ page: 1, size: 20, userId: 12, keyword: "100" });
  expect(searchTenants).toHaveBeenCalledWith({ page: 1, size: 1, userId: 12, tenantId: 100 });
  fireEvent.click(contact);
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(submit).toHaveBeenLastCalledWith({ tenantId: 99 }));
});

test("정확한 ID 조회만 실패해도 연락처 후보를 유지하며 재조회 후 첫 페이지 밖의 ID를 선택할 수 있다", async () => {
  const contacts: UserSummary[] = Array.from({ length: 20 }, (_, index) => ({
    userId: index + 1, email: `contact${index + 1}@example.com`, phone: "010-****-7777", provider: "KAKAO", role: "USER", status: "ONBOARDED", createdAt: "2026-10-01",
  }));
  const target: UserSummary = { ...contacts[0], userId: 7777, email: "exact7777@example.com" };
  let failExact = true;
  searchUsers.mockImplementation(async (params) => {
    if (params.userId === 7777) {
      if (failExact) {
        failExact = false;
        throw new AxiosError("exact ID request failed", undefined, undefined, undefined, { data: { status: 500 }, status: 500, statusText: "Internal Server Error", headers: new AxiosHeaders(), config: { headers: new AxiosHeaders() } });
      }
      return { users: [target], page: 0, size: 1, totalElements: 1 };
    }
    return { users: contacts, page: 0, size: 20, totalElements: 200 };
  });
  getUser.mockResolvedValue({ ...target, notifyDue: true, notifyOverdue: false, alimtalkEnabled: true, updatedAt: "2026-10-01" });
  const submit = jest.fn();
  renderForm("userId", null, submit);
  const input = screen.getByRole("combobox", { name: "유저" });
  fireEvent.mouseDown(input); fireEvent.change(input, { target: { value: "7777" } });
  const retry = await screen.findByRole("button", { name: "일부 검색 실패 · 다시 조회" });
  expect(retry.closest('[role="alert"]')).toBeVisible();
  expect(screen.getByText("contact1@example.com · 010-****-7777 · #1", { selector: ".ant-select-item-option-content" })).toBeVisible();
  expect(screen.queryByText("exact7777@example.com · 010-****-7777 · #7777", { selector: ".ant-select-item-option-content" })).not.toBeInTheDocument();
  await act(async () => {
    if (fireEvent.mouseDown(retry)) retry.focus();
    fireEvent.mouseUp(retry); fireEvent.click(retry);
  });
  const exactOption = await screen.findByText("exact7777@example.com · 010-****-7777 · #7777", { selector: ".ant-select-item-option-content" });
  expect(exactOption).toBeVisible();
  expect(searchUsers.mock.calls.filter(([params]) => params.userId === 7777)).toHaveLength(2);
  expect(searchUsers.mock.calls.filter(([params]) => params.keyword === "7777")).toHaveLength(2);
  expect(screen.queryByRole("button", { name: "일부 검색 실패 · 다시 조회" })).not.toBeInTheDocument();
  fireEvent.click(exactOption); fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(submit).toHaveBeenLastCalledWith({ userId: 7777 }));
});
