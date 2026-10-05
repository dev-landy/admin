let mockViewport: "mobile" | "compact" | "wide" = "wide";
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: () => mockViewport }));
beforeEach(() => { mockViewport = "wide"; });

import "@/test-utils/antd";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { NavigationGuardProvider, useNavigationGuard } from "@/components/NavigationGuard";
import { AlimtalkTemplateCard } from "@/features/alimtalk/components/AlimtalkTemplateCard";
import type { AlimtalkTemplate, RemoteAlimtalkTemplate } from "@/features/alimtalk/types";

const mockUpdate = jest.fn();
const mockRefetch = jest.fn();
const mockNavigate = jest.fn();
let mockRemoteError: Error | null = null;
let mockRemote: RemoteAlimtalkTemplate | undefined;
let mockRemoteFetching = false;

jest.mock("@/features/alimtalk/hooks", () => ({
  useUpdateAlimtalkTemplate: () => ({ mutate: mockUpdate, isPending: false }),
  useRemoteAlimtalkTemplate: (_type: string, enabled: boolean) => ({
    data: enabled ? mockRemote : undefined,
    error: enabled ? mockRemoteError : null,
    isFetching: enabled && mockRemoteFetching,
    refetch: mockRefetch,
  }),
}));

const template: AlimtalkTemplate = {
  type: "DUE", pfId: "channel", templateId: "template", body: "원본", enabled: true,
  sendable: true, updatedAt: "2026-10-01T10:00:00",
};
const remote: RemoteAlimtalkTemplate = {
  type: "DUE", templateId: "template", name: "납부일 안내", status: "APPROVED",
  content: "승인 본문", variableNames: [], storedBodyMatches: false,
};

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
beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockReset();
  mockRemoteError = null;
  mockRemote = undefined;
  mockRemoteFetching = false;
});
afterEach(() => jest.restoreAllMocks());

test("템플릿 초안 이탈을 취소하면 입력을 유지하고 새로고침도 보호한다", async () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  render(tree());
  expect(beforeUnload()).toBe(false);
  await act(async () => { fireEvent.change(screen.getByLabelText("본문 사본"), { target: { value: "작성 중인 초안" } }); });
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(screen.getByLabelText("본문 사본")).toHaveValue("작성 중인 초안");
  expect(beforeUnload()).toBe(true);
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(mockNavigate).toHaveBeenCalledTimes(1);
});

test("원래 값으로 되돌린 초안과 깨끗한 재조회에는 이탈 확인이 없다", async () => {
  const confirm = jest.spyOn(window, "confirm");
  const view = render(tree());
  await act(async () => { fireEvent.change(screen.getByLabelText("본문 사본"), { target: { value: "수정" } }); });
  await act(async () => { fireEvent.change(screen.getByLabelText("본문 사본"), { target: { value: template.body } }); });
  expect(beforeUnload()).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).not.toHaveBeenCalled();
  view.unmount();
  const clean = render(tree());
  clean.rerender(tree({ ...template, body: "최신 서버 본문" }));
  expect(screen.getByLabelText("본문 사본")).toHaveValue("최신 서버 본문");
  expect(beforeUnload()).toBe(false);
});

test("저장 성공은 서버의 확정값을 기준으로 보호를 해제하고 다음 편집을 다시 보호한다", async () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  mockUpdate.mockImplementation((_variables, options) => options.onSuccess({ ...template, body: "저장된 본문" }));
  render(tree());
  await act(async () => { fireEvent.change(screen.getByLabelText("본문 사본"), { target: { value: "저장할 본문" } }); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "저장" })); });
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText("본문 사본")).toHaveValue("저장된 본문");
  expect(beforeUnload()).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).not.toHaveBeenCalled();
  await act(async () => { fireEvent.change(screen.getByLabelText("본문 사본"), { target: { value: "새 초안" } }); });
  expect(beforeUnload()).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "메뉴 이동" }));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(mockNavigate).toHaveBeenCalledTimes(1);
});

async function lookupRemote() {
  fireEvent.click(screen.getByRole("button", { name: "납부일 안내 더보기" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "승인 템플릿 조회" }));
}

