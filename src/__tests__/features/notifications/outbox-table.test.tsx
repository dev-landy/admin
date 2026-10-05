let mockViewport: "mobile" | "compact" | "wide" = "wide";
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: () => mockViewport }));
beforeEach(() => { mockViewport = "wide"; });

import "@/test-utils/antd";

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";

import { OutboxTable } from "@/features/notifications/components/OutboxTable";
import type { OutboxEvent, OutboxStatus } from "@/features/notifications/types";

const mockRequeue = jest.fn();
const mockFilterChange = jest.fn();
jest.mock("@/features/notifications/hooks", () => ({
  useRequeueOutbox: () => ({ mutateAsync: mockRequeue, isPending: false }),
}));

const statusLabels: Record<OutboxStatus, string> = { PENDING: "대기 · PENDING", SENDING: "발송 중 · SENDING", SENT: "발송 완료 · SENT", FAILED: "실패 · FAILED", SKIPPED: "건너뜀 · SKIPPED" };
const statuses: OutboxStatus[] = ["PENDING", "SENDING", "SENT", "FAILED", "SKIPPED"];
const events: OutboxEvent[] = statuses.map((status, index) => ({
  notificationOutboxEventId: index + 1, notificationId: 101, userId: 7, fcmTokenId: 3,
  tokenValue: "token***", status, attempts: 1, lastAttemptedAt: null, sentAt: null,
  lastErrorCode: null, lastErrorMessage: null,
}));

function renderTable(disabled = false) {
  render(<ConfigProvider theme={{ token: { motion: false } }}><App><OutboxTable data={events} loading={false} disabled={disabled} page={1} pageSize={20} total={5}
    onPageChange={jest.fn()} filters={{}} onFilterChange={mockFilterChange} /></App></ConfigProvider>);
}

beforeEach(() => jest.resetAllMocks());

async function requeueItem(id: number) {
  fireEvent.click(screen.getByRole("button", { name: `Outbox #${id} 더보기` }));
  return screen.findByRole("menuitem", { name: /^Requeue/ });
}
async function closeMenu(id: number) {
  fireEvent.click(screen.getByRole("button", { name: `Outbox #${id} 더보기` }));
  await waitFor(() => expect(screen.queryByRole("menuitem", { name: /^Requeue/ })).not.toBeInTheDocument());
}

test("모든 상태에 상세를 제공하고 실패·건너뜀만 재큐잉할 수 있다고 설명한다", async () => {
  renderTable();
  for (const [index, status] of statuses.entries()) {
    const row = within(screen.getByText(statusLabels[status]).closest("tr")!);
    expect(row.getByRole("button", { name: "상세" })).toBeEnabled();
    const item = await requeueItem(index + 1);
    if (status === "FAILED" || status === "SKIPPED") expect(item).not.toHaveAttribute("aria-disabled", "true");
    else { expect(item).toHaveAttribute("aria-disabled", "true"); expect(item).toHaveTextContent("실패/건너뜀만 가능"); fireEvent.click(item); }
    await closeMenu(index + 1);
  }
  expect(mockRequeue).not.toHaveBeenCalled();
});

test("재큐잉 성공은 발송 완료가 아니라 수동 발송이 남았다고 알린다", async () => {
  renderTable();
  mockRequeue.mockResolvedValue(undefined);
  fireEvent.click(await requeueItem(4));
  expect(mockRequeue).toHaveBeenCalledWith(4);
  expect(await screen.findByText("즉시 발송하려면 수동 Dispatch를 실행하세요. 대상일이 지난 예약 알림은 다시 건너뜁니다.")).toBeInTheDocument();
});

