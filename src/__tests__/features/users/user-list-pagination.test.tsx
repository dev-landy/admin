import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { App, ConfigProvider } from "antd";
import koKR from "antd/locale/ko_KR";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useAdminViewport } from "@/components/useAdminViewport";
import { UserTenantsTab } from "@/features/users/components/UserTenantsTab";
import { UserFcmTab } from "@/features/users/components/UserFcmTab";
import { deactivateFcmToken, fetchUserFcmTokens, fetchUserTenants } from "@/features/users/api";
import { userKeys } from "@/features/users/hooks";
import "@/test-utils/antd";

jest.mock("@/features/users/api", () => ({ fetchUserTenants: jest.fn(), fetchUserFcmTokens: jest.fn(), deactivateFcmToken: jest.fn() }));
jest.mock("@/features/tenants/components/TenantEditDrawerById", () => ({ TenantEditDrawerById: () => null }));
jest.mock("@/features/users/components/FcmTestSendModal", () => ({ FcmTestSendModal: () => null }));
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: jest.fn(() => "wide") }));
const mockViewport = jest.mocked(useAdminViewport);
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
const mockTenants = jest.mocked(fetchUserTenants);
const mockTokens = jest.mocked(fetchUserFcmTokens);
const mockDeactivate = jest.mocked(deactivateFcmToken);

beforeEach(() => { jest.clearAllMocks(); mockViewport.mockReturnValue("wide"); });

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}><ConfigProvider locale={koKR} theme={{ token: { motion: false } }}><App>{children}</App></ConfigProvider></QueryClientProvider>;
}

test("임차인 2페이지를 요청하고 응답의 0-based 페이지와 전체 건수를 표시한다", async () => {
  mockTenants.mockImplementation(async (_id, params) => ({
    tenants: [{ tenantId: params?.page ?? 1, userId: 12, name: `임차인 ${params?.page}`, roomNumber: 101,
      rentPrice: 1, paymentDay: 1, billingTiming: "PREPAID", rentBillingCycle: "MONTHLY", startDate: "2026-01-01", endDate: null, notifyEnabled: false }],
    page: (params?.page ?? 1) - 1, size: params?.size ?? 20, totalElements: 25,
  }));
  render(<UserTenantsTab userId={12} />, { wrapper });
  expect(await screen.findByText("임차인 1")).toBeInTheDocument();
  expect(screen.getByText("총 25건")).toBeInTheDocument();
  fireEvent.click(screen.getByTitle("2"));
  expect(await screen.findByText("임차인 2")).toBeInTheDocument();
  expect(mockTenants).toHaveBeenLastCalledWith(12, { page: 2, size: 20 });
  expect(screen.getByTitle("2")).toHaveClass("ant-pagination-item-active");
});

test("FCM 토큰 목록도 서버 페이지를 넘기며 20건 뒤의 토큰에 접근할 수 있다", async () => {
  mockTokens.mockImplementation(async (_id, params) => ({
    fcmTokens: [{ fcmTokenId: params?.page ?? 1, userId: 12, value: `토큰 ${params?.page}`, platform: "IOS", silentWakeupSubscribed: false,
      createdAt: "2026-01-01", updatedAt: "2026-01-01" }],
    page: (params?.page ?? 1) - 1, size: params?.size ?? 20, totalElements: 25,
  }));
  render(<UserFcmTab userId={12} />, { wrapper });
  expect(await screen.findByText("토큰 1")).toBeInTheDocument();
  fireEvent.click(screen.getByTitle("2"));
  expect(await screen.findByText("토큰 2")).toBeInTheDocument();
  await waitFor(() => expect(mockTokens).toHaveBeenLastCalledWith(12, { page: 2, size: 20 }));
});

test("사용자 임차인 조회 실패는 빈 목록과 구분하며 재조회로 복구한다", async () => {
  mockTenants.mockRejectedValueOnce(new Error("network")).mockResolvedValue({ tenants: [], page: 0, size: 20, totalElements: 0 });
  render(<UserTenantsTab userId={12} />, { wrapper });
  expect(await screen.findByText("임차인 목록을 불러오지 못했습니다.")).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
  expect(await screen.findByRole("table")).toBeInTheDocument();
  expect(screen.queryByText("임차인 목록을 불러오지 못했습니다.")).not.toBeInTheDocument();
});