test.each(["wide", "mobile"] as const)("%s에서도 승인 본문 가져오기를 초안으로 보호한다", async (viewport) => {
  mockViewport = viewport;
  mockRemote = remote;
  render(tree());
  await lookupRemote();
  fireEvent.click(screen.getByRole("button", { name: "승인 본문 가져오기" }));
  expect(screen.getByLabelText("본문 사본")).toHaveValue(remote.content);
  expect(beforeUnload()).toBe(true);
});

test("일반 네트워크 실패를 보여 주고 복구 버튼과 기존 조회 버튼으로 다시 조회한다", async () => {
  mockRemoteError = new Error("network");
  render(tree());
  await lookupRemote();
  expect(screen.getByText("승인 템플릿을 불러오지 못했습니다.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
  await lookupRemote();
  expect(mockRefetch).toHaveBeenCalledTimes(2);
});

test("재조회 중에는 캐시를 유지하면서 중복 조회를 막는다", async () => {
  mockRemote = remote;
  mockRemoteError = new Error("refresh failed");
  const view = render(tree());
  await lookupRemote();
  expect(screen.getByText("공급자 승인 템플릿")).toBeInTheDocument();
  expect(screen.getByText("마지막으로 조회한 정보를 표시하고 있습니다. 다시 조회해 주세요.")).toBeInTheDocument();
  mockRemoteFetching = true;
  view.rerender(tree());
  expect(screen.getByRole("button", { name: "납부일 안내 더보기" })).toBeDisabled();
  expect(screen.getByRole("button", { name: /다시 조회$/ })).toBeDisabled();
  expect(screen.getByText("공급자 승인 템플릿")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "납부일 안내 더보기" }));
  fireEvent.click(screen.getByRole("button", { name: /다시 조회$/ }));
  expect(mockRefetch).not.toHaveBeenCalled();
  mockRemoteFetching = false;
  mockRemoteError = null;
  view.rerender(tree());
  expect(screen.getByRole("button", { name: "납부일 안내 더보기" })).toBeEnabled();
  expect(screen.queryByText("승인 템플릿을 불러오지 못했습니다.")).not.toBeInTheDocument();
  await lookupRemote();
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});


test("모바일은 하단 저장 하나로 중복 요청을 막고 실패 후 같은 초안으로 재시도한다", async () => {
  mockViewport = "mobile";
  render(tree());
  fireEvent.change(screen.getByLabelText("본문 사본"), { target: { value: "저장할 초안" } });
  expect(screen.queryByRole("button", { name: "저장" })).not.toBeInTheDocument();
  const footerSave = screen.getByRole("button", { name: "납부일 안내 변경 사항 저장" });
  fireEvent.click(footerSave);
  fireEvent.click(footerSave);
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect(footerSave).toBeDisabled();
  expect(screen.getByLabelText("본문 사본")).toBeDisabled();
  await act(async () => { mockUpdate.mock.calls[0][1].onError(new Error("network")); });
  expect(footerSave).toBeEnabled();
  expect(screen.getByLabelText("본문 사본")).toHaveValue("저장할 초안");
  fireEvent.click(footerSave);
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
  expect(mockUpdate).toHaveBeenLastCalledWith({ type: "DUE", body: { pfId: "channel", templateId: "template", body: "저장할 초안", enabled: true } }, expect.any(Object));
});


test("모바일 발송 불가 안내는 본문 아래 복구 조회와 하단 저장 하나를 제공한다", async () => {
  mockViewport = "mobile";
  mockRemote = remote;
  render(tree({ ...template, sendable: false }));
  const warning = screen.getByRole("alert");
  const recovery = screen.getByRole("button", { name: "승인 템플릿 조회" });
  expect(warning).toContainElement(recovery);
  expect(recovery.closest(".ant-alert-description")).not.toBeNull();
  expect(warning.querySelector(".ant-alert-actions")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "저장" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "납부일 안내 변경 사항 저장" })).toBeEnabled();
  expect(screen.queryByText("공급자 승인 템플릿")).not.toBeInTheDocument();
  fireEvent.click(recovery);
  expect(await screen.findByText("공급자 승인 템플릿")).toBeInTheDocument();
  expect(mockUpdate).not.toHaveBeenCalled();
});
