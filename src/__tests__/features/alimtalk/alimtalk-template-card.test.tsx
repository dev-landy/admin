import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";
import { AlimtalkTemplateCard } from "@/features/alimtalk/components/AlimtalkTemplateCard";
import { approvedAlimtalkTemplate as template } from "@/test-utils/alimtalk";

const mockUpdate = jest.fn();
const mockSync = jest.fn();
jest.mock("@/features/alimtalk/hooks", () => ({
  useUpdateAlimtalkTemplate: () => ({ mutate: mockUpdate, isPending: false }),
  useSyncAlimtalkTemplate: () => ({ mutate: mockSync, isPending: false }),
}));
beforeEach(() => { jest.clearAllMocks(); mockUpdate.mockReset(); mockSync.mockReset(); });
function tree(target = template) { return <App><AlimtalkTemplateCard template={target} /></App>; }
async function syncMenu() {
  fireEvent.click(screen.getByRole("button", { name: "납부일 안내 더보기" }));
  return screen.findByRole("menuitem", { name: "승인 정보 갱신" });
}

test("저장된 승인 본문·강조 정보와 상태를 읽기 전용으로 표시하며 자동 갱신하지 않는다", () => {
  render(tree());
  expect(screen.getByText(template.content!)).toBeInTheDocument();
  expect(screen.getByText(template.title!)).toBeInTheDocument();
  expect(screen.getByText(template.subtitle!)).toBeInTheDocument();
  expect(screen.getByText("강조형 (TEXT)")).toBeInTheDocument();
  expect(screen.getByText("APPROVED")).toBeInTheDocument();
  expect(screen.getByText("부가 안내")).toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: /본문/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "승인 본문 가져오기" })).not.toBeInTheDocument();
  expect(mockSync).not.toHaveBeenCalled();
});

test("저장은 ID·사용 여부만 보내고 반환된 승인 정보를 곧바로 표시한다", async () => {
  mockUpdate.mockImplementation((_request, options) => options.onSuccess({ ...template, pfId: "new-channel", content: "새 승인 본문", title: "새 승인 제목" }));
  render(tree());
  fireEvent.change(screen.getByLabelText("채널 ID (pfId)"), { target: { value: "new-channel" } });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ type: "DUE", body: {
    pfId: "new-channel", templateId: "template", enabled: true,
  } }, expect.any(Object)));
  expect(screen.getByText("새 승인 본문")).toBeInTheDocument();
  expect(screen.getByText("새 승인 제목")).toBeInTheDocument();
  expect(mockSync).not.toHaveBeenCalled();
});

test("ID 초안은 저장을 안내하고 저장 전 갱신을 막는다", async () => {
  render(tree());
  fireEvent.change(screen.getByLabelText("템플릿 ID"), { target: { value: "new-template" } });
  expect(await screen.findByText("ID 변경 사항을 먼저 저장하세요")).toBeInTheDocument();
  const menu = await syncMenu();
  expect(menu).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(menu);
  expect(mockSync).not.toHaveBeenCalled();
  expect(screen.getByLabelText("템플릿 ID")).toHaveValue("new-template");
});

test("저장된 ID의 갱신 성공은 승인 metadata를 교체한다", async () => {
  mockSync.mockImplementation((_type, options) => options.onSuccess({ ...template, title: "갱신된 제목", content: "갱신된 본문" }));
  render(tree());
  fireEvent.click(await syncMenu());
  await screen.findByText("갱신된 제목");
  expect(screen.getByText("갱신된 본문")).toBeInTheDocument();
  expect(mockSync).toHaveBeenCalledWith("DUE", expect.any(Object));
  expect(mockUpdate).not.toHaveBeenCalled();
});

test("갱신 중 중복 요청을 막고 실패 뒤 기존 승인 정보를 보존하며 재시도한다", async () => {
  render(tree({ ...template, sendable: false }));
  const sync = screen.getByRole("button", { name: "승인 정보 갱신" });
  fireEvent.click(sync);
  fireEvent.click(sync);
  expect(mockSync).toHaveBeenCalledTimes(1);
  expect(sync).toBeDisabled();
  await act(async () => { mockSync.mock.calls[0][1].onError(new Error("network")); });
  expect(screen.getByText(template.content!)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "다시 갱신" }));
  expect(mockSync).toHaveBeenCalledTimes(2);
});
