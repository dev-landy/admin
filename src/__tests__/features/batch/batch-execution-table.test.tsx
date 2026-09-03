import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "antd";
import { AxiosError, AxiosHeaders } from "axios";

import { BatchExecutionTable } from "@/features/batch/components/BatchExecutionTable";
import type { BatchExecutionDetail, BatchExecutionSummary } from "@/features/batch/types";

type TableFilters = ComponentProps<typeof BatchExecutionTable>["filters"];

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

const mockRetry = jest.fn();
let detail: BatchExecutionDetail | undefined;

jest.mock("@/features/batch/hooks", () => ({
  useRetryBatchExecution: () => ({ mutate: mockRetry, isPending: false }),
  useBatchExecution: () => ({ data: detail, isLoading: false }),
}));

const failedExecution: BatchExecutionSummary = {
  executionId: 12,
  jobName: "dailyNotificationJob",
  jobInstanceId: 3,
  targetDate: "2026-09-01",
  status: "FAILED",
  exitCode: "FAILED",
  exitMessage: "java.lang.IllegalStateException: boom",
  createTime: "2026-09-01T09:00:00",
  startTime: "2026-09-01T09:00:01",
  endTime: "2026-09-01T09:01:31",
  durationMillis: 90_000,
  retryable: true,
  stale: false,
};

function runningStale(): BatchExecutionSummary {
  return {
    ...failedExecution,
    executionId: 21,
    status: "STARTED",
    exitCode: null,
    exitMessage: null,
    endTime: null,
    durationMillis: null,
    retryable: true,
    stale: true,
  };
}

function conflict(problemType: string): AxiosError {
  return new AxiosError("conflict", undefined, undefined, undefined, {
    data: {
      type: `https://landy.app/problems/${problemType}`,
      title: "배치가 실행 중입니다",
      status: 409,
      detail: "실행 중인 배치는 재시도할 수 없습니다.",
    },
    status: 409,
    statusText: "Conflict",
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  });
}

const onFilterChange = jest.fn();
const onTargetDateRangeChange = jest.fn();

function renderTable(execution: BatchExecutionSummary = failedExecution, filters: TableFilters = {}) {
  render(
    <App>
      <BatchExecutionTable
        data={[execution]}
        loading={false}
        page={1}
        pageSize={20}
        total={1}
        onPageChange={jest.fn()}
        filters={filters}
        onFilterChange={onFilterChange}
        onTargetDateRangeChange={onTargetDateRangeChange}
        jobNames={["dailyNotificationJob"]}
      />
    </App>,
  );
}

// 컬럼 제목은 헤더와 폭 측정용 숨김 행에 모두 렌더링되므로 헤더로 범위를 좁힌다.
function filterTrigger(columnTitle: string): HTMLElement {
  const thead = document.querySelector<HTMLElement>(".ant-table-thead");
  const header = within(thead as HTMLElement)
    .getByText(columnTitle)
    .closest("th");
  const trigger = header?.querySelector<HTMLElement>(".ant-table-filter-trigger");
  if (!trigger) throw new Error(`${columnTitle} 컬럼에 필터 트리거가 없습니다.`);
  return trigger;
}

// 필터 드롭다운은 body로 portal 되고, 페이지 크기 Select도 같은 role을 쓰므로
// 드롭다운 컨테이너를 돌려주고 그 안에서만 조작한다. (테스트당 필터는 하나만 연다)
async function openFilter(columnTitle: string): Promise<HTMLElement> {
  fireEvent.click(filterTrigger(columnTitle));
  return waitFor(() => {
    const dropdown = document.querySelector<HTMLElement>(".ant-table-filter-dropdown");
    if (!dropdown) throw new Error(`${columnTitle} 필터가 열리지 않았습니다.`);
    return dropdown;
  });
}

beforeEach(() => {
  mockRetry.mockReset();
  onFilterChange.mockReset();
  onTargetDateRangeChange.mockReset();
  detail = undefined;
});

test("실행 이력 행에 상태·소요 시간을 표시하고 재시도 불가 실행은 버튼을 비활성화한다", () => {
  renderTable({ ...failedExecution, status: "COMPLETED", retryable: false, durationMillis: 1_500 });

  expect(screen.getByText("COMPLETED")).toBeInTheDocument();
  expect(screen.getByText("1.5초")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "재시도" })).toBeDisabled();
});

