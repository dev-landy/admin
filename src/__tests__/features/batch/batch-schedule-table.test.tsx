import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { AxiosError, AxiosHeaders } from "axios";

import { BatchScheduleTable } from "@/features/batch/components/BatchScheduleTable";
import type { BatchSchedule, UpdateBatchScheduleRequest } from "@/features/batch/types";

type UpdateVariables = { key: string; body: UpdateBatchScheduleRequest };
type UpdateOptions = {
  onSuccess: () => void;
  onError: (error: unknown) => void;
  onSettled: () => void;
};

const mockUpdate = jest.fn();

jest.mock("@/features/batch/hooks", () => ({
  useUpdateBatchSchedule: () => ({ mutate: mockUpdate, isPending: false }),
  useIsBatchScheduleUpdating: () => false,
}));

const schedule: BatchSchedule = {
  key: "DAILY_NOTIFICATION",
  jobName: "dailyNotificationJob",
  label: "일일 알림 발송",
  cronExpression: "0 0 9 * * *",
  enabled: true,
  nextExecutionAt: "2026-09-04T09:00:00",
  updatedAt: "2026-09-01T12:00:00",
};

const maintenanceSchedules: BatchSchedule[] = [
  {
    ...schedule,
    key: "MAINTENANCE_REQUEST_EXPIRY",
    jobName: "maintenanceRequestExpiryJob",
    label: "집수리 요청 만료",
    cronExpression: "0 30 3 * * *",
    nextExecutionAt: "2026-10-03T03:30:00",
  },
  {
    ...schedule,
    key: "MAINTENANCE_PHOTO_CLEANUP",
    jobName: "maintenancePhotoCleanupJob",
    label: "집수리 사진 정리",
    cronExpression: "0 0 4 * * *",
    nextExecutionAt: "2026-10-03T04:00:00",
  },
];

function badRequest(): AxiosError {
  return new AxiosError("bad request", undefined, undefined, undefined, {
    data: {
      type: "https://landy.app/problems/invalid-batch-schedule",
      title: "스케줄을 변경할 수 없습니다",
      status: 400,
      detail: "크론 식이 올바르지 않습니다.",
    },
    status: 400,
    statusText: "Bad Request",
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  });
}

function renderTable(data: BatchSchedule[] = [schedule]) {
  render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <BatchScheduleTable data={data} loading={false} />
      </App>
    </ConfigProvider>,
  );
}

// 스위치를 눌러 확인 모달을 열고 그 모달을 돌려준다.
async function openToggleDialog(index = 0): Promise<HTMLElement> {
  fireEvent.click(screen.getAllByRole("switch")[index]);
  return screen.findByRole("dialog");
}

beforeEach(() => {
  mockUpdate.mockReset();
});

test("스케줄 목록은 실행 시각 설명과 크론 식을 함께 보여준다", () => {
  renderTable();

  expect(screen.getByRole("columnheader", { name: "실행 시각" })).toBeInTheDocument();
  expect(screen.getByText("일일 알림 발송")).toBeInTheDocument();
  expect(screen.getByText("매일 09:00")).toBeInTheDocument();
  expect(screen.getByText("0 0 9 * * *")).toBeInTheDocument();

  // Job · 작업 · 실행 시각 · 다음 실행 예정 · 수정일 · 활성 · 액션 순서
  const cells = screen.getAllByRole("cell");
  expect(cells[0]).toHaveTextContent("dailyNotificationJob");
  expect(cells[1]).toHaveTextContent("일일 알림 발송");
  expect(cells[3]).toHaveTextContent("2026-09-04T09:00:00");
  expect(within(cells[5]).getByRole("switch")).toHaveAttribute("aria-checked", "true");
  expect(within(cells[6]).getByRole("button", { name: "수정" })).toBeInTheDocument();
});

test("해석할 수 없는 크론 식은 원문만 한 번 보여준다", () => {
  renderTable([{ ...schedule, cronExpression: "0 0 9 * * MON" }]);

  expect(screen.getByText("0 0 9 * * MON")).toBeInTheDocument();
});

