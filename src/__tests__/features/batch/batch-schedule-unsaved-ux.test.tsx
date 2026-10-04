import "@/test-utils/antd";

import { useState } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";

import { NavigationGuardProvider, useNavigationGuard } from "@/components/NavigationGuard";
import { BatchScheduleEditModal } from "@/features/batch/components/BatchScheduleEditModal";
import type { BatchSchedule } from "@/features/batch/types";

const mockUpdate = jest.fn();
const mockClose = jest.fn();
const mockNavigate = jest.fn();
jest.mock("@/features/batch/hooks", () => ({
  useUpdateBatchSchedule: () => ({ mutate: mockUpdate, isPending: false }),
  useIsBatchScheduleUpdating: () => false,
}));

const schedule: BatchSchedule = {
  key: "DAILY_NOTIFICATION", jobName: "dailyNotificationJob", label: "일일 알림",
  cronExpression: "0 0 9 * * *", enabled: true,
  nextExecutionAt: "2026-10-03T09:00:00", updatedAt: "2026-10-02T09:00:00",
};
function Editor({ target = schedule }: { target?: BatchSchedule }) {
  const [closed, setClosed] = useState(false);
  const { requestNavigation } = useNavigationGuard();
  return <>
    <button onClick={() => setClosed(false)}>다시 수정</button>
    <button onClick={() => requestNavigation(mockNavigate)}>메뉴 이동</button>
    <BatchScheduleEditModal schedule={closed ? null : target} onClose={() => { mockClose(); setClosed(true); }} />
  </>;
}
function tree(target = schedule) {
  return <ConfigProvider theme={{ token: { motion: false } }}><App><NavigationGuardProvider>
    <Editor target={target} />
  </NavigationGuardProvider></App></ConfigProvider>;
}
async function open() {
  const view = render(tree());
  const editor = await screen.findByRole("dialog", { name: "배치 수정" });
  return { ...view, editor };
}
function change(editor: HTMLElement, value = "30") {
  fireEvent.change(within(editor).getByLabelText("분 (0~59)"), { target: { value } });
}
function close(editor: HTMLElement, path: string) {
  if (path === "취소") fireEvent.click(within(editor).getByRole("button", { name: "취소" }));
  else if (path === "Escape") fireEvent.keyDown(editor, { key: "Escape" });
  else {
    const wrapper = editor.closest(".ant-modal-wrap")!;
    fireEvent.mouseDown(wrapper);
    fireEvent.click(wrapper);
  }
}
beforeEach(() => { jest.clearAllMocks(); mockUpdate.mockReset(); });
afterEach(() => { jest.restoreAllMocks(); });

test.each(["취소", "Escape", "배경"])("배치 스케줄 %s 닫기를 중단하면 초안과 미리보기가 남는다", async (path) => {
  const { editor } = await open();
  await change(editor);
  close(editor, path);
  const confirmation = await screen.findByRole("dialog", { name: "수정 중인 내용을 버릴까요?" });
  if (path !== "Escape") close(editor, path);
  expect(screen.getAllByRole("dialog", { name: "수정 중인 내용을 버릴까요?" })).toHaveLength(1);
  fireEvent.click(within(confirmation).getByRole("button", { name: "계속 수정" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "수정 중인 내용을 버릴까요?" })).not.toBeInTheDocument());
  expect(within(editor).getByLabelText("분 (0~59)")).toHaveValue("30");
  expect(within(editor).getByText("0 30 9 * * *")).toBeInTheDocument();
  expect(mockClose).not.toHaveBeenCalled();
});

test("수정하지 않은 배치 스케줄은 확인 없이 즉시 닫힌다", async () => {
  const { editor } = await open();
  close(editor, "취소");
  expect(mockClose).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog", { name: "수정 중인 내용을 버릴까요?" })).not.toBeInTheDocument();
});

test("배치 실행 시간을 원래대로 되돌리면 폐기 확인과 이탈 경고가 없다", async () => {
  const { editor } = await open();
  await change(editor);
  await change(editor, "0");
  const confirm = jest.spyOn(window, "confirm");
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(confirm).not.toHaveBeenCalled();
  close(editor, "Escape");
  expect(mockClose).toHaveBeenCalledTimes(1);
});

test("배치 스케줄 변경을 버린 뒤 다시 열면 원래 실행 시간으로 시작한다", async () => {
  const { editor } = await open();
  await change(editor);
  close(editor, "취소");
  const confirmation = await screen.findByRole("dialog", { name: "수정 중인 내용을 버릴까요?" });
  fireEvent.click(within(confirmation).getByRole("button", { name: "변경 내용 버리기" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(mockClose).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "다시 수정" }));
  const reopened = await screen.findByRole("dialog", { name: "배치 수정" });
  expect(within(reopened).getByLabelText("분 (0~59)")).toHaveValue("0");
  expect(within(reopened).getByText(schedule.cronExpression)).toBeInTheDocument();
});

test("배치 스케줄 이탈을 취소하면 초안이 남고 저장 성공 후에는 이탈 경고가 해제된다", async () => {
  const { editor } = await open();
  await change(editor);
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(within(editor).getByLabelText("분 (0~59)")).toHaveValue("30");
  mockUpdate.mockImplementation((_variables, options) => options.onSuccess());
  fireEvent.click(within(editor).getByRole("button", { name: "저장" }));
  await waitFor(() => expect(mockClose).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("dialog", { name: "수정 중인 내용을 버릴까요?" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(confirm).toHaveBeenCalledTimes(1);
});

test("스케줄을 바꾸면 이전 폐기 확인과 저장 callback이 새 편집을 닫지 않는다", async () => {
  const { editor, rerender } = await open();
  await change(editor);
  fireEvent.click(within(editor).getByRole("button", { name: "저장" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  const previousSuccess = mockUpdate.mock.calls[0][1].onSuccess;
  close(editor, "취소");
  const confirmation = await screen.findByRole("dialog", { name: "수정 중인 내용을 버릴까요?" });
  const discard = within(confirmation).getByRole("button", { name: "변경 내용 버리기" });
  const next: BatchSchedule = { ...schedule, key: "SILENT_WAKEUP", cronExpression: "0 15 10 * * *" };
  rerender(tree(next));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "수정 중인 내용을 버릴까요?" })).not.toBeInTheDocument());
  act(() => { fireEvent.click(discard); previousSuccess(); });
  expect(mockClose).not.toHaveBeenCalled();
  const current = screen.getByRole("dialog", { name: "배치 수정" });
  expect(within(current).getByLabelText("분 (0~59)")).toHaveValue("15");
  expect(within(current).getByText(next.cronExpression)).toBeInTheDocument();
});