test("FCM 토큰 21건의 마지막 토큰을 비활성화하면 빈 2페이지에서 유효한 1페이지로 재조회한다", async () => {
  let total = 21;
  mockTokens.mockImplementation(async (_id, params) => {
    const page = params?.page ?? 1;
    const size = params?.size ?? 20;
    const count = Math.max(0, Math.min(size, total - (page - 1) * size));
    return {
      fcmTokens: Array.from({ length: count }, (_, index) => {
        const id = (page - 1) * size + index + 1;
        return { fcmTokenId: id, userId: 12, value: `토큰 ${id}`, platform: "IOS", silentWakeupSubscribed: false,
          createdAt: "2026-01-01", updatedAt: "2026-01-01" };
      }),
      page: page - 1, size, totalElements: total,
    };
  });
  mockDeactivate.mockImplementation(async () => { total = 20; });
  render(<UserFcmTab userId={12} />, { wrapper });
  expect(await screen.findByText("토큰 1")).toBeInTheDocument();
  fireEvent.click(screen.getByTitle("2"));
  expect(await screen.findByText("토큰 21")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "토큰 #21 더보기" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "비활성화" }));
  fireEvent.click(await screen.findByRole("button", { name: "비활성화" }));
  await waitFor(() => expect(mockDeactivate).toHaveBeenCalledWith(21));
  await waitFor(() => expect(mockTokens).toHaveBeenLastCalledWith(12, { page: 1, size: 20 }));
  expect(await screen.findByText("총 20건")).toBeInTheDocument();
  expect(screen.getByText("토큰 1")).toBeInTheDocument();
  expect(screen.queryByText("토큰 21")).not.toBeInTheDocument();
  expect(screen.getByTitle("1")).toHaveClass("ant-pagination-item-active");
});

test("임차인 21→20건 재조회로 마지막 페이지가 사라지면 요청 페이지를 1로 보정한다", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let total = 21;
  mockTenants.mockImplementation(async (_id, params) => {
    const page = params?.page ?? 1;
    return {
      tenants: page === 1 || total > 20 ? [{ tenantId: page === 1 ? 1 : 21, userId: 12, name: `임차인 ${page === 1 ? 1 : 21}`, roomNumber: 101,
        rentPrice: 1, paymentDay: 1, billingTiming: "PREPAID" as const, rentBillingCycle: "MONTHLY" as const, startDate: "2026-01-01", endDate: null, notifyEnabled: false }] : [],
      page: page - 1, size: params?.size ?? 20, totalElements: total,
    };
  });
  render(<QueryClientProvider client={client}><App><UserTenantsTab userId={12} /></App></QueryClientProvider>);
  expect(await screen.findByText("임차인 1")).toBeInTheDocument();
  fireEvent.click(screen.getByTitle("2"));
  expect(await screen.findByText("임차인 21")).toBeInTheDocument();
  total = 20;
  await act(async () => { await client.invalidateQueries({ queryKey: userKeys.tenants(12) }); });
  await waitFor(() => expect(mockTenants).toHaveBeenLastCalledWith(12, { page: 1, size: 20 }));
  expect(await screen.findByText("총 20건")).toBeInTheDocument();
  expect(screen.getByText("임차인 1")).toBeInTheDocument();
  expect(screen.queryByText("임차인 21")).not.toBeInTheDocument();
  expect(screen.getByTitle("1")).toHaveClass("ant-pagination-item-active");
});

test("사용자 임차인 검색은 URL의 서버 조건을 복원하고 다른 탭 상태를 유지하며 상세로 돌아갈 경로를 제공한다", async () => {
  mockTenants.mockImplementation(async (_id, params) => ({
    tenants: [{ tenantId: 7, userId: 12, name: "홍길동", propertyId: 8, propertyName: "신관", roomNumber: "A101", phone: "010-****-5678", rentPrice: 1, paymentDay: 1, billingTiming: "PREPAID", rentBillingCycle: "MONTHLY", startDate: "2026-01-01", endDate: null, notifyEnabled: false }],
    page: (params?.page ?? 1) - 1, size: params?.size ?? 20, totalElements: 81,
  }));
  const changed = jest.fn();
  function ControlledTab() {
    const [query, setQuery] = useState("tab=tenants&tenantPage=3&tenantKeyword=홍길동&tenantContractStatus=ACTIVE&tenantNotifyEnabled=false&fcmPage=2&returnTo=%2Fusers%3Fpage%3D4");
    return <UserTenantsTab userId={12} navigation={{ query, returnPath: `/users/12?${query}`, update: (changes) => {
      const next = new URLSearchParams(query); for (const [key, value] of Object.entries(changes)) { if (value === undefined) next.delete(key); else next.set(key, value); }
      changed(next); setQuery(next.toString());
    } }} />;
  }
  render(<ControlledTab />, { wrapper });
  expect(await screen.findByRole("row", { name: /홍길동.*신관.*A101/ })).toBeVisible();
  expect(mockTenants).toHaveBeenLastCalledWith(12, { page: 3, size: 20, keyword: "홍길동", contractStatus: "ACTIVE", notifyEnabled: false });
  const detail = new URL(screen.getByRole("link", { name: "상세" }).getAttribute("href")!, "https://landy.internal");
  expect(detail.searchParams.get("returnTo")).toContain("tenantPage=3");
  expect(detail.searchParams.get("returnTo")).toContain("tab=tenants");
  fireEvent.change(screen.getByLabelText("이름·전화번호·호실"), { target: { value: " A101 " } });
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(mockTenants).toHaveBeenLastCalledWith(12, { page: 1, size: 20, keyword: "A101", contractStatus: "ACTIVE", notifyEnabled: false }));
  fireEvent.change(screen.getByLabelText("이름·전화번호·호실"), { target: { value: "010-1234" } });
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(mockTenants).toHaveBeenLastCalledWith(12, { page: 1, size: 20, keyword: "010-1234", contractStatus: "ACTIVE", notifyEnabled: false }));
  const next = changed.mock.calls.at(-1)![0] as URLSearchParams;
  expect(next.get("fcmPage")).toBe("2"); expect(next.get("returnTo")).toBe("/users?page=4");
});

