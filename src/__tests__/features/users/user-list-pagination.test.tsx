import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import koKR from "antd/locale/ko_KR";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { UserTenantsTab } from "@/features/users/components/UserTenantsTab";
import { UserFcmTab } from "@/features/users/components/UserFcmTab";
import { deactivateFcmToken, fetchUserFcmTokens, fetchUserTenants } from "@/features/users/api";
import { userKeys } from "@/features/users/hooks";
import "@/test-utils/antd";

jest.mock("@/features/users/api", () => ({ fetchUserTenants: jest.fn(), fetchUserFcmTokens: jest.fn(), deactivateFcmToken: jest.fn() }));
jest.mock("@/features/tenants/components/TenantEditDrawerById", () => ({ TenantEditDrawerById: () => null }));
jest.mock("@/features/users/components/FcmTestSendModal", () => ({ FcmTestSendModal: () => null }));
const mockTenants = jest.mocked(fetchUserTenants);
const mockTokens = jest.mocked(fetchUserFcmTokens);
const mockDeactivate = jest.mocked(deactivateFcmToken);

beforeEach(() => jest.clearAllMocks());

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}><ConfigProvider locale={koKR}><App>{children}</App></ConfigProvider></QueryClientProvider>;
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
  fireEvent.click(screen.getByRole("button", { name: "비활성화" }));
  fireEvent.click(await screen.findByRole("button", { name: "확인" }));
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
