import "@/test-utils/antd";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import NotificationsPage from "@/app/(admin)/notifications/page";
import OutboxPage from "@/app/(admin)/notifications/outbox/page";
import BatchPage from "@/app/(admin)/batch/page";
import AlimtalkPage from "@/app/(admin)/alimtalk/page";
import { useBatchExecutions } from "@/features/batch/hooks";
import { useAlimtalks } from "@/features/alimtalk/hooks";
import { useNotifications, useOutbox } from "@/features/notifications/hooks";
import { fetchTenants } from "@/features/tenants/api";
import { relatedListPath } from "@/lib/navigation/listReturn";

let mockQuery = "";
const mockPush = jest.fn();
const mockNotificationResult = { data: { notifications: [] as { notificationId: number }[], totalElements: 0 }, isLoading: false };
const mockOutboxResult = { data: { outboxes: [], totalElements: 0 }, isLoading: false };
jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mockQuery), useRouter: () => ({ push: mockPush }) }));
jest.mock("@/features/notifications/hooks", () => ({
  useNotifications: jest.fn(() => mockNotificationResult),
  useOutbox: jest.fn(() => mockOutboxResult),
  useDispatchNotifications: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/features/notifications/components/NotificationTable", () => {
  const { PagedTable } = jest.requireActual("@/components/PagedTable");
  return { NotificationTable: ({ data, ...props }: { data: { notificationId: number }[] }) => <PagedTable {...props} columns={[{ title: "알림 ID", dataIndex: "notificationId" }]} dataSource={data} rowKey="notificationId" /> };
});
jest.mock("@/features/notifications/components/OutboxTable", () => ({ OutboxTable: () => <div>대기열 결과</div> }));
jest.mock("@/features/notifications/components/SendNotificationModal", () => ({ SendNotificationModal: () => null }));
jest.mock("@/features/batch/hooks", () => ({
  useBatchExecutions: jest.fn(() => ({ data: { executions: [], totalElements: 0 }, isLoading: false })),
  useBatchJobs: () => ({ data: { jobNames: ["dailyDispatchAuditJob"] }, isLoading: false }),
}));
jest.mock("@/features/batch/components/BatchExecutionTable", () => ({ BatchExecutionTable: () => <div>배치 결과</div> }));
jest.mock("@/features/alimtalk/hooks", () => ({
  useAlimtalks: jest.fn(() => ({ data: { alimtalks: [], totalElements: 0 }, isLoading: false })),
  useAlimtalkTemplates: () => ({ data: { templates: [] }, isLoading: false }),
}));
jest.mock("@/features/alimtalk/components/AlimtalkHistoryTable", () => ({ AlimtalkHistoryTable: () => <div>알림톡 결과</div> }));
jest.mock("@/features/alimtalk/components/AlimtalkTestSendModal", () => ({ AlimtalkTestSendModal: () => null }));
jest.mock("@/features/users/api", () => ({
  fetchUsers: jest.fn(async ({ keyword, userId }: { keyword?: string; userId?: number }) => ({ users: [7, 12, 19, 42].filter((id) => userId !== undefined ? id === userId : !keyword || String(id) === keyword).map((userId) => ({ userId, email: `user${userId}@example.com`, phone: "010-****-1234" })) })),
  fetchUser: jest.fn(async (userId: number) => ({ userId, email: `user${userId}@example.com` })),
}));
jest.mock("@/features/tenants/api", () => ({ fetchTenants: jest.fn(async () => ({ tenants: [] })), fetchTenant: jest.fn(async (tenantId: number) => ({ tenantId, userId: 7, name: "임차인", roomNumber: "101", propertyName: "신관" })) }));

function renderPage(Page: React.ComponentType) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<Page />, { wrapper: ({ children }) => <QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App>{children}</App></ConfigProvider></QueryClientProvider> });
}
async function chooseUser(userId: number, label = "유저") {
  const input = screen.getByRole("combobox", { name: label });
  fireEvent.mouseDown(input); fireEvent.change(input, { target: { value: String(userId) } });
  fireEvent.click(await screen.findByText(`user${userId}@example.com · 010-****-1234 · #${userId}`, { selector: ".ant-select-item-option-content" }));
  await waitFor(() => expect(input.closest(".ant-select")).toHaveTextContent(`user${userId}@example.com`));
}

beforeEach(() => {
  mockQuery = "";
  jest.clearAllMocks();
  mockNotificationResult.data = { notifications: [], totalElements: 0 };
});

