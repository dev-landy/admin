let mockViewport: "mobile" | "compact" | "wide" = "wide";
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: () => mockViewport }));
beforeEach(() => { mockViewport = "wide"; });

import "@/test-utils/antd";
import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";

import { BatchExecutionTable } from "@/features/batch/components/BatchExecutionTable";
import type { BatchExecutionDetail, BatchExecutionSummary } from "@/features/batch/types";

type TableFilters = ComponentProps<typeof BatchExecutionTable>["filters"];

let detail: BatchExecutionDetail | undefined;

jest.mock("@/features/batch/hooks", () => ({
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
  jobVersion: "v2",
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
    stale: true,
  };
}

const onFilterChange = jest.fn();
const onTargetDateRangeChange = jest.fn();

function renderTable(execution: BatchExecutionSummary = failedExecution, filters: TableFilters = {}) {
  render(
    <ConfigProvider theme={{ token: { motion: false } }}><App>
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
    </App></ConfigProvider>,
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
  onFilterChange.mockReset();
  onTargetDateRangeChange.mockReset();
  detail = undefined;
});

test("실행 이력 행에 상태·소요 시간과 상세 조회를 표시한다", () => {
  renderTable({ ...failedExecution, status: "COMPLETED", durationMillis: 1_500 });

  expect(screen.getByText("완료 · COMPLETED")).toBeInTheDocument();
  expect(screen.getByText("소요 1.5초")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "상세" })).toBeEnabled();
});

test("지연된 실행에는 지연 태그를 붙이고 소요 시간을 - 로 표시한다", () => {
  renderTable(runningStale());

  expect(screen.getByText("실행 중 · STARTED")).toBeInTheDocument();
  expect(screen.getByText("지연")).toBeInTheDocument();
  // 실행 ID · Job · 대상 날짜 · 상태 · 종료 코드 · 시작 · 종료 · 소요 시간 · 액션 순서
  expect(screen.getByText("소요 -")).toBeInTheDocument();
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
  expect(within(dialog).getByText("v2")).toBeInTheDocument();
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

test("목록은 초 단위까지, 상세는 밀리초 3자리까지 시각을 표시한다", async () => {
  const execution: BatchExecutionSummary = {
    ...failedExecution,
    createTime: "2026-09-01T09:00:00.5",
    startTime: "2026-09-01T09:00:01.123456",
    endTime: "2026-09-01T09:01:31",
  };
  detail = {
    ...execution,
    steps: [
      {
        stepExecutionId: 55,
        stepName: "dailyNotificationStep",
        kind: "CHUNK",
        status: "FAILED",
        exitCode: "FAILED",
        exitMessage: null,
        readCount: 10,
        writeCount: 4,
        commitCount: 1,
        rollbackCount: 1,
        startTime: "2026-09-01T09:00:02.7",
        endTime: null,
      },
    ],
  };
  renderTable(execution);

  // 실행 ID · Job · 대상 날짜 · 상태 · 종료 코드 · 시작 · 종료 · 소요 시간 · 액션 순서
  expect(screen.getByText("2026-09-01 09:00:01")).toBeInTheDocument();
  expect(screen.getByText("2026-09-01 09:01:31")).toBeInTheDocument();
  expect(screen.queryByText("2026-09-01 09:00:01.123456")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "상세" }));

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("2026-09-01T09:00:00.500")).toBeInTheDocument();
  expect(within(dialog).getByText("2026-09-01T09:00:01.123")).toBeInTheDocument();

  const stepCells = within(
    within(dialog).getByText("dailyNotificationStep").closest("tr") as HTMLElement,
  ).getAllByRole("cell");
  expect(stepCells[9].textContent).toBe("2026-09-01T09:00:02.700");
  expect(stepCells[10].textContent).toBe("-");
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

test("지연 실행 상세에도 지연 경고를 유지한다", async () => {
  const execution = runningStale();
  detail = { ...execution, steps: [] };
  renderTable(execution);

  fireEvent.click(screen.getByRole("button", { name: "상세" }));

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("지연")).toBeInTheDocument();
});


test("신규 실행 ID와 실제 실행일 조건만으로 비어도 필터를 넓히도록 안내한다", () => {
  render(<App><BatchExecutionTable data={[]} loading={false} page={1} pageSize={20} total={0}
    onPageChange={jest.fn()} filters={{ executionId: 999999, startedFrom: "2026-10-05" }}
    onFilterChange={onFilterChange} onTargetDateRangeChange={onTargetDateRangeChange} jobNames={[]} /></App>);
  expect(screen.getByText("조건에 맞는 배치 실행 이력이 없습니다. 필터를 초기화해 전체 이력을 확인하세요.")).toBeInTheDocument();
  expect(screen.queryByText("기록된 배치 실행 이력이 없습니다.")).not.toBeInTheDocument();
});

test("모바일 실행 상세는 스텝 카드로 기술 시각과 tasklet의 처리량 의미를 보존한다", async () => {
  mockViewport = "mobile";
  detail = { ...failedExecution, steps: [{ stepExecutionId: 33, stepName: "dispatchStep", kind: "TASKLET", status: "FAILED", exitCode: "FAILED", exitMessage: "스텝 오류 상세", readCount: 0, writeCount: 0, commitCount: 12, rollbackCount: 2, startTime: "2026-09-01T09:00:01.123", endTime: "2026-09-01T09:01:31.456" }] };
  renderTable();
  const card = within(screen.getByRole("article", { name: "배치 실행 #12" }));
  expect(card.getByText("업무 대상일")).toBeInTheDocument();
  fireEvent.click(card.getByRole("button", { name: "상세" }));
  const dialog = await screen.findByRole("dialog");
  const step = within(within(dialog).getByRole("article", { name: "배치 스텝 #33" }));
  expect(dialog.querySelector(".ant-table-wrapper")).not.toBeInTheDocument();
  expect(step.getByText("- · -")).toBeInTheDocument();
  expect(step.getByText("12 · 2")).toBeInTheDocument();
  await waitFor(() => expect(step.getAllByText("2026-09-01T09:00:01.123")[0]).toBeVisible());
  fireEvent.click(step.getByText("추가 정보"));
  await waitFor(() => expect(step.getByText("스텝 오류 상세")).toBeVisible());
});