test("지연된 실행에는 지연 태그를 붙이고 소요 시간을 - 로 표시한다", () => {
  renderTable(runningStale());

  expect(screen.getByText("STARTED")).toBeInTheDocument();
  expect(screen.getByText("지연")).toBeInTheDocument();
  // 실행 ID · Job · 대상 날짜 · 상태 · 종료 코드 · 시작 · 종료 · 소요 시간 · 액션 순서
  expect(screen.getAllByRole("cell")[7]).toHaveTextContent("-");
});

test("상세 버튼을 누르면 스텝 목록과 종료 메시지를 보여준다", async () => {
  detail = {
    ...failedExecution,
    steps: [
      {
        stepExecutionId: 55,
        stepName: "dailyNotificationStep",
        status: "FAILED",
        exitCode: "FAILED",
        exitMessage: "boom",
        kind: "CHUNK",
        readCount: 10,
        writeCount: 4,
        commitCount: 1,
        rollbackCount: 1,
        startTime: "2026-09-01T09:00:01",
        endTime: "2026-09-01T09:01:31",
      },
    ],
  };
  renderTable();

  fireEvent.click(screen.getByRole("button", { name: "상세" }));

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("배치 실행 #12")).toBeInTheDocument();
  expect(within(dialog).getByText("dailyNotificationStep")).toBeInTheDocument();
  expect(
    within(dialog).getByText("java.lang.IllegalStateException: boom"),
  ).toBeInTheDocument();
});

test("tasklet 스텝은 읽음·씀을 - 로, chunk 스텝은 숫자로 표시하고 커밋·롤백은 항상 숫자로 둔다", async () => {
  detail = {
    ...failedExecution,
    steps: [
      {
        stepExecutionId: 55,
        stepName: "dailyNotificationStep",
        kind: "CHUNK",
        status: "COMPLETED",
        exitCode: "COMPLETED",
        exitMessage: null,
        readCount: 10,
        writeCount: 4,
        commitCount: 2,
        rollbackCount: 0,
        startTime: "2026-09-01T09:00:01",
        endTime: "2026-09-01T09:01:31",
      },
      {
        stepExecutionId: 56,
        stepName: "notificationOutboxFlushStep",
        kind: "TASKLET",
        status: "COMPLETED",
        exitCode: "COMPLETED",
        exitMessage: null,
        readCount: 0,
        writeCount: 0,
        commitCount: 3,
        rollbackCount: 1,
        startTime: "2026-09-01T09:01:31",
        endTime: "2026-09-01T09:01:35",
      },
    ],
  };
  renderTable();

  fireEvent.click(screen.getByRole("button", { name: "상세" }));

  const dialog = await screen.findByRole("dialog");
  // 스텝 ID · 스텝명 · 유형 · 상태 · 종료 코드 · 읽음 · 씀 · 커밋 · 롤백 · 시작 · 종료 순서
  const chunkCells = within(
    within(dialog).getByText("dailyNotificationStep").closest("tr") as HTMLElement,
  ).getAllByRole("cell");
  expect(chunkCells[5]).toHaveTextContent("10");
  expect(chunkCells[6]).toHaveTextContent("4");

  const taskletCells = within(
    within(dialog).getByText("notificationOutboxFlushStep").closest("tr") as HTMLElement,
  ).getAllByRole("cell");
  expect(taskletCells[2]).toHaveTextContent("TASKLET");
  expect(taskletCells[5].textContent).toBe("-");
  expect(taskletCells[6].textContent).toBe("-");
  expect(taskletCells[7].textContent).toBe("3");
  expect(taskletCells[8].textContent).toBe("1");
});

test("종료 코드 필터에서 값을 고르면 exitCode 필터 변경을 알린다", async () => {
  renderTable();

  const dropdown = await openFilter("종료 코드");
  fireEvent.mouseDown(within(dropdown).getByRole("combobox"));

  fireEvent.click(await screen.findByText("COMPLETED_WITH_USER_FAILURES (일부 사용자 실패)"));

  expect(onFilterChange).toHaveBeenCalledWith("exitCode", "COMPLETED_WITH_USER_FAILURES");
});

