import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import BatchSchedulesPage from "@/app/(admin)/batch/schedules/page";
import { fetchBatchSchedules, updateBatchSchedule } from "@/features/batch/api";
import type { BatchSchedule } from "@/features/batch/types";
import "@/test-utils/antd";

jest.mock("@/features/batch/api", () => ({ fetchBatchSchedules: jest.fn(), updateBatchSchedule: jest.fn() }));
const mockFetch = jest.mocked(fetchBatchSchedules);
const mockUpdate = jest.mocked(updateBatchSchedule);
const schedule: BatchSchedule = { key: "DAILY_NOTIFICATION", jobName: "dailyNotificationJob", label: "일일 알림", cronExpression: "0 0 9 * * *",
  enabled: true, nextExecutionAt: "2026-10-03T09:00:00", updatedAt: "2026-10-02T09:00:00" };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function mount(mutationRetry: false | number = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: mutationRetry, retryDelay: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <App><BatchSchedulesPage /></App>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => jest.clearAllMocks());

test("비활성화 저장과 재조회가 끝나기 전에는 닫기·다른 편집을 막고 최신 활성값으로만 시간을 수정한다", async () => {
  const save = deferred<BatchSchedule>();
  const refresh = deferred<{ schedules: BatchSchedule[] }>();
  mockFetch.mockResolvedValueOnce({ schedules: [schedule] }).mockReturnValueOnce(refresh.promise);
  mockUpdate.mockReturnValueOnce(save.promise);
  mount();
  fireEvent.click(await screen.findByRole("switch"));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "비활성화" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(within(dialog).getByRole("button", { name: "닫기" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "수정" })).toBeDisabled();
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  await act(async () => { save.resolve({ ...schedule, enabled: false }); });
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("button", { name: "수정" })).toBeDisabled();
  expect(within(dialog).getByRole("button", { name: "닫기" })).toBeDisabled();
  mockFetch.mockResolvedValue({ schedules: [{ ...schedule, enabled: false }] });
  await act(async () => { refresh.resolve({ schedules: [{ ...schedule, enabled: false }] }); });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  const edit = await screen.findByRole("dialog");
  fireEvent.change(within(edit).getByLabelText("분 (0~59)"), { target: { value: "30" } });
  mockUpdate.mockResolvedValue({ ...schedule, enabled: false, cronExpression: "0 30 9 * * *" });
  fireEvent.click(within(edit).getByRole("button", { name: "저장" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenLastCalledWith("DAILY_NOTIFICATION", { cronExpression: "0 30 9 * * *", enabled: false }));
});

test("시간 수정 저장 중에는 폼·취소·다른 활성 변경을 잠그며 저장 후 조회 실패도 새 편집을 막는다", async () => {
  const save = deferred<BatchSchedule>();
  mockFetch.mockResolvedValueOnce({ schedules: [schedule] }).mockRejectedValueOnce(new Error("network"));
  mockUpdate.mockReturnValueOnce(save.promise);
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "수정" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("분 (0~59)"), { target: { value: "30" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "저장" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(within(dialog).getByRole("button", { name: "취소" })).toBeDisabled();
  expect(within(dialog).getByLabelText("분 (0~59)")).toBeDisabled();
  expect(screen.getByRole("switch")).toBeDisabled();
  await act(async () => { save.resolve({ ...schedule, cronExpression: "0 30 9 * * *" }); });
  expect(await screen.findByText("배치 설정을 불러오지 못했습니다.")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByRole("button", { name: "수정" })).toBeDisabled();
  expect(screen.getByRole("switch")).toBeDisabled();
});

test("PATCH 응답 유실에도 재조회가 끝나기 전에는 잠금을 유지하고 서버 활성값으로 다음 시간을 수정한다", async () => {
  const save = deferred<BatchSchedule>();
  const refresh = deferred<{ schedules: BatchSchedule[] }>();
  mockFetch.mockResolvedValueOnce({ schedules: [schedule] }).mockReturnValueOnce(refresh.promise);
  mockUpdate.mockReturnValueOnce(save.promise);
  // 전역 재시도 설정이 있어도 상태 변경 PATCH는 hook에서 재시도하지 않는다.
  mount(2);
  fireEvent.click(await screen.findByRole("switch"));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "비활성화" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  await act(async () => { save.reject(new Error("response lost")); });
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  expect(within(dialog).getByRole("button", { name: "닫기" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "수정" })).toBeDisabled();
  expect(screen.getByRole("switch")).toBeDisabled();
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  mockFetch.mockResolvedValue({ schedules: [{ ...schedule, enabled: false }] });
  await act(async () => { refresh.resolve({ schedules: [{ ...schedule, enabled: false }] }); });
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "닫기" })).toBeEnabled());
  fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  const edit = await screen.findByRole("dialog");
  fireEvent.change(within(edit).getByLabelText("분 (0~59)"), { target: { value: "30" } });
  mockUpdate.mockResolvedValue({ ...schedule, enabled: false, cronExpression: "0 30 9 * * *" });
  fireEvent.click(within(edit).getByRole("button", { name: "저장" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenLastCalledWith("DAILY_NOTIFICATION", { cronExpression: "0 30 9 * * *", enabled: false }));
});

test("PATCH와 재조회가 모두 실패하면 이전 목록은 유지하되 모든 새 변경을 막는다", async () => {
  const save = deferred<BatchSchedule>();
  const refresh = deferred<{ schedules: BatchSchedule[] }>();
  mockFetch.mockResolvedValueOnce({ schedules: [schedule] }).mockReturnValueOnce(refresh.promise);
  mockUpdate.mockReturnValueOnce(save.promise);
  mount(2);
  fireEvent.click(await screen.findByRole("switch"));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "비활성화" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  await act(async () => { save.reject(new Error("response lost")); });
  await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  expect(within(dialog).getByRole("button", { name: "닫기" })).toBeDisabled();
  await act(async () => { refresh.reject(new Error("network")); });
  expect(await screen.findByText("배치 설정을 불러오지 못했습니다.")).toBeInTheDocument();
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "닫기" })).toBeEnabled());
  expect(within(dialog).getByRole("button", { name: "비활성화" })).toBeDisabled();
  fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByRole("button", { name: "수정" })).toBeDisabled();
  expect(screen.getByRole("switch")).toBeDisabled();
  expect(screen.getByRole("switch")).toBeChecked();
  expect(mockUpdate).toHaveBeenCalledTimes(1);
});
