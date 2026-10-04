import "@/test-utils/antd";

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { BatchScheduleEditModal } from "@/features/batch/components/BatchScheduleEditModal";
import type { BatchSchedule } from "@/features/batch/types";

const mockUpdate = jest.fn();
jest.mock("@/features/batch/hooks", () => ({
  useUpdateBatchSchedule: () => ({ mutate: mockUpdate, isPending: false }),
  useIsBatchScheduleUpdating: () => false,
}));
const schedule: BatchSchedule = {
  key: "DAILY_NOTIFICATION", jobName: "dailyNotificationJob", label: "일일 알림",
  cronExpression: "0 0 9 * * *", enabled: true,
  nextExecutionAt: "2026-10-03T09:00:00", updatedAt: "2026-10-02T09:00:00",
};
beforeEach(() => jest.clearAllMocks());

test.each([
  ["매일 한 번", "시 (0~23)", "9.5", "0~23 사이 정수를 입력하세요."],
  ["매일 한 번", "분 (0~59)", "0.5", "0~59 사이 정수를 입력하세요."],
  ["시간대 내 반복", "시작 분 (0~59)", "0.5", "0~59 사이 정수를 입력하세요."],
  ["시간대 내 반복", "간격 (분, 1~59)", "1.5", "1~59 사이 정수를 입력하세요."],
  ["매시 정각 범위", "시작 시 (0~23)", "9.5", "0~23 사이 정수를 입력하세요."],
  ["매시 정각 범위", "종료 시 (0~23)", "22.5", "0~23 사이 정수를 입력하세요."],
])("%s의 %s에 소수를 넣으면 저장 전에 필드 오류를 보여 준다", async (mode, label, value, error) => {
  render(<ConfigProvider theme={{ token: { motion: false } }}><App>
    <BatchScheduleEditModal schedule={schedule} onClose={jest.fn()} />
  </App></ConfigProvider>);
  const dialog = await screen.findByRole("dialog", { name: "배치 수정" });
  fireEvent.click(within(dialog).getByRole("radio", { name: mode }));
  const input = await within(dialog).findByLabelText(label);
  expect(within(dialog).getByRole("radio", { name: mode })).toBeChecked();
  await act(async () => { fireEvent.change(input, { target: { value } }); });
  await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "저장" })); });
  await waitFor(() => expect(within(dialog).getByText(error)).toBeInTheDocument());
  expect(input).toHaveValue(value);
  expect(mockUpdate).not.toHaveBeenCalled();
});
