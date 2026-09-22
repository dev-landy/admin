import "@/test-utils/antd";

import { fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "antd";

import { OutboxTable } from "@/features/notifications/components/OutboxTable";
import type { OutboxEvent, OutboxStatus } from "@/features/notifications/types";

const mockRequeue = jest.fn();
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
    onPageChange={jest.fn()} filters={{}} onFilterChange={jest.fn()} /></App>);
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
  expect(await screen.findByText("발송하려면 수동 Dispatch를 실행하세요. 대상일이 지난 예약 알림은 다시 건너뜁니다.")).toBeInTheDocument();
});