test("알림 필터는 입력만으로 이동하지 않고 조회 시 모든 필터를 한 번에 적용한다", async () => {
  mockQuery = "page=3&size=50&userId=7&tenantId=99&type=CUSTOM&isRead=false";
  renderPage(NotificationsPage);
  await chooseUser(12, "수신 유저");
  expect(screen.getByRole("combobox", { name: "임차인" }).closest(".ant-select")).not.toHaveTextContent("임차인 #99");
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "임차인" }));
  await waitFor(() => expect(fetchTenants).toHaveBeenLastCalledWith({ page: 1, size: 20, userId: 12, keyword: undefined }));
  expect(mockPush).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "조회" })); });
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  const params = new URLSearchParams(mockPush.mock.calls[0][0].slice(1));
  expect(Object.fromEntries(params)).toEqual({ page: "1", size: "50", userId: "12", type: "CUSTOM", isRead: "false" });
});

test("알림 초기화는 아직 적용하지 않은 입력을 같은 URL에서도 비운다", async () => {
  renderPage(NotificationsPage);
  await chooseUser(42, "수신 유저");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "초기화" })); });
  expect(screen.getByRole("combobox", { name: "수신 유저" })).toHaveValue("");
  expect(screen.queryByText(/user42@example.com/, { selector: ".ant-select-selection-item" })).not.toBeInTheDocument();
  expect(mockPush).toHaveBeenCalledWith("?page=1");
});

test("페이지 이동은 미제출 필터 입력을 지우지 않는다", async () => {
  mockQuery = "page=1&userId=7";
  const view = renderPage(NotificationsPage);
  await chooseUser(42, "수신 유저");
  mockQuery = "page=2&userId=7";
  view.rerender(<NotificationsPage />);
  expect(screen.getByRole("combobox", { name: "수신 유저" }).closest(".ant-select")).toHaveTextContent("user42@example.com");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "조회" })); });
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("?page=1&userId=42"));
});

test("URL에서 적용 필터가 바뀌면 폼 표시와 제출 값이 새 조건을 따른다", async () => {
  mockQuery = "page=1&userId=7&type=CUSTOM";
  const view = renderPage(NotificationsPage);
  await chooseUser(42, "수신 유저");
  mockQuery = "page=1&userId=19&type=DUE";
  view.rerender(<NotificationsPage />);
  await waitFor(() => expect(screen.getByRole("combobox", { name: "수신 유저" }).closest(".ant-select")).toHaveTextContent("user19@example.com"));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "조회" })); });
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("?page=1&userId=19&type=DUE"));
});

test("Outbox 초기화는 page size를 보존하며 적용 조건과 미제출 코드를 비운다", async () => {
  mockQuery = "page=4&size=50&userId=7&status=FAILED&errorCode=INTERNAL";
  renderPage(OutboxPage);
  await act(async () => { fireEvent.change(screen.getByLabelText("에러 코드"), { target: { value: "NEW_CODE" } }); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "초기화" })); });
  expect(screen.getByLabelText("에러 코드")).toHaveValue("");
  expect(screen.getByRole("combobox", { name: "유저" })).toHaveValue("");
  expect(mockPush).toHaveBeenCalledWith("?page=1&size=50");
});

test("유효하지 않은 배치 날짜와 페이지 값을 API나 날짜 컨트롤로 보내지 않는다", async () => {
  mockQuery = "page=-1&size=1000&targetDateFrom=2026-02-31&targetDateTo=not-a-date";
  renderPage(BatchPage);
  expect(useBatchExecutions).toHaveBeenCalledWith(expect.objectContaining({ page: 1, size: 20, targetDateFrom: undefined, targetDateTo: undefined }));
  expect(screen.getByRole("heading", { name: "배치 실행 이력", level: 1 })).toBeInTheDocument();
});

test("알림톡 이력 초기화는 이력 탭과 size를 남기고 두 날짜와 ID를 함께 비운다", async () => {
  mockQuery = "tab=history&page=3&size=50&userId=7&tenantId=12&from=2026-10-01&to=2026-10-04";
  renderPage(AlimtalkPage);
  expect(useAlimtalks).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, tenantId: 12, from: "2026-10-01", to: "2026-10-04" }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "초기화" })); });
  expect(mockPush).toHaveBeenCalledWith("?tab=history&page=1&size=50");
});

