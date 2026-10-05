import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import BatchSchedulesPage from "@/app/(admin)/batch/schedules/page";
import type { BatchSchedule } from "@/features/batch/types";
let mockQuery = "";
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mockQuery), useRouter: () => ({ push: mockPush }) }));
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: () => "wide" }));
const mockSchedules: BatchSchedule[] = [
  { key: "DAILY_NOTIFICATION", label: "일일 알림", jobName: "dailyNotificationJob", enabled: true, cronExpression: "0 0 9 * * *", nextExecutionAt: null, updatedAt: "2026-10-05T00:00:00" },
  { key: "DUE_ALIMTALK", label: "납부일 알림톡", jobName: "dueAlimtalkJob", enabled: false, cronExpression: "0 0 8 * * *", nextExecutionAt: null, updatedAt: "2026-10-05T00:00:00" },
];
jest.mock("@/features/batch/hooks", () => ({ useBatchSchedules: () => ({ data: { schedules: mockSchedules }, isLoading: false }), useUpdateBatchSchedule: () => ({ mutate: jest.fn(), isPending: false }), useIsBatchScheduleUpdating: () => false }));

test("일정 URL의 필터와 페이지를 복원하고 미제출 검색은 조회할 때만 적용한다", async () => {
  mockQuery = "keyword=알림&page=2&size=1&returnTo=%2Fbatch";
  const tree = <ConfigProvider theme={{ token: { motion: false } }}><App><BatchSchedulesPage /></App></ConfigProvider>;
  const view = render(tree);
  expect(screen.getByLabelText("작업 검색")).toHaveValue("알림");
  expect(screen.getByText("납부일 알림톡")).toBeInTheDocument();
  expect(screen.queryByText("일일 알림")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("작업 검색"), { target: { value: "  일일  " } });
  expect(mockPush).not.toHaveBeenCalled();
  expect(screen.getByText("납부일 알림톡")).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "조회" })); });
  await waitFor(() => expect(mockPush).toHaveBeenCalledTimes(1));
  const params = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(Object.fromEntries(params)).toEqual({ keyword: "일일", page: "1", size: "1", returnTo: "/batch" });
  mockQuery = params.toString();
  view.rerender(<ConfigProvider theme={{ token: { motion: false } }}><App><BatchSchedulesPage /></App></ConfigProvider>);
  expect(screen.getByText("일일 알림")).toBeInTheDocument();
  expect(screen.queryByText("납부일 알림톡")).not.toBeInTheDocument();
  mockQuery = "keyword=알림&page=2&size=1";
  view.rerender(<ConfigProvider theme={{ token: { motion: false } }}><App><BatchSchedulesPage /></App></ConfigProvider>);
  expect(screen.getByLabelText("작업 검색")).toHaveValue("알림");
  expect(screen.getByText("납부일 알림톡")).toBeInTheDocument();
});