test.each(maintenanceSchedules)(
  "$key는 서버의 작업 이름·실행 시각을 표시하고 해당 키로 변경한다",
  async (maintenanceSchedule) => {
    renderTable([maintenanceSchedule]);

    expect(screen.getByText(maintenanceSchedule.label)).toBeInTheDocument();
    expect(screen.getByText(maintenanceSchedule.jobName)).toBeInTheDocument();
    expect(screen.getByText(maintenanceSchedule.cronExpression)).toBeInTheDocument();
    expect(screen.getByText(maintenanceSchedule.nextExecutionAt!)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "수정" }));

    const dialog = await screen.findByRole("dialog");
    const [, minute, hour] = maintenanceSchedule.cronExpression.split(" ");
    expect(within(dialog).getByLabelText("시 (0~23)")).toHaveValue(hour);
    expect(within(dialog).getByLabelText("분 (0~59)")).toHaveValue(minute);
    fireEvent.change(within(dialog).getByLabelText("분 (0~59)"), { target: { value: "45" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        {
          key: maintenanceSchedule.key,
          body: { cronExpression: `0 45 ${hour} * * *`, enabled: true },
        },
        expect.any(Object),
      );
    });
  },
);

test("비활성 스케줄과 예정 시각 없음을 구분해 표시한다", () => {
  renderTable([{ ...schedule, enabled: false, nextExecutionAt: null }]);

  const cells = screen.getAllByRole("cell");
  expect(cells[3]).toHaveTextContent("-");
  expect(within(cells[5]).getByRole("switch")).toHaveAttribute("aria-checked", "false");
});

test("실행 시각은 소수점 이하 없이 초 단위까지만 표시한다", () => {
  renderTable([
    {
      ...schedule,
      nextExecutionAt: "2026-09-04T09:00:00.123456",
      updatedAt: "2026-09-01T12:00:00.5",
    },
  ]);

  const cells = screen.getAllByRole("cell");
  expect(cells[3].textContent).toBe("2026-09-04T09:00:00");
  expect(cells[4].textContent).toBe("2026-09-01T12:00:00");
});

test("비활성 스케줄은 활성화 확인을 거쳐 활성으로 요청한다", async () => {
  renderTable([{ ...schedule, enabled: false }]);

  const dialog = await openToggleDialog();
  expect(within(dialog).getByText("배치 활성화")).toBeInTheDocument();
  expect(within(dialog).getByText(/트리거가 다시 예약됩니다/)).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole("button", { name: "활성화" }));

  expect(mockUpdate).toHaveBeenCalledWith(
    { key: "DAILY_NOTIFICATION", body: { cronExpression: "0 0 9 * * *", enabled: true } },
    expect.any(Object),
  );
});

test("확인 모달에서 닫기를 누르면 아무것도 바꾸지 않는다", async () => {
  renderTable();

  const dialog = await openToggleDialog();
  expect(within(dialog).getByText("배치 비활성화")).toBeInTheDocument();
  expect(within(dialog).getByText(/다시 활성화하기 전까지 매일 09:00 예정이던 실행이 돌지 않습니다/)).toBeInTheDocument();
  expect(within(dialog).getByText("dailyNotificationJob")).toBeInTheDocument();
  expect(mockUpdate).not.toHaveBeenCalled();
  expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));

  expect(mockUpdate).not.toHaveBeenCalled();
  expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
});

test("토글에 성공하면 어떤 스케줄을 바꿨는지 알리고 확인 모달을 닫는다", async () => {
  mockUpdate.mockImplementation((_variables: UpdateVariables, options: UpdateOptions) => {
    options.onSuccess();
    options.onSettled();
  });
  renderTable();

  const dialog = await openToggleDialog();
  fireEvent.click(within(dialog).getByRole("button", { name: "비활성화" }));

  expect(mockUpdate).toHaveBeenCalledWith(
    { key: "DAILY_NOTIFICATION", body: { cronExpression: "0 0 9 * * *", enabled: false } },
    expect.any(Object),
  );
  expect(await screen.findByText("일일 알림 발송을 비활성화했습니다.")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

test("토글에 실패하면 오류를 알리고 스위치는 서버 값 그대로 남는다", async () => {
  mockUpdate.mockImplementation((_variables: UpdateVariables, options: UpdateOptions) => {
    options.onError(badRequest());
    options.onSettled();
  });
  renderTable();

  const dialog = await openToggleDialog();
  fireEvent.click(within(dialog).getByRole("button", { name: "비활성화" }));

  expect(await screen.findByText("스케줄을 변경할 수 없습니다")).toBeInTheDocument();
  expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
});

test("매일 한 번 모드에서 시·분을 바꾸면 그 크론 식으로 수정을 요청하고 활성 여부는 그대로 보낸다", async () => {
  renderTable([{ ...schedule, enabled: false }]);

  fireEvent.click(screen.getByRole("button", { name: "수정" }));

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByLabelText("매일 한 번")).toBeChecked();
  expect(within(dialog).getByLabelText("시 (0~23)")).toHaveValue("9");
  expect(within(dialog).getByLabelText("분 (0~59)")).toHaveValue("0");
  expect(within(dialog).getByText("0 0 9 * * *")).toBeInTheDocument();
  expect(within(dialog).getByText("매일 09:00")).toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText("시 (0~23)"), { target: { value: "8" } });
  fireEvent.change(within(dialog).getByLabelText("분 (0~59)"), { target: { value: "30" } });

  expect(await within(dialog).findByText("0 30 8 * * *")).toBeInTheDocument();
  expect(within(dialog).getByText("매일 08:30")).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  await waitFor(() => {
    expect(mockUpdate).toHaveBeenCalledWith(
      { key: "DAILY_NOTIFICATION", body: { cronExpression: "0 30 8 * * *", enabled: false } },
      expect.any(Object),
    );
  });
});

test("시간대 내 반복 모드로 바꾸면 시작 분·간격으로 크론 식을 만든다", async () => {
  renderTable();

  fireEvent.click(screen.getByRole("button", { name: "수정" }));

  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByLabelText("시간대 내 반복"));

  fireEvent.change(await within(dialog).findByLabelText("시작 분 (0~59)"), { target: { value: "10" } });
  fireEvent.change(within(dialog).getByLabelText("간격 (분, 1~59)"), { target: { value: "10" } });

  expect(await within(dialog).findByText("0 10/10 9 * * *")).toBeInTheDocument();
  expect(within(dialog).getByText("매일 09:10부터 10분 간격 (09:50까지)")).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  await waitFor(() => {
    expect(mockUpdate).toHaveBeenCalledWith(
      { key: "DAILY_NOTIFICATION", body: { cronExpression: "0 10/10 9 * * *", enabled: true } },
      expect.any(Object),
    );
  });
});

