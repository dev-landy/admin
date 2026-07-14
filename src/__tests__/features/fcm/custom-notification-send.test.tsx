import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import FcmPage from "@/app/(admin)/fcm/page";
import { FcmTestSendModal } from "@/features/users/components/FcmTestSendModal";

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const getComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (element: Element): CSSStyleDeclaration => getComputedStyle(element);

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

class MockMessageChannel {
  port1 = { onmessage: null as ((event: MessageEvent) => void) | null };
  port2 = {
    postMessage: () => {
      setTimeout(() => this.port1.onmessage?.({} as MessageEvent), 0);
    },
  };
}

Object.defineProperty(global, "MessageChannel", { writable: true, value: MockMessageChannel });

const mockSendCustom = jest.fn();
const mockSendRegisteredToken = jest.fn();

jest.mock("antd", () => {
  const actual = jest.requireActual("antd");
  return {
    ...actual,
    Modal: ({ children, onOk, open, title }: React.PropsWithChildren<{
      onOk: () => void;
      open: boolean;
      title: React.ReactNode;
    }>) =>
      open ? (
        <section>
          <h1>{title}</h1>
          {children}
          <button type="button" onClick={onOk}>
            발송
          </button>
        </section>
      ) : null,
  };
});

jest.mock("@/features/notifications/hooks", () => ({
  useSendCustomNotification: () => ({ mutate: mockSendCustom, isPending: false }),
}));

jest.mock("@/features/fcm/hooks", () => ({
  useSendToToken: () => ({ mutate: mockSendRegisteredToken, isPending: false }),
}));

jest.mock("@/features/fcm/components/FcmTokenSendCard", () => ({
  FcmTokenSendCard: () => <div>등록 토큰 ID 발송</div>,
}));

jest.mock("@/features/fcm/components/FcmTopicSendCard", () => ({
  FcmTopicSendCard: () => <div>토픽 발송</div>,
}));

jest.mock("@/features/fcm/components/FcmTopicSubscriptionCard", () => ({
  FcmTopicSubscriptionCard: () => <div>토픽 구독 관리</div>,
}));

jest.mock("@/features/fcm/components/FcmSilentPushCard", () => ({
  FcmSilentPushCard: () => <div>Silent Push</div>,
}));

beforeEach(() => {
  mockSendCustom.mockReset();
  mockSendRegisteredToken.mockReset();
});

test("FCM 테스트 페이지는 등록 토큰 ID 기반 발송만 노출한다", () => {
  render(<FcmPage />);

  expect(screen.getByText("등록 토큰 ID 발송")).toBeInTheDocument();
  expect(screen.queryByText("토픽 발송")).not.toBeInTheDocument();
});

test("유저 FCM 테스트 발송은 선택한 등록 토큰 ID 경로를 사용한다", async () => {
  render(<FcmTestSendModal open onClose={jest.fn()} fcmTokenId={7} />);

  fireEvent.change(screen.getByLabelText("제목"), { target: { value: "테스트 제목" } });
  fireEvent.change(screen.getByLabelText("내용"), { target: { value: "테스트 내용" } });
  fireEvent.click(screen.getByRole("button", { name: "발송" }));

  await waitFor(() => {
    expect(mockSendRegisteredToken).toHaveBeenCalledWith(
      { fcmTokenId: 7, title: "테스트 제목", body: "테스트 내용" },
      expect.any(Object),
    );
  });
  expect(mockSendCustom).not.toHaveBeenCalled();
});
