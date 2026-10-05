import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import UserDetailPage from "@/app/(admin)/users/[userId]/page";
import { UserDetailCard } from "@/features/users/components/UserDetailCard";
import { UserTenantsTab } from "@/features/users/components/UserTenantsTab";
import { UserFcmTab } from "@/features/users/components/UserFcmTab";
import { UserPropertiesTab } from "@/features/properties/components/UserPropertiesTab";
import { TenantSearchFields } from "@/features/tenants/components/TenantSearchFields";
import { FcmTestSendModal } from "@/features/users/components/FcmTestSendModal";
import type { UserDetail, AdminUserTenant } from "@/features/users/types";
import type { UserPropertySummary } from "@/features/properties/types";

let mockViewport = "wide";
let mockQuery = "returnTo=%2Fusers%3FaccountState%3DWITHDRAWN";
const mockPush = jest.fn();
const mockMutate = jest.fn();
const mockUserTenants = jest.fn();
const mockUserFcm = jest.fn();
const mockPreviewGlobal = jest.fn();
const user: UserDetail = { userId: 150, email: "withdrawn150@example.test", phone: null, provider: "KAKAO", role: "USER", status: "ONBOARDED", notifyDue: false, notifyOverdue: false, alimtalkEnabled: false, createdAt: "2026-01-01T09:00:00", updatedAt: "2026-10-05T15:42:09", deletedAt: "2026-10-05T15:42:09" };
const property: UserPropertySummary = { propertyId: 201, name: "보관 건물", address: "서울 보관로 1", activeTenantCount: 0, retainedTenantCount: 1, createdAt: "2026-01-01T09:00:00", updatedAt: "2026-10-05T15:42:09", deletedAt: "2026-10-05T15:42:09" };
const tenant: AdminUserTenant = { tenantId: 301, userId: 150, propertyId: 201, propertyName: null, name: "보관 임차인", phone: "010-1111-1234", roomNumber: null, rentPrice: 800000, maintenanceFee: 55000, depositAmount: 10000000, paymentDay: 5, billingTiming: "POSTPAID", rentBillingCycle: "MONTHLY", contractType: "ROOM", startDate: "2026-02-01", endDate: "2027-02-01", notifyEnabled: true, createdAt: "2026-01-20T09:00:00", deletedAt: "2026-10-05T15:42:09" };

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, replace: jest.fn() }), useSearchParams: () => new URLSearchParams(mockQuery) }));
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: () => mockViewport }));
jest.mock("@/features/users/hooks", () => ({
  useUser: () => ({ data: user, isLoading: false }),
  useUserTenants: (...args: unknown[]) => { mockUserTenants(...args); return { data: { tenants: [tenant], page: 0, size: 20, totalElements: 1 }, isLoading: false }; },
  useUserFcmTokens: (...args: unknown[]) => { mockUserFcm(...args); return { data: { fcmTokens: [{ fcmTokenId: 9, value: "cache-only-token", platform: "ANDROID" }], page: 0, size: 20, totalElements: 1 }, isLoading: false }; },
  useUpdateUserRole: () => ({ mutateAsync: mockMutate, isPending: false }), useUpdateUserNotifySettings: () => ({ mutate: mockMutate, isPending: false }),
  useUpdateUserAlimtalkEnabled: () => ({ mutate: mockMutate, isPending: false }), useDeleteUser: () => ({ mutateAsync: mockMutate, isPending: false }),
  useDeactivateFcmToken: () => ({ mutateAsync: mockMutate, isPending: false }), useUpdateFcmTokenSilentWakeupSubscription: () => ({ mutate: mockMutate, isPending: false }),
  useSendFcmTokenSilentMessage: () => ({ mutateAsync: mockMutate, isPending: false }),
}));
jest.mock("@/features/properties/hooks", () => ({ useUserProperties: () => ({ data: { properties: [property] }, isLoading: false }), useDeleteProperty: () => ({ mutateAsync: mockMutate, isPending: false }) }));
jest.mock("@/features/tenants/components/TenantSearchFields", () => ({ TenantSearchFields: jest.fn(() => null) }));
jest.mock("@/features/users/components/FcmTestSendModal", () => ({ FcmTestSendModal: jest.fn(() => null) }));
jest.mock("@/features/users/components/ImpersonationModal", () => ({ ImpersonationModal: () => { mockPreviewGlobal(); return null; } }));
jest.mock("@/features/properties/components/DeferredPropertyModals", () => ({ DeferredPropertyEditModal: () => { mockPreviewGlobal(); return null; }, DeferredPropertyTenantsModal: () => { mockPreviewGlobal(); return null; } }));
function shell(children: React.ReactNode) { return <ConfigProvider theme={{ token: { motion: false } }}><App>{children}</App></ConfigProvider>; }
beforeEach(() => { jest.clearAllMocks(); mockViewport = "wide"; mockQuery = "returnTo=%2Fusers%3FaccountState%3DWITHDRAWN"; });

