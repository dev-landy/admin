import "@/test-utils/antd";
import type { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, ConfigProvider } from "antd";

import { FcmTestSendModal } from "@/features/users/components/FcmTestSendModal";
import { ImpersonationModal } from "@/features/users/components/ImpersonationModal";

const mockSend = jest.fn();
const mockIssue = jest.fn();
let mockPending = false;
const onClose = jest.fn();
jest.mock("@/features/fcm/hooks", () => ({ useSendToToken: () => ({ mutate: mockSend, isPending: mockPending }) }));
jest.mock("@/features/users/hooks", () => ({ useIssueImpersonationTokens: () => ({ mutate: mockIssue, isPending: mockPending }) }));

beforeEach(() => { jest.clearAllMocks(); mockPending = false; });

function TestApp({ children }: { children: ReactNode }) {
  // jsdom은 CSS motion 완료 이벤트를 발생시키지 않는다. 공개 테마 설정으로 모션만 끈다.
  return <ConfigProvider theme={{ token: { motion: false } }}><App>{children}</App></ConfigProvider>;
}

async function sendValidMessage() {
  fireEvent.change(screen.getByLabelText("제목"), { target: { value: "테스트 제목" } });
  fireEvent.change(screen.getByLabelText("내용"), { target: { value: "테스트 내용" } });
  fireEvent.click(screen.getByRole("button", { name: "발송" }));
  await waitFor(() => expect(mockSend).toHaveBeenCalledTimes(1));
}

test("FCM 입력 검증 실패는 발송하지 않고 오류를 폼에 표시한다", async () => {
  render(<TestApp><FcmTestSendModal open fcmTokenId={3} onClose={onClose} /></TestApp>);
  fireEvent.click(screen.getByRole("button", { name: "발송" }));
  expect(await screen.findByText("제목을 입력하세요.")).toBeInTheDocument();
  expect(screen.getByText("내용을 입력하세요.")).toBeInTheDocument();
  expect(mockSend).not.toHaveBeenCalled();
});

test("FCM 발송 도중 취소를 막고 다른 토큰 화면에 늦은 완료를 전달하지 않는다", async () => {
  const view = render(<TestApp><FcmTestSendModal open fcmTokenId={3} onClose={onClose} /></TestApp>);
  await sendValidMessage();
  expect(mockSend).toHaveBeenCalledWith(
    { fcmTokenId: 3, title: "테스트 제목", body: "테스트 내용" },
    expect.any(Object),
  );
  mockPending = true;
  view.rerender(<TestApp><FcmTestSendModal open fcmTokenId={3} onClose={onClose} /></TestApp>);
  expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(onClose).not.toHaveBeenCalled();
  mockPending = false;
  view.rerender(<TestApp><FcmTestSendModal open fcmTokenId={4} onClose={onClose} /></TestApp>);
  expect(screen.getByLabelText("제목")).toHaveValue("");
  await act(async () => mockSend.mock.calls[0][1].onSuccess({ messageId: "late" }));
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByRole("dialog")).toHaveTextContent("토큰 #4");
});

test("토큰 발급 결과는 요청한 사용자 세션에만 표시한다", async () => {
  const view = render(<TestApp><ImpersonationModal open userId={12} onClose={onClose} /></TestApp>);
  fireEvent.click(screen.getByRole("button", { name: "발급" }));
  fireEvent.click(screen.getByRole("button", { name: "발급" }));
  expect(mockIssue).toHaveBeenCalledTimes(1);
  mockPending = true;
  view.rerender(<TestApp><ImpersonationModal open userId={12} onClose={onClose} /></TestApp>);
  expect(screen.getByRole("button", { name: "닫기" })).toBeDisabled();
  mockPending = false;
  view.rerender(<TestApp><ImpersonationModal open userId={13} onClose={onClose} /></TestApp>);
  await act(async () => mockIssue.mock.calls[0][1].onSuccess({ accessToken: "old-access-token", refreshToken: "old-refresh-token" }));
  expect(screen.queryByText("old-access-token")).not.toBeInTheDocument();
  expect(screen.queryByText("old-refresh-token")).not.toBeInTheDocument();
});
