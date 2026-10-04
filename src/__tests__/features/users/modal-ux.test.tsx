import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";

import { FcmTestSendModal } from "@/features/users/components/FcmTestSendModal";
import { ImpersonationModal } from "@/features/users/components/ImpersonationModal";
import { PropertyEditModal } from "@/features/properties/components/PropertyEditModal";

const mockSend = jest.fn();
const mockIssue = jest.fn();
const mockUpdate = jest.fn();
let mockPending = false;
const onClose = jest.fn();
jest.mock("@/features/fcm/hooks", () => ({ useSendToToken: () => ({ mutate: mockSend, isPending: mockPending }) }));
jest.mock("@/features/users/hooks", () => ({ useIssueImpersonationTokens: () => ({ mutate: mockIssue, isPending: mockPending }) }));
jest.mock("@/features/properties/hooks", () => ({ useUpdateProperty: () => ({ mutate: mockUpdate, isPending: mockPending }) }));

beforeEach(() => { jest.clearAllMocks(); mockPending = false; });

async function sendValidMessage() {
  fireEvent.change(screen.getByLabelText("제목"), { target: { value: "테스트 제목" } });
  fireEvent.change(screen.getByLabelText("내용"), { target: { value: "테스트 내용" } });
  fireEvent.click(screen.getByRole("button", { name: "발송" }));
  await waitFor(() => expect(mockSend).toHaveBeenCalledTimes(1));
}

test("FCM 입력 검증 실패는 발송하지 않고 오류를 폼에 표시한다", async () => {
  render(<App><FcmTestSendModal open fcmTokenId={3} onClose={onClose} /></App>);
  fireEvent.click(screen.getByRole("button", { name: "발송" }));
  expect(await screen.findByText("제목을 입력하세요.")).toBeInTheDocument();
  expect(screen.getByText("내용을 입력하세요.")).toBeInTheDocument();
  expect(mockSend).not.toHaveBeenCalled();
});

test("FCM 발송 도중 취소를 막고 다른 토큰 화면에 늦은 완료를 전달하지 않는다", async () => {
  const view = render(<App><FcmTestSendModal open fcmTokenId={3} onClose={onClose} /></App>);
  await sendValidMessage();
  mockPending = true;
  view.rerender(<App><FcmTestSendModal open fcmTokenId={3} onClose={onClose} /></App>);
  expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(onClose).not.toHaveBeenCalled();
  mockPending = false;
  view.rerender(<App><FcmTestSendModal open fcmTokenId={4} onClose={onClose} /></App>);
  expect(screen.getByLabelText("제목")).toHaveValue("");
  await act(async () => mockSend.mock.calls[0][1].onSuccess({ messageId: "late" }));
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toHaveTextContent("토큰 #4");
});

test("토큰 발급 결과는 요청한 사용자 세션에만 표시한다", async () => {
  const view = render(<App><ImpersonationModal open userId={12} onClose={onClose} /></App>);
  fireEvent.click(screen.getByRole("button", { name: "발급" }));
  fireEvent.click(screen.getByRole("button", { name: "발급" }));
  expect(mockIssue).toHaveBeenCalledTimes(1);
  mockPending = true;
  view.rerender(<App><ImpersonationModal open userId={12} onClose={onClose} /></App>);
  expect(screen.getByRole("button", { name: "닫기" })).toBeDisabled();
  mockPending = false;
  view.rerender(<App><ImpersonationModal open userId={13} onClose={onClose} /></App>);
  await act(async () => mockIssue.mock.calls[0][1].onSuccess({ accessToken: "old-access-token", refreshToken: "old-refresh-token" }));
  expect(screen.queryByText("old-access-token")).not.toBeInTheDocument();
  expect(screen.queryByText("old-refresh-token")).not.toBeInTheDocument();
});

test("저장하지 않은 건물 정보를 취소할 때 보존 또는 버리기를 선택한다", async () => {
  const property = { propertyId: 3, userId: 12, name: "원래 건물", address: null, activeTenantCount: 0, createdAt: "2026-10-01T10:00:00", updatedAt: "2026-10-01T10:00:00" };
  render(<App><PropertyEditModal property={property} onClose={onClose} /></App>);
  const input = await screen.findByLabelText("건물명");
  await waitFor(() => expect(input).toHaveValue("원래 건물"));
  fireEvent.change(input, { target: { value: "변경한 건물" } });
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  fireEvent.click(await screen.findByRole("button", { name: "계속 수정" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "계속 수정" })).not.toBeInTheDocument());
  expect(input).toHaveValue("변경한 건물");
  expect(onClose).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  fireEvent.click(await screen.findByRole("button", { name: "변경 내용 버리기" }));
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  expect(mockUpdate).not.toHaveBeenCalled();
});
