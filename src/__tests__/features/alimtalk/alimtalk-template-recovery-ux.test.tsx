import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { NavigationGuardProvider, useNavigationGuard } from "@/components/NavigationGuard";
import { AlimtalkTemplateCard } from "@/features/alimtalk/components/AlimtalkTemplateCard";
import { approvedAlimtalkTemplate as template } from "@/test-utils/alimtalk";

let mockViewport: "mobile" | "compact" | "wide" = "wide";
const mockUpdate = jest.fn();
const mockSync = jest.fn();
const mockNavigate = jest.fn();
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: () => mockViewport }));
jest.mock("@/features/alimtalk/hooks", () => ({
  useUpdateAlimtalkTemplate: () => ({ mutate: mockUpdate, isPending: false }),
  useSyncAlimtalkTemplate: () => ({ mutate: mockSync, isPending: false }),
}));
function NavigationProbe() {
  const { requestNavigation } = useNavigationGuard();
  return <button onClick={() => requestNavigation(mockNavigate)}>메뉴 이동</button>;
}
function tree(target = template) {
  return <ConfigProvider theme={{ token: { motion: false } }}><App><NavigationGuardProvider>
    <AlimtalkTemplateCard template={target} /><NavigationProbe />
  </NavigationGuardProvider></App></ConfigProvider>;
}
function beforeUnload() {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}
beforeEach(() => { jest.clearAllMocks(); mockUpdate.mockReset(); mockSync.mockReset(); mockViewport = "wide"; });
afterEach(() => jest.restoreAllMocks());

test("ID 초안 이탈을 취소하면 입력을 유지하고 새로고침도 보호한다", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  render(tree());
  expect(beforeUnload()).toBe(false);
  fireEvent.change(screen.getByLabelText("템플릿 ID"), { target: { value: "draft" } });
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(screen.getByLabelText("템플릿 ID")).toHaveValue("draft");
  expect(beforeUnload()).toBe(true);
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(mockNavigate).toHaveBeenCalledTimes(1);
});

test("원래 값으로 되돌린 초안과 깨끗한 재조회에는 이탈 확인이 없다", () => {
  const confirm = jest.spyOn(window, "confirm");
  const view = render(tree());
  fireEvent.change(screen.getByLabelText("템플릿 ID"), { target: { value: "draft" } });
  fireEvent.change(screen.getByLabelText("템플릿 ID"), { target: { value: template.templateId } });
  expect(beforeUnload()).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).not.toHaveBeenCalled();
  view.rerender(tree({ ...template, templateId: "latest", content: "최신 승인 본문" }));
  expect(screen.getByLabelText("템플릿 ID")).toHaveValue("latest");
  expect(screen.getByText("최신 승인 본문")).toBeInTheDocument();
  expect(beforeUnload()).toBe(false);
});

test("저장 성공은 서버 확정값으로 보호를 해제하고 다음 편집을 다시 보호한다", async () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  mockUpdate.mockImplementation((_request, options) => options.onSuccess({ ...template, templateId: "saved", content: "저장된 승인 본문" }));
  render(tree());
  fireEvent.change(screen.getByLabelText("템플릿 ID"), { target: { value: "draft" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "저장" })); });
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText("템플릿 ID")).toHaveValue("saved");
  expect(screen.getByText("저장된 승인 본문")).toBeInTheDocument();
  expect(beforeUnload()).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("템플릿 ID"), { target: { value: "new-draft" } });
  expect(beforeUnload()).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).toHaveBeenCalledTimes(1);
});

test("사용 여부 초안 중 갱신해도 초안을 보존하고 승인 내용만 바뀐다", async () => {
  mockSync.mockImplementation((_type, options) => options.onSuccess({ ...template, title: "갱신된 제목" }));
  render(tree({ ...template, sendable: false }));
  fireEvent.click(screen.getByRole("switch", { name: "납부일 안내 발송 사용" }));
  fireEvent.click(screen.getByRole("button", { name: "승인 정보 갱신" }));
  await screen.findByText("갱신된 제목");
  expect(screen.getByRole("switch", { name: "납부일 안내 발송 사용" })).not.toBeChecked();
  expect(beforeUnload()).toBe(true);
});

test("모바일은 하단 저장 하나로 중복 요청을 막고 실패 후 같은 ID 초안으로 재시도한다", async () => {
  mockViewport = "mobile";
  render(tree());
  fireEvent.change(screen.getByLabelText("템플릿 ID"), { target: { value: "draft" } });
  expect(screen.queryByRole("button", { name: "저장" })).not.toBeInTheDocument();
  const save = screen.getByRole("button", { name: "납부일 안내 변경 사항 저장" });
  fireEvent.click(save);
  fireEvent.click(save);
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(save).toBeDisabled();
  expect(screen.getByLabelText("템플릿 ID")).toBeDisabled();
  await act(async () => { mockUpdate.mock.calls[0][1].onError(new Error("network")); });
  expect(save).toBeEnabled();
  expect(screen.getByLabelText("템플릿 ID")).toHaveValue("draft");
  fireEvent.click(save);
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
  expect(mockUpdate).toHaveBeenLastCalledWith({ type: "DUE", body: { pfId: "channel", templateId: "draft", enabled: true } }, expect.any(Object));
});

test("모바일 발송 불가 안내는 설명 아래 갱신과 하단 저장을 제공한다", () => {
  mockViewport = "mobile";
  render(tree({ ...template, sendable: false }));
  const recovery = screen.getByRole("button", { name: "승인 정보 갱신" });
  expect(recovery.closest(".ant-alert-description")).not.toBeNull();
  expect(screen.queryByRole("button", { name: "저장" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "납부일 안내 변경 사항 저장" })).toBeEnabled();
  fireEvent.click(recovery);
  expect(mockSync).toHaveBeenCalledWith("DUE", expect.any(Object));
  expect(mockUpdate).not.toHaveBeenCalled();
});
