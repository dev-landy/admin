import "@/test-utils/antd";
import { act, fireEvent, render as renderReact, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserSubscriptionTab } from "@/features/subscriptions/components/UserSubscriptionTab";
import { SubscriptionGrantDialog } from "@/features/subscriptions/components/SubscriptionGrantDialog";
import { SubscriptionRevokeDialog } from "@/features/subscriptions/components/SubscriptionRevokeDialog";
import { formatSubscriptionTime, parseGrantExpiration } from "@/features/subscriptions/format";
import * as api from "@/features/subscriptions/api";
import type { SubscriptionDetail, SubscriptionGrant } from "@/features/subscriptions/types";

jest.mock("@/features/subscriptions/api");
const fetchSubscription = jest.mocked(api.fetchSubscription);
const render = (ui: ReactElement) => renderReact(ui, { wrapper: ({ children }: { children: ReactNode }) =>
  <ConfigProvider theme={{ token: { motion: false } }}>{children}</ConfigProvider> });

const grant: SubscriptionGrant = {
  grantId: 20, entitlementKey: "pro", startsAt: "2026-11-09T00:00:00Z", expiresAt: null,
  permanent: true, active: true, createdByKind: "ADMIN", createdByAdminId: 1, createdByOperator: null,
  reason: "베타 지원", requestKey: "grant-20", revokedAt: null, revokedByAdminId: null,
  revokeReason: null, createdAt: "2026-11-09T09:00:00", deletedAt: null,
};
const detail = (overrides: Partial<SubscriptionDetail> = {}): SubscriptionDetail => ({
  userId: 7, appUserId: "400efb37-fa6a-4481-99b4-34de181e8c94", withdrawnAt: null,
  effectiveAccess: { tier: "PRO", active: true, permanent: true, validUntil: null,
    verificationRequiredAt: null, verificationState: "FRESH", sources: ["SERVER_GRANT"] },
  grants: [grant], storeSubscriptions: [], syncStatuses: [], ...overrides,
});
const mountTab = (readOnly = false) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><App><UserSubscriptionTab userId={7} email="test@example.com" readOnly={readOnly} /></App></QueryClientProvider>);
};
beforeEach(() => { jest.clearAllMocks(); fetchSubscription.mockResolvedValue(detail()); });

test("한국 시간 입력을 UTC로 바꾸고 잘못된 날짜와 과거 종료를 거절한다", () => {
  const now = Date.parse("2026-11-09T00:00:00Z");
  expect(parseGrantExpiration("2026-11-10T09:30", now)).toBe("2026-11-10T00:30:00.000Z");
  expect(parseGrantExpiration("2026-11-09T09:00", now)).toBeNull();
  expect(parseGrantExpiration("2027-02-30T10:00", now)).toBeNull();
  expect(parseGrantExpiration("invalid", now)).toBeNull();
  expect(formatSubscriptionTime("2026-11-09T00:30:00Z")).toContain("09:30");
});

test("서버 지급 상태와 스토어 자동 갱신을 분리하고 plan 없는 상품도 표시한다", async () => {
  fetchSubscription.mockResolvedValue(detail({ storeSubscriptions: [{
    id: 2, environment: "PRODUCTION", revenuecatSubscriptionId: "sub", productId: "prod", productIdentifier: "old_pro",
    plan: null, store: "PLAY_STORE", status: "active", givesAccess: true, active: true, autoRenewalStatus: "WILL_RENEW",
    currentPeriodEnd: "2027-01-01T00:00:00Z", accessEnd: null, verifiedAccessUntil: "2027-01-01T00:00:00Z",
    managementUrl: null, fetchedAt: "2026-11-09T00:00:00Z", deletedAt: null,
  }] }));
  mountTab();
  expect(await screen.findByText("Pro 이용 중")).toBeInTheDocument();
  expect(screen.getByText("기간 제한 없음")).toBeInTheDocument();
  expect(screen.getByText("자동 갱신 예정")).toBeInTheDocument();
  expect(screen.getByText("미분류")).toBeInTheDocument();
});

