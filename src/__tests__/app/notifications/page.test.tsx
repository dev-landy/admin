import "@/test-utils/antd";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import koKR from "antd/locale/ko_KR";
import NotificationsPage from "@/app/(admin)/notifications/page";
import OutboxPage from "@/app/(admin)/notifications/outbox/page";
import { useNotifications, useOutbox } from "@/features/notifications/hooks";

let mockSearchParams = new URLSearchParams();
const mockPush = jest.fn();
const mockRefetch = jest.fn();
const mockDispatch = jest.fn();
const mockQuery = {
  data: undefined as undefined | { notifications: never[]; outboxes: { notificationOutboxEventId: number }[]; totalElements: number },
  isLoading: false, isFetching: false, error: null as unknown, refetch: mockRefetch,
};

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("@/features/notifications/hooks", () => ({
  useNotifications: jest.fn(() => mockQuery), useOutbox: jest.fn(() => mockQuery),
  useDispatchNotifications: () => ({ mutate: mockDispatch, isPending: false }),
}));
jest.mock("@/features/notifications/components/SendNotificationModal", () => ({ SendNotificationModal: () => null }));
jest.mock("@/features/notifications/components/NotificationTable", () => ({
  NotificationTable: ({ onFilterChange }: { onFilterChange: (key: string, value: number) => void }) =>
    <button onClick={() => onFilterChange("userId", 12)}>알림 사용자 필터</button>,
}));
jest.mock("@/features/notifications/components/OutboxTable", () => ({
  OutboxTable: ({ data, onFilterChange }: { data: { notificationOutboxEventId: number }[]; onFilterChange: (key: string, value: string) => void }) => <>
    {data.map((row) => <span key={row.notificationOutboxEventId}>Outbox #{row.notificationOutboxEventId}</span>)}
    <button onClick={() => onFilterChange("errorCode", "UNAVAILABLE")}>오류 코드 필터</button></>,
}));

function renderPage(page: "notifications" | "outbox") {
  return render(<ConfigProvider locale={koKR}><App>{page === "notifications" ? <NotificationsPage /> : <OutboxPage />}</App></ConfigProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams("page=3&size=50&userId=7");
  mockQuery.data = { notifications: [], outboxes: [], totalElements: 0 };
  mockQuery.error = null;
});

test("사용자 상세에서 전달한 ID로 알림을 조회하고 필터 변경 시 페이지를 초기화한다", () => {
  renderPage("notifications");
  expect(useNotifications).toHaveBeenCalledWith({ page: 3, size: 50, userId: 7, type: undefined, isRead: undefined });
  fireEvent.click(screen.getByRole("button", { name: "알림 사용자 필터" }));
  expect(mockPush).toHaveBeenCalledWith("?page=1&size=50&userId=12");
});

test("Outbox 사용자·오류 코드 필터를 서버에 전달하며 다른 조건을 유지한다", () => {
  mockSearchParams.set("status", "FAILED");
  mockSearchParams.set("errorCode", "INTERNAL");
  renderPage("outbox");
  expect(useOutbox).toHaveBeenCalledWith({ page: 3, size: 50, userId: 7, status: "FAILED", errorCode: "INTERNAL" });
  fireEvent.click(screen.getByRole("button", { name: "오류 코드 필터" }));
  expect(mockPush).toHaveBeenCalledWith("?page=1&size=50&userId=7&status=FAILED&errorCode=UNAVAILABLE");
});

test("서버의 outboxes 목록을 실제 표 데이터로 전달한다", () => {
  mockQuery.data = { notifications: [], outboxes: [{ notificationOutboxEventId: 4 }], totalElements: 1 };
  renderPage("outbox");
  expect(screen.getByText("Outbox #4")).toBeInTheDocument();
});

test.each(["notifications", "outbox"] as const)("%s 최초 조회 실패는 빈 목록 대신 재조회 안내를 표시한다", (page) => {
  mockQuery.data = undefined;
  mockQuery.error = new Error("network");
  renderPage(page);
  expect(screen.queryByRole("button", { name: /알림 사용자 필터|오류 코드 필터/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});

test("재조회 실패는 이전 목록을 남기되 최신 조회 실패를 명시한다", () => {
  mockQuery.error = new Error("network");
  renderPage("notifications");
  expect(screen.getByRole("button", { name: "알림 사용자 필터" })).toBeInTheDocument();
  expect(screen.getByText(/마지막으로 조회한 정보/)).toBeInTheDocument();
});

test("수동 발송의 부분 실패를 성공 건수와 구분해 표시한다", async () => {
  mockDispatch.mockImplementation((_size, options) => options.onSuccess({ processed: 5, sent: 2, failed: 1, skipped: 2, alreadyClaimed: 0 }));
  renderPage("outbox");
  fireEvent.click(screen.getByRole("button", { name: "수동 Dispatch" }));
  fireEvent.click(await screen.findByRole("button", { name: "확인" }));
  expect(await screen.findByText("5건 처리 · 발송 성공 2건")).toBeInTheDocument();
  expect(screen.getByText("실패 1건 · 건너뜀 2건 · 다른 경로에서 발송 중 0건")).toBeInTheDocument();
  expect(mockDispatch).toHaveBeenCalledTimes(1);
});

test("이전 서버의 빈 성공 응답은 undefined 건수나 자동 재발송 없이 안내한다", async () => {
  mockDispatch.mockImplementation((_size, options) => options.onSuccess(null));
  renderPage("outbox");
  fireEvent.click(screen.getByRole("button", { name: "수동 Dispatch" }));
  fireEvent.click(await screen.findByRole("button", { name: "확인" }));
  await waitFor(() => expect(screen.getByText("수동 발송 요청이 완료되었습니다.")).toBeInTheDocument());
  expect(screen.queryByText(/undefined건/)).not.toBeInTheDocument();
  expect(mockDispatch).toHaveBeenCalledTimes(1);
});