test("매시 정각 범위 모드는 시작 시·종료 시로 크론 식을 만든다", async () => {
  renderTable([{ ...schedule, cronExpression: "0 0 11-23 * * *" }]);

  fireEvent.click(screen.getByRole("button", { name: "수정" }));

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByLabelText("매시 정각 범위")).toBeChecked();
  expect(within(dialog).getByLabelText("시작 시 (0~23)")).toHaveValue("11");
  expect(within(dialog).getByLabelText("종료 시 (0~23)")).toHaveValue("23");
  expect(within(dialog).getByText("매일 11~23시 정각")).toBeInTheDocument();

  fireEvent.change(within(dialog).getByLabelText("시작 시 (0~23)"), { target: { value: "12" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  await waitFor(() => {
    expect(mockUpdate).toHaveBeenCalledWith(
      { key: "DAILY_NOTIFICATION", body: { cronExpression: "0 0 12-23 * * *", enabled: true } },
      expect.any(Object),
    );
  });
});

test("종료 시가 시작 시보다 빠르면 저장하지 않고 이유를 알린다", async () => {
  renderTable([{ ...schedule, cronExpression: "0 0 11-23 * * *" }]);

  fireEvent.click(screen.getByRole("button", { name: "수정" }));

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("시작 시는 종료 시보다 늦을 수 없습니다.")).toBeInTheDocument();

  fireEvent.change(within(dialog).getByLabelText("종료 시 (0~23)"), { target: { value: "9" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  expect(
    await within(dialog).findByText("종료 시는 시작 시보다 빠를 수 없습니다."),
  ).toBeInTheDocument();
  expect(mockUpdate).not.toHaveBeenCalled();
});

test("해석할 수 없는 식은 크론식 직접 입력 모드로 열리고 원문을 그대로 고칠 수 있다", async () => {
  renderTable([{ ...schedule, cronExpression: "0 0 9 * * MON" }]);

  fireEvent.click(screen.getByRole("button", { name: "수정" }));

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByLabelText("크론식 직접 입력")).toBeChecked();
  expect(within(dialog).getByLabelText("크론 식")).toHaveValue("0 0 9 * * MON");

  fireEvent.change(within(dialog).getByLabelText("크론 식"), {
    target: { value: "0 0 9 * * TUE" },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  await waitFor(() => {
    expect(mockUpdate).toHaveBeenCalledWith(
      { key: "DAILY_NOTIFICATION", body: { cronExpression: "0 0 9 * * TUE", enabled: true } },
      expect.any(Object),
    );
  });
});

test("크론식 직접 입력에서 식이 비면 수정을 요청하지 않는다", async () => {
  renderTable([{ ...schedule, cronExpression: "0 0 9 * * MON" }]);

  fireEvent.click(screen.getByRole("button", { name: "수정" }));

  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("크론 식"), { target: { value: "" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));

  expect(await within(dialog).findByText("크론 식을 입력하세요.")).toBeInTheDocument();
  expect(mockUpdate).not.toHaveBeenCalled();
});