test("조회 실패를 무료 계정으로 표시하거나 지급 가능한 상태로 만들지 않는다", async () => {
  fetchSubscription.mockRejectedValue(new Error("offline"));
  mountTab();
  expect(await screen.findByText("구독 정보를 불러오지 못했습니다.")).toBeInTheDocument();
  expect(screen.queryByText("기본 이용 중")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Pro 혜택 지급" })).not.toBeInTheDocument();
});

test("서버가 탈퇴를 알려 주면 외부 readOnly 값이 false여도 지급과 재확인을 숨긴다", async () => {
  fetchSubscription.mockResolvedValue(detail({ withdrawnAt: "2026-11-09T10:00:00" }));
  mountTab();
  expect(await screen.findByText("탈퇴 계정은 이력 조회만 가능합니다.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Pro 혜택 지급" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "스토어 재확인" })).not.toBeInTheDocument();
});

test("서버 지급 회수는 선택한 grant와 사유만 전송한다", async () => {
  const submit = jest.fn().mockResolvedValue({ ...grant, revokedAt: "2026-11-09T01:00:00Z" });
  const close = jest.fn();
  render(<App><SubscriptionRevokeDialog userId={7} grant={grant} disabled={false} submit={submit} onClose={close} /></App>);
  fireEvent.click(screen.getByRole("button", { name: "선택한 지급 회수" }));
  await screen.findByText("회수 사유를 1~500자로 입력해 주세요.");
  expect(submit).not.toHaveBeenCalled();
  await act(async () => { fireEvent.change(screen.getByLabelText("회수 사유"), { target: { value: " 지원 종료 " } }); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "선택한 지급 회수" })); });
  await waitFor(() => expect(submit).toHaveBeenCalledWith({ grantId: 20, reason: "지원 종료" }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
});

test("지급 응답이 유실돼도 닫기 후 재시도는 최초 payload와 멱등 키를 재사용한다", async () => {
  const submit = jest.fn().mockRejectedValueOnce(new Error("lost response")).mockResolvedValue(grant);
  const close = jest.fn();
  const renderDialog = (open: boolean) => <App><SubscriptionGrantDialog userId={7} email="test@example.com" open={open} disabled={false} submit={submit} onClose={close} /></App>;
  const view = render(renderDialog(true));
  await act(async () => { fireEvent.click(screen.getByLabelText("영구")); });
  await act(async () => { fireEvent.change(screen.getByLabelText("지급 사유"), { target: { value: " 베타 지원 " } }); });
  const button = screen.getByRole("button", { name: "Pro 지급" });
  await act(async () => { fireEvent.click(button); fireEvent.click(button); });
  await screen.findByText("지급 결과를 확인하지 못했습니다. 같은 요청으로 다시 확인해 주세요.");
  expect(submit).toHaveBeenCalledTimes(1);
  const first = submit.mock.calls[0][0];
  expect(first.requestKey).toBeTruthy();
  expect(first.request).toEqual({ permanent: true, expiresAt: null, reason: "베타 지원" });
  expect(screen.getByLabelText("지급 사유")).toBeDisabled();
  view.rerender(renderDialog(false));
  view.rerender(renderDialog(true));
  fireEvent.click(screen.getByRole("button", { name: "같은 요청 다시 확인" }));
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  expect(submit.mock.calls[1][0]).toEqual(first);
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
});

test("기간제 지급은 미래 종료를 요구하고 한국 시간의 절대 시각을 전송한다", async () => {
  const submit = jest.fn().mockResolvedValue(grant);
  render(<App><SubscriptionGrantDialog userId={7} email="test@example.com" open disabled={false} submit={submit} onClose={jest.fn()} /></App>);
  await act(async () => { fireEvent.change(screen.getByLabelText("지급 사유"), { target: { value: "기간 지원" } }); });
  fireEvent.click(screen.getByRole("button", { name: "Pro 지급" }));
  await screen.findByText("현재보다 늦은 종료 시각을 입력해 주세요.");
  expect(submit).not.toHaveBeenCalled();
  await act(async () => { fireEvent.change(screen.getByLabelText("종료 시각 (한국 시간)"), { target: { value: "2099-01-01T09:00" } }); });
  fireEvent.click(screen.getByRole("button", { name: "Pro 지급" }));
  await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ request: {
    permanent: false, expiresAt: "2099-01-01T00:00:00.000Z", reason: "기간 지원",
  } })));
});

