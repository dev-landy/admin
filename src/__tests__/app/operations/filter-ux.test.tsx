import "@/test-utils/antd";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import NotificationsPage from "@/app/(admin)/notifications/page";
import OutboxPage from "@/app/(admin)/notifications/outbox/page";
import BatchPage from "@/app/(admin)/batch/page";
import AlimtalkPage from "@/app/(admin)/alimtalk/page";
import { useBatchExecutions } from "@/features/batch/hooks";
import { useAlimtalks } from "@/features/alimtalk/hooks";

let mockQuery = "";
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mockQuery), useRouter: () => ({ push: mockPush }) }));
jest.mock("@/features/notifications/hooks", () => ({
  useNotifications: () => ({ data: { notifications: [], totalElements: 0 }, isLoading: false }),
  useOutbox: () => ({ data: { outboxes: [], totalElements: 0 }, isLoading: false }),
  useDispatchNotifications: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("@/features/notifications/components/NotificationTable", () => ({ NotificationTable: () => <div>알림 결과</div> }));
jest.mock("@/features/notifications/components/OutboxTable", () => ({ OutboxTable: () => <div>대기열 결과</div> }));
jest.mock("@/features/notifications/components/SendNotificationModal", () => ({ SendNotificationModal: () => null }));
jest.mock("@/features/batch/hooks", () => ({
  useBatchExecutions: jest.fn(() => ({ data: { executions: [], totalElements: 0 }, isLoading: false })),
  useBatchJobs: () => ({ data: { jobNames: ["dailyDispatchAuditJob"] }, isLoading: false }),
}));
jest.mock("@/features/batch/components/BatchExecutionTable", () => ({ BatchExecutionTable: () => <div>배치 결과</div> }));
jest.mock("@/features/alimtalk/hooks", () => ({
  useAlimtalks: jest.fn(() => ({ data: { alimtalks: [], totalElements: 0 }, isLoading: false })),
}));
jest.mock("@/features/alimtalk/components/AlimtalkHistoryTable", () => ({ AlimtalkHistoryTable: () => <div>알림톡 결과</div> }));
jest.mock("@/features/alimtalk/components/AlimtalkTestSendModal", () => ({ AlimtalkTestSendModal: () => null }));

beforeEach(() => {
  mockQuery = "";
  jest.clearAllMocks();
});

test("알림 필터는 입력만으로 이동하지 않고 조회 시 모든 필터를 한 번에 적용한다", async () => {
  mockQuery = "page=3&size=50&userId=7&type=CUSTOM&isRead=false";
  render(<NotificationsPage />);
  await act(async () => { fireEvent.change(screen.getByLabelText("유저 ID"), { target: { value: "12" } }); });
  expect(mockPush).not.toHaveBeenCalled();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "조회" })); });
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  const params = new URLSearchParams(mockPush.mock.calls[0][0].slice(1));
  expect(Object.fromEntries(params)).toEqual({ page: "1", size: "50", userId: "12", type: "CUSTOM", isRead: "false" });
});

test("알림 초기화는 아직 적용하지 않은 입력을 같은 URL에서도 비운다", async () => {
  render(<NotificationsPage />);
  const input = screen.getByLabelText("유저 ID");
  await act(async () => { fireEvent.change(input, { target: { value: "42" } }); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "초기화" })); });
  expect(screen.getByLabelText("유저 ID")).toHaveValue("");
  expect(mockPush).toHaveBeenCalledWith("?page=1");
});

test("페이지 이동은 미제출 필터 입력을 지우지 않는다", async () => {
  mockQuery = "page=1&userId=7";
  const view = render(<NotificationsPage />);
  await act(async () => { fireEvent.change(screen.getByLabelText("유저 ID"), { target: { value: "42" } }); });
  mockQuery = "page=2&userId=7";
  view.rerender(<NotificationsPage />);
  expect(screen.getByLabelText("유저 ID")).toHaveValue("42");
});

test("URL에서 적용 필터가 바뀌면 폼 표시와 제출 값이 새 조건을 따른다", async () => {
  mockQuery = "page=1&userId=7&type=CUSTOM";
  const view = render(<NotificationsPage />);
  await act(async () => { fireEvent.change(screen.getByLabelText("유저 ID"), { target: { value: "42" } }); });
  mockQuery = "page=1&userId=19&type=DUE";
  view.rerender(<NotificationsPage />);
  expect(screen.getByLabelText("유저 ID")).toHaveValue("19");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "조회" })); });
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("?page=1&userId=19&type=DUE"));
});

test("Outbox 초기화는 page size를 보존하며 적용 조건과 미제출 코드를 비운다", async () => {
  mockQuery = "page=4&size=50&userId=7&status=FAILED&errorCode=INTERNAL";
  render(<OutboxPage />);
  await act(async () => { fireEvent.change(screen.getByLabelText("에러 코드"), { target: { value: "NEW_CODE" } }); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "초기화" })); });
  expect(screen.getByLabelText("에러 코드")).toHaveValue("");
  expect(screen.getByLabelText("유저 ID")).toHaveValue("");
  expect(mockPush).toHaveBeenCalledWith("?page=1&size=50");
});

test("유효하지 않은 배치 날짜와 페이지 값을 API나 날짜 컨트롤로 보내지 않는다", async () => {
  mockQuery = "page=-1&size=1000&targetDateFrom=2026-02-31&targetDateTo=not-a-date";
  render(<BatchPage />);
  expect(useBatchExecutions).toHaveBeenCalledWith(expect.objectContaining({ page: 1, size: 20, targetDateFrom: undefined, targetDateTo: undefined }));
  expect(screen.getByRole("heading", { name: "배치 실행 이력", level: 1 })).toBeInTheDocument();
});

test("알림톡 이력 초기화는 이력 탭과 size를 남기고 두 날짜와 ID를 함께 비운다", async () => {
  mockQuery = "tab=history&page=3&size=50&userId=7&tenantId=12&from=2026-10-01&to=2026-10-04";
  render(<AlimtalkPage />);
  expect(useAlimtalks).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, tenantId: 12, from: "2026-10-01", to: "2026-10-04" }));
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "초기화" })); });
  expect(mockPush).toHaveBeenCalledWith("?tab=history&page=1&size=50");
});

test.each([
  { name: "배치", Page: BatchPage, query: "page=3&size=50", from: "targetDateFrom", to: "targetDateTo", apiHook: useBatchExecutions },
  { name: "알림톡 이력", Page: AlimtalkPage, query: "tab=history&page=3&size=50", from: "from", to: "to", apiHook: useAlimtalks },
])("$name 시작일만 직접 입력하고 blur 직후 조회하면 URL과 API 조건에 포함한다", async ({ Page, query, from, to, apiHook }) => {
  mockQuery = query;
  const view = render(<Page />);
  const start = screen.getByLabelText("대상 날짜");
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
