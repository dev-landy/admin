import "@/test-utils/antd";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";
import { AlimtalkTemplateCard } from "@/features/alimtalk/components/AlimtalkTemplateCard";
import { AlimtalkTestSendModal } from "@/features/alimtalk/components/AlimtalkTestSendModal";
import { approvedAlimtalkTemplate as template } from "@/test-utils/alimtalk";

const mockUpdate = jest.fn();
const mockSend = jest.fn();
let mockFetching = false;
let mockPending = false;
jest.mock("@/features/alimtalk/hooks", () => ({
  useUpdateAlimtalkTemplate: () => ({ mutate: mockUpdate, isPending: false }),
  useSyncAlimtalkTemplate: () => ({ mutate: jest.fn(), isPending: false }),
  useAlimtalkTemplates: () => ({ data: { templates: [template] }, isFetching: mockFetching, error: null, refetch: jest.fn() }),
  useSendTestAlimtalk: () => ({ mutate: mockSend, isPending: mockPending }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockFetching = false;
  mockPending = false;
});

test("템플릿 백그라운드 갱신은 편집 중인 초안을 덮어쓰지 않는다", async () => {
  const view = render(<App><AlimtalkTemplateCard template={template} /></App>);
  await act(async () => { fireEvent.change(screen.getByLabelText("템플릿 ID"), { target: { value: "draft" } }); });
  view.rerender(<App><AlimtalkTemplateCard template={{ ...template, templateId: "server-template", content: "다른 운영자가 저장한 승인 본문" }} /></App>);
  expect(screen.getByLabelText("템플릿 ID")).toHaveValue("draft");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "저장" })); });
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ type: "DUE", body: expect.objectContaining({ templateId: "draft" }) }, expect.any(Object)));
});

test("저장 승인 정보를 새로 조회하는 동안 캐시가 있어도 실제 테스트 발송을 막는다", () => {
  mockFetching = true;
  render(<App><AlimtalkTestSendModal open onClose={jest.fn()} /></App>);
  expect(screen.getByRole("button", { name: "발송" })).toBeDisabled();
  expect(mockSend).not.toHaveBeenCalled();
});

test("과금 발송 중에는 종류 변경과 닫기·번호 입력을 잠근다", () => {
  mockPending = true;
  render(<App><AlimtalkTestSendModal open onClose={jest.fn()} /></App>);
  expect(screen.getByRole("button", { name: "닫기" })).toBeDisabled();
  expect(screen.getByLabelText("수신 번호")).toBeDisabled();
  expect(screen.getByRole("radio", { name: "미납 안내" })).toBeDisabled();
});
