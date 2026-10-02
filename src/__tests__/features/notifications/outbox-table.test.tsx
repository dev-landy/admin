import "@/test-utils/antd";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "antd";

import { OutboxTable } from "@/features/notifications/components/OutboxTable";
import type { OutboxEvent, OutboxStatus } from "@/features/notifications/types";

const mockRequeue = jest.fn();
const mockFilterChange = jest.fn();
jest.mock("@/features/notifications/hooks", () => ({
  useRequeueOutbox: () => ({ mutate: mockRequeue, isPending: false }),
}));

const statuses: OutboxStatus[] = ["PENDING", "SENDING", "SENT", "FAILED", "SKIPPED"];
const events: OutboxEvent[] = statuses.map((status, index) => ({
  notificationOutboxEventId: index + 1, notificationId: 101, userId: 7, fcmTokenId: 3,
  tokenValue: "token***", status, attempts: 1, lastAttemptedAt: null, sentAt: null,
  lastErrorCode: null, lastErrorMessage: null,
}));

function renderTable() {
  render(<App><OutboxTable data={events} loading={false} page={1} pageSize={20} total={5}
    onPageChange={jest.fn()} filters={{}} onFilterChange={mockFilterChange} /></App>);
}

beforeEach(() => jest.resetAllMocks());

test("SENDING을 표시하고 실패·건너뜀 상태만 재큐잉할 수 있다", () => {
  renderTable();
  for (const status of statuses) {
    const row = within(screen.getByText(status).closest("tr")!);
    const button = row.getByRole("button", { name: "Requeue" });
    if (status === "FAILED" || status === "SKIPPED") expect(button).toBeEnabled();
    else expect(button).toBeDisabled();
  }
});

test("재큐잉 성공은 발송 완료가 아니라 수동 발송이 남았다고 알린다", async () => {
  renderTable();
  mockRequeue.mockImplementation((_id, options) => options.onSuccess());
  fireEvent.click(within(screen.getByText("FAILED").closest("tr")!).getByRole("button", { name: "Requeue" }));

  expect(mockRequeue).toHaveBeenCalledWith(4, expect.any(Object));
  expect(await screen.findByText("즉시 발송하려면 수동 Dispatch를 실행하세요. 대상일이 지난 예약 알림은 다시 건너뜁니다.")).toBeInTheDocument();
});

test("에러 코드 필터는 앞뒤 공백을 제거한 정확 일치 값으로 적용한다", async () => {
  renderTable();
  const header = within(document.querySelector("thead")!).getByText("에러 코드").closest("th")!;
  fireEvent.click(header.querySelector(".ant-table-filter-trigger")!);
  const dropdown = await waitFor(() => {
    const element = document.querySelector<HTMLElement>(".ant-table-filter-dropdown");
    if (!element) throw new Error("필터를 여는 중입니다.");
    return element;
  });
  const input = within(dropdown).getByPlaceholderText("에러 코드 정확 일치");
  fireEvent.change(input, { target: { value: " UNAVAILABLE " } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter", keyCode: 13 });
  expect(mockFilterChange).toHaveBeenCalledWith("errorCode", "UNAVAILABLE");
});