test.each(["wide", "compact", "mobile"])("%s 탈퇴 상세는 저장된 상태와 탈퇴 시각을 보여 주고 계정 변경 UI를 만들지 않는다", (viewport) => {
  mockViewport = viewport;
  render(shell(<UserDetailCard user={user} />));
  expect(screen.getByText("탈퇴", { exact: true })).toBeVisible();
  expect(screen.getByText("2026-10-05 15:42:09")).toBeVisible();
  expect(screen.getByRole("heading", { name: "보관된 알림·권한 설정" })).toBeVisible();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(mockMutate).not.toHaveBeenCalled();
});

test("상세 재조회에서 탈퇴가 확인되면 이전 역할 변경 확인도 닫고 운영 요청을 실행하지 않는다", async () => {
  const view = render(shell(<UserDetailCard user={{ ...user, deletedAt: null }} />));
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "사용자 역할" }));
  fireEvent.click(await screen.findByText("관리자", { selector: ".ant-select-item-option-content" }));
  const dialog = await screen.findByRole("dialog", { name: "관리자 역할로 변경할까요?" });
  await waitFor(() => expect(dialog).toBeVisible());
  view.rerender(shell(<UserDetailCard user={user} />));
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  expect(screen.queryByRole("combobox", { name: "사용자 역할" })).not.toBeInTheDocument();
  expect(mockMutate).not.toHaveBeenCalled();
});