test.each([
  { name: "배치", Page: BatchPage, query: "page=3&size=50", from: "targetDateFrom", to: "targetDateTo", apiHook: useBatchExecutions },
  { name: "알림톡 이력", Page: AlimtalkPage, query: "tab=history&page=3&size=50", from: "from", to: "to", apiHook: useAlimtalks },
])("$name 시작일만 직접 입력하고 blur 직후 조회하면 URL과 API 조건에 포함한다", async ({ Page, query, from, to, apiHook }) => {
  mockQuery = query;
  const view = renderPage(Page);
  const start = screen.getByLabelText("대상 날짜");
  revealField(start);
  const search = screen.getByRole("button", { name: "조회" });
  fireEvent.focus(start);
  fireEvent.change(start, { target: { value: "2026-10-17" } });
  fireEvent.blur(start);
  // Picker의 지연된 onChange를 기다리지 않고 바로 다음 사용자 행동을 수행한다.
  fireEvent.click(search);
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  const params = new URLSearchParams(mockPush.mock.calls[0][0].slice(1));
  expect(params.get(from)).toBe("2026-10-17");
  expect(params.has(to)).toBe(false);
  expect(params.get("page")).toBe("1");
  expect(params.get("size")).toBe("50");

  mockQuery = params.toString();
  view.rerender(<Page />);
  expect(apiHook).toHaveBeenLastCalledWith(expect.objectContaining({
    page: 1, size: 50, [from]: "2026-10-17", [to]: undefined,
  }));
});

function revealField(input: HTMLElement) {
  const disclosure = input.closest("details");
  if (disclosure && !disclosure.open) fireEvent.click(disclosure.querySelector(":scope > summary")!);
}
function rangeInputs(label: string) {
  const start = screen.getByLabelText(label) as HTMLInputElement;
  revealField(start);
  const inputs = start.closest(".ant-picker")!.querySelectorAll<HTMLInputElement>("input");
  return [inputs[0], inputs[1]];
}
function enterRange(label: string, start?: string, end?: string) {
  const inputs = rangeInputs(label);
  for (const [index, value] of [[0, start], [1, end]] as const) {
    if (value === undefined) continue;
    fireEvent.focus(inputs[index]); fireEvent.change(inputs[index], { target: { value } }); fireEvent.blur(inputs[index]);
  }
}

test("알림 생성일 blur 직후 조회한 조건과 서버 전체 건수는 다음 페이지 요청에서도 보존한다", async () => {
  mockQuery = "page=3&size=50&userId=7&tenantId=12&notificationId=90&keyword=%ED%99%8D&isRead=false&targetFrom=2026-10-01";
  mockNotificationResult.data = { notifications: [{ notificationId: 90 }], totalElements: 120 };
  const view = renderPage(NotificationsPage);
  await act(async () => { enterRange("생성일", "2026-10-04", "2026-10-05"); fireEvent.click(screen.getByRole("button", { name: "조회" })); });
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  const query = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(Object.fromEntries(query)).toEqual({ page: "1", size: "50", userId: "7", tenantId: "12", notificationId: "90", keyword: "홍", isRead: "false", targetFrom: "2026-10-01", createdFrom: "2026-10-04", createdTo: "2026-10-05" });
  mockQuery = query.toString(); view.rerender(<NotificationsPage />);
  expect(useNotifications).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, size: 50, userId: 7, tenantId: 12, notificationId: 90, keyword: "홍", isRead: false, targetFrom: "2026-10-01", createdFrom: "2026-10-04", createdTo: "2026-10-05" }));
  expect(screen.getByText("총 120건")).toBeVisible();
  fireEvent.click(screen.getByTitle("2"));
  const next = new URLSearchParams(mockPush.mock.calls.at(-1)![0]);
  expect(next.get("page")).toBe("2"); next.set("page", "1"); expect(next.toString()).toBe(query.toString());
});

test("Outbox의 종료일만 지정한 마지막 시도 범위와 발송 기간은 서로 독립된 API 조건으로 전달한다", async () => {
  mockQuery = "page=3&size=50&notificationId=90&fcmTokenId=99&status=FAILED&errorCode=INTERNAL";
  const view = renderPage(OutboxPage);
  await act(async () => {
    enterRange("마지막 시도일", undefined, "2026-10-05"); enterRange("발송일", "2026-10-01", "2026-10-04");
    fireEvent.click(screen.getByRole("button", { name: "조회" }));
  });
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  const query = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(Object.fromEntries(query)).toEqual({ page: "1", size: "50", notificationId: "90", fcmTokenId: "99", status: "FAILED", errorCode: "INTERNAL", lastAttemptedTo: "2026-10-05", sentFrom: "2026-10-01", sentTo: "2026-10-04" });
  mockQuery = query.toString(); view.rerender(<OutboxPage />);
  expect(useOutbox).toHaveBeenLastCalledWith(expect.objectContaining({ notificationId: 90, fcmTokenId: 99, lastAttemptedFrom: undefined, lastAttemptedTo: "2026-10-05", sentFrom: "2026-10-01", sentTo: "2026-10-04" }));
});