test("FCM 필터는 false 구독값과 플랫폼을 서버에 전달하고 초기화해도 사용자 하위 다른 목록 상태를 유지한다", async () => {
  mockTokens.mockResolvedValue({ fcmTokens: [], page: 0, size: 20, totalElements: 0 });
  const changed = jest.fn();
  function ControlledTab() {
    const [query, setQuery] = useState("tab=fcm&fcmPlatform=ANDROID&fcmSilentWakeupSubscribed=false&fcmFcmTokenId=99&tenantPage=3");
    return <UserFcmTab userId={12} navigation={{ query, returnPath: `/users/12?${query}`, update: (changes) => {
      const next = new URLSearchParams(query); for (const [key, value] of Object.entries(changes)) { if (value === undefined) next.delete(key); else next.set(key, value); }
      changed(next); setQuery(next.toString());
    } }} />;
  }
  render(<ControlledTab />, { wrapper });
  await waitFor(() => expect(mockTokens).toHaveBeenLastCalledWith(12, { page: 1, size: 20, platform: "ANDROID", silentWakeupSubscribed: false, fcmTokenId: 99 }));
  fireEvent.click(screen.getAllByRole("button", { name: "필터 초기화" })[0]);
  await waitFor(() => expect(mockTokens).toHaveBeenLastCalledWith(12, { page: 1, size: 20 }));
  const next = changed.mock.calls.at(-1)![0] as URLSearchParams;
  expect(next.get("tenantPage")).toBe("3"); expect(next.get("tab")).toBe("fcm");
});


test("모바일 기기 카드는 마스킹 토큰의 추가 정보와 확인 후 비활성화·재조회 동작을 유지한다", async () => {
  mockViewport.mockReturnValue("mobile");
  let active = true;
  mockTokens.mockImplementation(async (_id, params) => ({
    fcmTokens: active ? [{ fcmTokenId: 88, userId: 12, value: "abcdefghij...", platform: "ANDROID", silentWakeupSubscribed: false, createdAt: "2026-01-01", updatedAt: "2026-01-02" }] : [],
    page: 0, size: params?.size ?? 20, totalElements: active ? 1 : 0,
  }));
  mockDeactivate.mockImplementation(async () => { active = false; });
  render(<UserFcmTab userId={12} />, { wrapper });
  const card = await screen.findByRole("article", { name: "토큰 #88" });
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(within(card).getByRole("button", { name: "테스트 발송" })).toBeVisible();
  fireEvent.click(within(card).getByText("추가 정보"));
  await waitFor(() => expect(within(card).getByText("abcdefghij...")).toBeVisible());
  fireEvent.click(within(card).getByRole("button", { name: "토큰 #88 더보기" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "비활성화" }));
  const dialog = await screen.findByRole("dialog", { name: "토큰을 비활성화하시겠습니까?" });
  await waitFor(() => expect(dialog).toBeVisible());
  await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "비활성화" })); });
  await waitFor(() => expect(mockDeactivate).toHaveBeenCalledWith(88));
  await waitFor(() => expect(screen.queryByRole("article", { name: "토큰 #88" })).not.toBeInTheDocument());
  expect(await screen.findByText("조회 결과 0건")).toBeVisible();
});