test("에러 코드 필터는 앞뒤 공백을 제거한 정확 일치 값으로 적용한다", async () => {
  renderTable();
  const header = within(document.querySelector("thead")!).getByText("오류").closest("th")!;
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


test("신규 알림 ID 조건만 있는 빈 결과도 전체 대기열이 없는 것으로 안내하지 않는다", () => {
  render(<App><OutboxTable data={[]} loading={false} page={1} pageSize={20} total={0}
    onPageChange={jest.fn()} filters={{ notificationId: 999999 }} onFilterChange={mockFilterChange} /></App>);
  expect(screen.getByText("조건에 맞는 발송 대기열이 없습니다. 필터를 초기화해 전체 내역을 확인하세요.")).toBeInTheDocument();
  expect(screen.queryByText("등록된 푸시 발송 대기열이 없습니다.")).not.toBeInTheDocument();
});

test("발송 시각과 실패 내용을 상세에서 확인해도 재큐잉 요청은 보내지 않는다", async () => {
  const event = { ...events[3], sentAt: "2026-10-05T09:15:00", lastErrorCode: "UNAVAILABLE", lastErrorMessage: "확인할 오류" };
  render(<App><OutboxTable data={[event]} loading={false} page={1} pageSize={20} total={1}
    onPageChange={jest.fn()} filters={{}} onFilterChange={mockFilterChange} /></App>);
  fireEvent.click(screen.getByRole("button", { name: "상세" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("2026-10-05 09:15")).toBeInTheDocument();
  expect(within(dialog).getByText("확인할 오류")).toBeInTheDocument();
  expect(within(dialog).getByText("실패 · FAILED")).toBeInTheDocument();
  expect(mockRequeue).not.toHaveBeenCalled();
});


test("모바일 카드에서도 상세는 항상 열리고 불가한 재큐잉을 누르면 요청하지 않는다", async () => {
  mockViewport = "mobile";
  renderTable();
  expect(document.querySelector(".ant-table-wrapper")).not.toBeInTheDocument();
  for (const [index, status] of statuses.entries()) {
    const card = within(screen.getByRole("article", { name: `Outbox #${index + 1}` }));
    expect(card.getByRole("button", { name: "상세" })).toBeEnabled();
    expect(card.getByText(statusLabels[status])).toBeInTheDocument();
    const action = await requeueItem(index + 1);
    if (status === "FAILED" || status === "SKIPPED") expect(action).not.toHaveAttribute("aria-disabled", "true");
    else { expect(action).toHaveAttribute("aria-disabled", "true"); fireEvent.click(action); }
    await closeMenu(index + 1);
  }
  expect(mockRequeue).not.toHaveBeenCalled();
  mockRequeue.mockResolvedValue(undefined);
  fireEvent.click(await requeueItem(4));
  expect(mockRequeue).toHaveBeenCalledWith(4);
});

test("재큐잉 잠금과 로딩은 해당 행에만 적용하고 실패 후 초과 재시도 없이 다시 시도할 수 있다", async () => {
  let reject!: (error: Error) => void;
  const pending = new Promise<void>((_, fail) => { reject = fail; });
  mockRequeue.mockReturnValueOnce(pending);
  renderTable();
  fireEvent.click(await requeueItem(4));
  const busy = screen.getByRole("button", { name: "Outbox #4 더보기" });
  await waitFor(() => expect(busy).toBeDisabled());
  expect(busy).toHaveClass("ant-btn-loading");
  expect(screen.getByRole("button", { name: "Outbox #5 더보기" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Outbox #5 더보기" })).not.toHaveClass("ant-btn-loading");
  fireEvent.click(busy);
  expect(mockRequeue).toHaveBeenCalledTimes(1);
  await act(async () => { reject(new Error("network")); });
  expect(await screen.findByText("Requeue 실패")).toBeInTheDocument();
  await waitFor(() => expect(busy).toBeEnabled());
  expect(mockRequeue).toHaveBeenCalledTimes(1);
  mockRequeue.mockResolvedValue(undefined);
  fireEvent.click(await requeueItem(4));
  await waitFor(() => expect(mockRequeue).toHaveBeenCalledTimes(2));
  expect(mockRequeue).toHaveBeenNthCalledWith(2, 4);
});


test("최신 조회를 확인하지 못한 상태에서는 재큐잉을 잠그고 상세 조회는 허용한다", async () => {
  renderTable(true);
  expect(screen.getByRole("button", { name: "Outbox #4 더보기" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Outbox #4 더보기" }));
  expect(screen.queryByRole("menuitem", { name: "Requeue" })).not.toBeInTheDocument();
  expect(mockRequeue).not.toHaveBeenCalled();
  fireEvent.click(screen.getAllByRole("button", { name: "상세" })[3]);
  expect(await screen.findByRole("dialog")).toHaveTextContent("Outbox #4");
  expect(mockRequeue).not.toHaveBeenCalled();
});
