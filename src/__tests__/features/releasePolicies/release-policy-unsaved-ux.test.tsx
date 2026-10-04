import "@/test-utils/antd";

import { useState } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";

import { NavigationGuardProvider, useNavigationGuard } from "@/components/NavigationGuard";
import { ReleasePolicyEditModal } from "@/features/releasePolicies/components/ReleasePolicyEditModal";
import type { ReleasePolicy } from "@/features/releasePolicies/types";

const mockUpdate = jest.fn();
const mockClose = jest.fn();
const mockNavigate = jest.fn();
jest.mock("@/features/releasePolicies/hooks", () => ({
  useUpdateReleasePolicy: () => ({ mutate: mockUpdate, isPending: false }),
}));

const policy: ReleasePolicy = {
  appReleasePolicyId: 1, platform: "IOS", channel: "PRODUCTION", latestBuildNumber: 12,
  latestVersion: "1.2.0", minSupportedBuildNumber: 10, storeUrl: "https://apps.apple.com/app/id1",
  forceUpdateTitle: "필수", forceUpdateMessage: "필수 업데이트", softUpdateTitle: "권장",
  softUpdateMessage: "권장 업데이트", createdAt: "2026-10-01T09:00:00", updatedAt: "2026-10-01T09:00:00",
};
const draft = "작성 중인 긴 업데이트 안내를 닫기 확인에서 취소해도 그대로 유지합니다.";

function Editor({ target = policy }: { target?: ReleasePolicy }) {
  const [closed, setClosed] = useState(false);
  const { requestNavigation } = useNavigationGuard();
  return <>
    <button onClick={() => setClosed(false)}>다시 수정</button>
    <button onClick={() => requestNavigation(mockNavigate)}>메뉴 이동</button>
    <ReleasePolicyEditModal policy={closed ? null : target} onClose={() => { mockClose(); setClosed(true); }} />
  </>;
}
function tree(target = policy) {
  return <ConfigProvider theme={{ token: { motion: false } }}><App><NavigationGuardProvider>
    <Editor target={target} />
  </NavigationGuardProvider></App></ConfigProvider>;
}
async function open() {
  const view = render(tree());
  const editor = await screen.findByRole("dialog", { name: "릴리즈 정책 수정" });
  return { ...view, editor };
}
function change(editor: HTMLElement, value = draft) {
  fireEvent.change(within(editor).getByLabelText("강제 업데이트 메시지"), { target: { value } });
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

test.each(["취소", "Escape", "배경"])("릴리즈 정책 %s 닫기를 중단하면 초안이 그대로 남는다", async (path) => {
  const { editor } = await open();
  await change(editor);
  close(editor, path);
  const confirmation = await screen.findByRole("dialog", { name: "수정 중인 내용을 버릴까요?" });
  // 같은 닫기 요청이 반복되어도 확인창은 하나만 표시한다.
  if (path !== "Escape") close(editor, path);
  expect(screen.getAllByRole("dialog", { name: "수정 중인 내용을 버릴까요?" })).toHaveLength(1);
  fireEvent.click(within(confirmation).getByRole("button", { name: "계속 수정" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "수정 중인 내용을 버릴까요?" })).not.toBeInTheDocument());
  expect(within(editor).getByLabelText("강제 업데이트 메시지")).toHaveValue(draft);
  expect(mockClose).not.toHaveBeenCalled();
});

test("수정하지 않은 릴리즈 정책은 확인 없이 즉시 닫힌다", async () => {
  const { editor } = await open();
  close(editor, "취소");
  expect(mockClose).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("dialog", { name: "수정 중인 내용을 버릴까요?" })).not.toBeInTheDocument();
});

test("릴리즈 정책 값을 원래대로 되돌리면 초안 폐기 확인과 이탈 경고가 없다", async () => {
  const { editor } = await open();
  await change(editor);
  await change(editor, policy.forceUpdateMessage);
  const confirm = jest.spyOn(window, "confirm");
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(confirm).not.toHaveBeenCalled();
  close(editor, "Escape");
  expect(mockClose).toHaveBeenCalledTimes(1);
});

test("릴리즈 정책 변경을 버린 뒤 다시 열면 원래 값으로 시작한다", async () => {
  const { editor } = await open();
  await change(editor);
  close(editor, "취소");
  const confirmation = await screen.findByRole("dialog", { name: "수정 중인 내용을 버릴까요?" });
  fireEvent.click(within(confirmation).getByRole("button", { name: "변경 내용 버리기" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(mockClose).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "다시 수정" }));
  const reopened = await screen.findByRole("dialog", { name: "릴리즈 정책 수정" });
  expect(within(reopened).getByLabelText("강제 업데이트 메시지")).toHaveValue(policy.forceUpdateMessage);
});

test("릴리즈 정책 이탈을 취소하면 초안이 남고 저장 성공 후에는 이탈 경고가 해제된다", async () => {
  const { editor } = await open();
  await change(editor);
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(within(editor).getByLabelText("강제 업데이트 메시지")).toHaveValue(draft);
  mockUpdate.mockImplementation((_variables, options) => options.onSuccess());
  fireEvent.click(within(editor).getByRole("button", { name: "저장" }));
  await waitFor(() => expect(mockClose).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("dialog", { name: "수정 중인 내용을 버릴까요?" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(mockNavigate).toHaveBeenCalledTimes(1);
  expect(confirm).toHaveBeenCalledTimes(1);
});

test("정책을 바꾸면 이전 폐기 확인과 저장 callback이 새 편집을 닫지 않는다", async () => {
  const { editor, rerender } = await open();
  await change(editor);
  fireEvent.click(within(editor).getByRole("button", { name: "저장" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  const previousSuccess = mockUpdate.mock.calls[0][1].onSuccess;
  close(editor, "취소");
  const confirmation = await screen.findByRole("dialog", { name: "수정 중인 내용을 버릴까요?" });
  const discard = within(confirmation).getByRole("button", { name: "변경 내용 버리기" });
  const next = { ...policy, appReleasePolicyId: 2, forceUpdateMessage: "다른 정책 안내" };
  rerender(tree(next));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "수정 중인 내용을 버릴까요?" })).not.toBeInTheDocument());
  act(() => { fireEvent.click(discard); previousSuccess(); });
  expect(mockClose).not.toHaveBeenCalled();
  const current = screen.getByRole("dialog", { name: "릴리즈 정책 수정" });
  expect(within(current).getByLabelText("강제 업데이트 메시지")).toHaveValue(next.forceUpdateMessage);
});