test("대상 날짜 범위를 고르면 targetDateFrom·targetDateTo를 함께 전달한다", async () => {
  renderTable();

  const dropdown = await openFilter("대상 날짜");
  const [from, to] = Array.from(dropdown.querySelectorAll("input"));
  fireEvent.mouseDown(from);
  fireEvent.click(from);
  fireEvent.focus(from);
  fireEvent.change(from, { target: { value: "2026-09-01" } });
  fireEvent.keyDown(from, { key: "Enter" });
  fireEvent.focus(to);
  fireEvent.change(to, { target: { value: "2026-09-03" } });
  fireEvent.keyDown(to, { key: "Enter" });

  expect(onTargetDateRangeChange).toHaveBeenCalledWith("2026-09-01", "2026-09-03");
});

test("대상 날짜 범위를 지우면 targetDateFrom·targetDateTo를 함께 제거한다", async () => {
  renderTable(failedExecution, { targetDateFrom: "2026-09-01", targetDateTo: "2026-09-03" });

  const dropdown = await openFilter("대상 날짜");
  const clear = dropdown.querySelector<HTMLElement>(".ant-picker-clear");
  if (!clear) throw new Error("대상 날짜 범위 초기화 버튼이 없습니다.");
  fireEvent.mouseDown(clear);
  fireEvent.click(clear);

  expect(onTargetDateRangeChange).toHaveBeenCalledWith(undefined, undefined);
});

test("적용된 종료 코드·대상 날짜 필터는 컬럼 필터 아이콘에 표시된다", () => {
  renderTable(failedExecution, {
    exitCode: "FAILED",
    targetDateFrom: "2026-09-01",
    targetDateTo: "2026-09-03",
  });

  expect(filterTrigger("종료 코드")).toHaveClass("active");
  expect(filterTrigger("대상 날짜")).toHaveClass("active");
  expect(filterTrigger("Job")).not.toHaveClass("active");
});

test("재시도는 확인 후 confirmStale 없이 요청한다", async () => {
  renderTable();

  fireEvent.click(screen.getByRole("button", { name: "재시도" }));
  fireEvent.click(await screen.findByRole("button", { name: "재시도 실행" }));

  await waitFor(() => {
    expect(mockRetry).toHaveBeenCalledWith(
      { executionId: 12, confirmStale: false },
      expect.any(Object),
    );
  });
});

test("실행 중 409를 받은 지연 실행은 중복 발송 위험을 알리고 강제 재시도로 다시 요청한다", async () => {
  mockRetry.mockImplementation(
    (
      variables: { executionId: number; confirmStale: boolean },
      options: { onError: (error: unknown) => void },
    ) => {
      if (!variables.confirmStale) options.onError(conflict("batch-execution-running"));
    },
  );
  renderTable(runningStale());

  fireEvent.click(screen.getByRole("button", { name: "재시도" }));
  fireEvent.click(await screen.findByRole("button", { name: "재시도 실행" }));

  expect(
    await screen.findByText(/중복 실행되어 알림이 중복 발송될 수 있습니다/),
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "강제 재시도" }));

  await waitFor(() => {
    expect(mockRetry).toHaveBeenLastCalledWith(
      { executionId: 21, confirmStale: true },
      expect.any(Object),
    );
  });
});

test("재시도 불가 문제로 실패하면 강제 재시도를 제안하지 않는다", async () => {
  mockRetry.mockImplementation(
    (
      _variables: { executionId: number; confirmStale: boolean },
      options: { onError: (error: unknown) => void },
    ) => {
      options.onError(conflict("batch-execution-not-retryable"));
    },
  );
  renderTable(runningStale());

  fireEvent.click(screen.getByRole("button", { name: "재시도" }));
  fireEvent.click(await screen.findByRole("button", { name: "재시도 실행" }));

  expect(await screen.findByText("배치가 실행 중입니다")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "강제 재시도" })).not.toBeInTheDocument();
  expect(mockRetry).toHaveBeenCalledTimes(1);
});