test("서버의 명확한 입력 거절은 내용을 수정할 수 있게 하며 새 요청으로 보낸다", async () => {
  const submit = jest.fn().mockRejectedValueOnce({ isAxiosError: true, response: { status: 400, data: {
    type: "invalid-grant", title: "입력 오류", status: 400, detail: "지급 내용을 확인해 주세요.",
  } } }).mockResolvedValue(grant);
  render(<App><SubscriptionGrantDialog userId={7} email="test@example.com" open disabled={false} submit={submit} onClose={jest.fn()} /></App>);
  await act(async () => { fireEvent.click(screen.getByLabelText("영구")); });
  await act(async () => { fireEvent.change(screen.getByLabelText("지급 사유"), { target: { value: "첫 요청" } }); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Pro 지급" })); });
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText("지급 사유")).not.toBeDisabled();
  await act(async () => { fireEvent.change(screen.getByLabelText("지급 사유"), { target: { value: "수정한 요청" } }); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Pro 지급" })); });
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  expect(submit.mock.calls[1][0].request.reason).toBe("수정한 요청");
  expect(submit.mock.calls[1][0].requestKey).not.toBe(submit.mock.calls[0][0].requestKey);
});

test("읽기 전용 전환 뒤 이미 열린 지급 창에서 요청하지 않는다", async () => {
  const submit = jest.fn();
  const renderDialog = (disabled: boolean) => <App><SubscriptionGrantDialog userId={7} email="test@example.com" open disabled={disabled} submit={submit} onClose={jest.fn()} /></App>;
  const view = render(renderDialog(false));
  await act(async () => { fireEvent.click(screen.getByLabelText("영구")); });
  await act(async () => { fireEvent.change(screen.getByLabelText("지급 사유"), { target: { value: "지원" } }); });
  view.rerender(renderDialog(true));
  expect(screen.getByRole("button", { name: "Pro 지급" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Pro 지급" }));
  await act(async () => {});
  expect(submit).not.toHaveBeenCalled();
});

test("화면 조회 자체는 재확인을 요청하지 않고 명시 동작은 운영 환경으로 한 번 요청한다", async () => {
  const reconcile = jest.mocked(api.reconcileSubscription).mockResolvedValue({ environment: "PRODUCTION", state: "SUCCEEDED",
    requestedGeneration: 1, appliedGeneration: 1, nextAttemptAt: null, attempts: 0, lastErrorCode: null, lastSuccessAt: null });
  mountTab();
  await screen.findByText("Pro 이용 중");
  expect(reconcile).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "스토어 재확인" }));
  await waitFor(() => expect(reconcile).toHaveBeenCalledWith(7, "PRODUCTION"));
  await screen.findByText("스토어 재확인을 요청했습니다.");
  expect(fetchSubscription.mock.calls.length).toBeGreaterThan(1);
});

test("회수 이력에서도 스토어 취소 동작을 제공하지 않는다", async () => {
  mountTab();
  await screen.findByText("Pro 이용 중");
  fireEvent.click(screen.getByRole("button", { name: "Pro 혜택 지급" }));
  const grantDialog = await screen.findByRole("dialog");
  fireEvent.click(within(grantDialog).getAllByRole("button", { name: "닫기" }).at(-1)!);
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  fireEvent.click(screen.getByText("서버 지급 이력 (1)"));
  fireEvent.click(await screen.findByRole("button", { name: "지급 #20 회수" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText(/스토어 결제는 해지되지 않습니다/)).toBeInTheDocument();
  expect(within(dialog).getByRole("textbox", { name: "회수 사유" })).toHaveAttribute("id", "subscription-revoke-7-20_reason");
});