test("배치 실제 실행일을 입력해도 기존 대상 날짜는 유지하고 별도의 서버 범위로 조회한다", async () => {
  mockQuery = "page=3&size=50&executionId=90&status=FAILED&targetDateFrom=2026-09-01&targetDateTo=2026-09-03";
  const view = renderPage(BatchPage);
  await act(async () => { enterRange("실제 실행일", "2026-10-04", "2026-10-05"); fireEvent.click(screen.getByRole("button", { name: "조회" })); });
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  const query = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(Object.fromEntries(query)).toEqual({ page: "1", size: "50", executionId: "90", status: "FAILED", targetDateFrom: "2026-09-01", targetDateTo: "2026-09-03", startedFrom: "2026-10-04", startedTo: "2026-10-05" });
  mockQuery = query.toString(); view.rerender(<BatchPage />);
  expect(useBatchExecutions).toHaveBeenLastCalledWith(expect.objectContaining({ executionId: 90, targetDateFrom: "2026-09-01", targetDateTo: "2026-09-03", startedFrom: "2026-10-04", startedTo: "2026-10-05" }));
});

test("알림톡 발송 요청일은 대상 날짜와 구분하고 메시지 ID·알림톡 ID 조건을 함께 전달한다", async () => {
  mockQuery = "tab=history&page=3&size=50&alimtalkId=90&from=2026-09-01&to=2026-09-03";
  const view = renderPage(AlimtalkPage);
  await act(async () => {
    revealField(screen.getByLabelText("메시지 ID"));
    fireEvent.change(screen.getByLabelText("메시지 ID"), { target: { value: "  provider-123  " } });
    enterRange("발송 요청일", "2026-10-04", "2026-10-05"); fireEvent.click(screen.getByRole("button", { name: "조회" }));
  });
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  const query = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(Object.fromEntries(query)).toEqual({ tab: "history", page: "1", size: "50", alimtalkId: "90", from: "2026-09-01", to: "2026-09-03", messageId: "provider-123", requestedFrom: "2026-10-04", requestedTo: "2026-10-05" });
  mockQuery = query.toString(); view.rerender(<AlimtalkPage />);
  expect(useAlimtalks).toHaveBeenLastCalledWith(expect.objectContaining({ alimtalkId: 90, messageId: "provider-123", from: "2026-09-01", to: "2026-09-03", requestedFrom: "2026-10-04", requestedTo: "2026-10-05" }));
});

test("사용자·임차인 관계 링크로 열린 알림톡은 해당 조건의 발송 이력 탭을 바로 표시한다", () => {
  const path = relatedListPath("/alimtalk", { userId: 7, tenantId: 12 }, "/users/7?tab=tenants&tenantPage=3");
  mockQuery = new URL(path, "https://admin.test").searchParams.toString();
  renderPage(AlimtalkPage);
  expect(screen.getByRole("tab", { name: "발송 이력" })).toHaveAttribute("aria-selected", "true");
  expect(useAlimtalks).toHaveBeenLastCalledWith(expect.objectContaining({ userId: 7, tenantId: 12 }));
  expect(new URLSearchParams(mockQuery).get("returnTo")).toBe("/users/7?tab=tenants&tenantPage=3");
});

test("알림톡 조회 전 임대인을 바꾸면 이전 임차인을 해제하고 새 임대인의 임차인을 검색한다", async () => {
  mockQuery = "tab=history&page=3&size=50&userId=7&tenantId=12";
  renderPage(AlimtalkPage);
  await chooseUser(19);
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "임차인" }));
  await waitFor(() => expect(fetchTenants).toHaveBeenLastCalledWith({ page: 1, size: 20, userId: 19, keyword: undefined }));
  expect(mockPush).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("?tab=history&page=1&size=50&userId=19"));
});


test("Outbox 상세 조건을 다시 접어도 미제출 ID를 보존하고 조회에 포함한다", async () => {
  renderPage(OutboxPage);
  const id = screen.getByLabelText("알림 ID");
  const disclosure = id.closest("details")!;
  expect(disclosure.open).toBe(false);
  revealField(id);
  fireEvent.change(id, { target: { value: "909" } });
  fireEvent.click(disclosure.querySelector(":scope > summary")!);
  expect(disclosure.open).toBe(false);
  expect(id).toHaveValue("909");
  expect(mockPush).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "조회" })); });
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("?page=1&notificationId=909"));
});