test("사용자 상세의 서버 탈퇴 상태가 전체 탭에 읽기 전용으로 전달되고 보관 범위를 설명한다", async () => {
  await act(async () => { render(shell(<UserDetailPage params={Promise.resolve({ userId: "150" })} />)); });
  expect(screen.getByText("탈퇴 계정 · 보관 정보 읽기 전용")).toBeVisible();
  expect(screen.getByText(/탈퇴 당시의 정확한 사본은 아닙니다/)).toBeVisible();
  expect(screen.getByRole("tab", { name: "보관 건물" })).toBeVisible();
  expect(screen.getByRole("tab", { name: "보관 임차인" })).toBeVisible();
  expect(screen.getByRole("button", { name: "보관 임차인 보기" })).toBeVisible();
  expect(screen.queryByRole("link", { name: "납부 내역" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /유저 #150 업무 더보기/ })).not.toBeInTheDocument();
  expect(mockPreviewGlobal).not.toHaveBeenCalled();
});

test("보관 건물의 임차인 전환은 이전 검색 조건을 비우고 동일 사용자·정렬·페이지 크기를 유지한다", () => {
  const query = new URLSearchParams({ propertySort: "name,asc", tenantKeyword: "이전 검색", tenantTenantId: "999", tenantPropertyId: "998", tenantContractType: "COMMERCIAL", tenantContractStatus: "ENDED", tenantNotifyEnabled: "true", tenantSort: "createdAt,asc", tenantSize: "50", tenantPage: "3", fcmSort: "updatedAt,desc" });
  const update = jest.fn((changes: Record<string, string | undefined>) => {
    for (const [key, value] of Object.entries(changes)) { if (value === undefined) query.delete(key); else query.set(key, value); }
  });
  render(shell(<UserPropertiesTab userId={150} readOnly navigation={{ query: query.toString(), returnPath: "/users/150", update }} />));
  expect(screen.getByRole("columnheader", { name: "보관 임차인" })).toBeVisible();
  expect(screen.getByText("1건")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "보관 임차인 보기" }));
  expect(update).toHaveBeenCalledWith({ tab: "tenants", tenantPropertyId: "201", tenantPage: "1", tenantKeyword: undefined, tenantTenantId: undefined, tenantContractType: undefined, tenantContractStatus: undefined, tenantNotifyEnabled: undefined });
  for (const key of ["tenantKeyword", "tenantTenantId", "tenantContractType", "tenantContractStatus", "tenantNotifyEnabled"]) expect(query.has(key)).toBe(false);
  expect(Object.fromEntries(query)).toEqual({ propertySort: "name,asc", tenantPropertyId: "201", tenantSort: "createdAt,asc", tenantSize: "50", tenantPage: "1", fcmSort: "updatedAt,desc", tab: "tenants" });
  expect(screen.queryByRole("button", { name: /더보기/ })).not.toBeInTheDocument();
  expect(mockPreviewGlobal).not.toHaveBeenCalled();
  expect(mockMutate).not.toHaveBeenCalled();
});

test("독립 보관 건물은 보유한 정보만 local 상세로 읽는다", () => {
  render(shell(<UserPropertiesTab userId={150} readOnly />));
  fireEvent.click(screen.getByRole("button", { name: "건물 정보" }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText(property.address!)).toBeVisible();
  expect(within(dialog).getByText("보관 임차인")).toBeVisible();
  expect(within(dialog).getByText("현재 활성 계약")).toBeVisible();
  expect(within(dialog).queryByRole("link")).not.toBeInTheDocument();
  expect(mockPreviewGlobal).not.toHaveBeenCalled();
});

test("보관 임차인 상세는 summary의 실제 기간·금액·연락처·삭제 시각을 읽고 없는 호실은 추론하지 않는다", () => {
  render(shell(<UserTenantsTab userId={150} readOnly navigation={{ query: "tenantPropertyId=201&tenantSort=createdAt,asc", returnPath: "/users/150?tab=tenants", update: jest.fn() }} />));
  expect(mockUserTenants).toHaveBeenCalledWith(150, 1, 20, { propertyId: 201, sort: "createdAt,asc" });
  expect(TenantSearchFields).not.toHaveBeenCalled();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "상세" }));
  const dialog = screen.getByRole("dialog");
  for (const value of [tenant.phone!, tenant.startDate, tenant.endDate!, "매월 · 80만원", "5.5만원", "1,000만원", "2026-10-05 15:42:09", "호실 정보 없음"]) expect(within(dialog).getByText(value)).toBeVisible();
  expect(within(dialog).queryByText(/주차/)).not.toBeInTheDocument();
  expect(within(dialog).queryByRole("link")).not.toBeInTheDocument();
  expect(within(dialog).queryByRole("switch")).not.toBeInTheDocument();
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockMutate).not.toHaveBeenCalled();
});

test("탈퇴 FCM 탭은 캐시의 토큰도 노출하지 않고 발송 컴포넌트를 만들지 않는다", () => {
  render(shell(<UserFcmTab userId={150} readOnly />));
  expect(screen.getByText(/탈퇴 시 기기 토큰은 삭제됩니다/)).toBeVisible();
  expect(screen.queryByText("cache-only-token")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /테스트 발송|비활성화|Silent/ })).not.toBeInTheDocument();
  expect(FcmTestSendModal).not.toHaveBeenCalled();
  expect(mockMutate).not.toHaveBeenCalled();
});
