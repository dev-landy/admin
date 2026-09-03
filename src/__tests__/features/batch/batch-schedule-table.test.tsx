import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "antd";

import { BatchScheduleTable } from "@/features/batch/components/BatchScheduleTable";
import type { BatchSchedule } from "@/features/batch/types";

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const getComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (element: Element): CSSStyleDeclaration => getComputedStyle(element);

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// antd v6 Modal 내부 폼 렌더링이 MessageChannel을 사용한다. jsdom에는 없어 최소 구현을 넣는다.
class MockMessageChannel {
  port1 = { onmessage: null as ((event: MessageEvent) => void) | null };
  port2 = {
    postMessage: () => {
      setTimeout(() => this.port1.onmessage?.({} as MessageEvent), 0);
    },
  };
}

Object.defineProperty(global, "MessageChannel", { writable: true, value: MockMessageChannel });

const mockUpdate = jest.fn();

jest.mock("@/features/batch/hooks", () => ({
  useUpdateBatchSchedule: () => ({ mutate: mockUpdate, isPending: false }),
}));

const schedule: BatchSchedule = {
  key: "DAILY_NOTIFICATION",
  jobName: "dailyNotificationJob",
  label: "일일 알림 발송",
  cronExpression: "0 0 9 * * *",
  zoneId: "Asia/Seoul",
  enabled: true,
  nextExecutionAt: "2026-09-04T09:00:00",
  updatedAt: "2026-09-01T12:00:00",
};

function renderTable(data: BatchSchedule[] = [schedule]) {
  render(
    <App>
      <BatchScheduleTable data={data} loading={false} />
    </App>,
  );
}

beforeEach(() => {
  mockUpdate.mockReset();
});

test("스케줄 목록은 크론 식과 다음 실행 예정 시각을 표시한다", () => {
  renderTable();

  expect(screen.getByRole("columnheader", { name: "다음 실행 예정" })).toBeInTheDocument();
  expect(screen.getByText("일일 알림 발송")).toBeInTheDocument();
  expect(screen.getByText("0 0 9 * * *")).toBeInTheDocument();

  const cells = screen.getAllByRole("cell");
  expect(cells[4]).toHaveTextContent("활성");
  expect(cells[5]).toHaveTextContent("2026-09-04T09:00:00");
});

test("비활성 스케줄과 예정 시각 없음을 구분해 표시한다", () => {
  renderTable([{ ...schedule, enabled: false, nextExecutionAt: null }]);

  const cells = screen.getAllByRole("cell");
  expect(cells[4]).toHaveTextContent("비활성");
  expect(cells[5]).toHaveTextContent("-");
});

test("수정 모달은 현재 설정을 채우고 변경한 크론 식으로 수정을 요청한다", async () => {
  renderTable();

  fireEvent.click(screen.getByRole("button", { name: "수정" }));

  const dialog = await screen.findByRole("dialog");
  const cronInput = within(dialog).getByLabelText("크론 식");
  expect(cronInput).toHaveValue("0 0 9 * * *");
  expect(within(dialog).getByLabelText("타임존")).toHaveValue("Asia/Seoul");

  fireEvent.change(cronInput, { target: { value: "0 30 8 * * *" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  await waitFor(() => {
    expect(mockUpdate).toHaveBeenCalledWith(
      {
        key: "DAILY_NOTIFICATION",
        body: { cronExpression: "0 30 8 * * *", zoneId: "Asia/Seoul", enabled: true },
      },
      expect.any(Object),
    );
  });
});

test("크론 식이 비면 수정을 요청하지 않는다", async () => {
  renderTable();

  fireEvent.click(screen.getByRole("button", { name: "수정" }));

  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("크론 식"), { target: { value: "" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  expect(await within(dialog).findByText("크론 식을 입력하세요.")).toBeInTheDocument();
  expect(mockUpdate).not.toHaveBeenCalled();
});
