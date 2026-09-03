import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";

import { SendNotificationModal } from "@/features/notifications/components/SendNotificationModal";
import type {
  SendCustomNotificationRequest,
  SendCustomNotificationResponse,
} from "@/features/notifications/types";

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

type SendOptions = {
  onSuccess: (result: SendCustomNotificationResponse) => void;
  onError: (error: unknown) => void;
};

const mockSend = jest.fn();
const onClose = jest.fn();

jest.mock("@/features/notifications/hooks", () => ({
  useSendCustomNotification: () => ({ mutate: mockSend, isPending: false }),
}));

const RESULT: SendCustomNotificationResponse = {
  notificationId: 101,
  sent: 0,
  failed: 0,
  skipped: 0,
  alreadyClaimed: 0,
};

// 발송 결과를 정해두고 폼을 채워 발송까지 진행한다.
async function send(result: SendCustomNotificationResponse) {
  mockSend.mockImplementation((_request: SendCustomNotificationRequest, options: SendOptions) => {
    options.onSuccess(result);
  });

  render(
    <App>
      <SendNotificationModal open onClose={onClose} />
    </App>,
  );

  fireEvent.change(screen.getByLabelText("유저 ID"), { target: { value: "12" } });
  fireEvent.change(screen.getByLabelText("제목"), { target: { value: "점검 안내" } });
  fireEvent.change(screen.getByLabelText("내용"), { target: { value: "오후 2시 점검" } });
  fireEvent.click(screen.getByRole("button", { name: "발송" }));

  await waitFor(() => expect(mockSend).toHaveBeenCalled());
}

beforeEach(() => {
  mockSend.mockReset();
  onClose.mockReset();
});

test("입력한 유저 ID와 제목·내용으로 커스텀 알림 발송을 요청한다", async () => {
  await send({ ...RESULT, sent: 1 });

  expect(mockSend).toHaveBeenCalledWith(
    { userId: 12, title: "점검 안내", body: "오후 2시 점검" },
    expect.any(Object),
  );
});

test("발송된 건이 있으면 전송·실패·건너뜀 건수를 그대로 알린다", async () => {
  await send({ ...RESULT, sent: 2, failed: 1, skipped: 3 });

  expect(await screen.findByText("알림 발송 완료")).toBeInTheDocument();
  expect(screen.getByText("알림 ID 101 — 전송 2 / 실패 1 / 건너뜀 3")).toBeInTheDocument();
  expect(screen.queryByText(/자동 발송기/)).not.toBeInTheDocument();
  await waitFor(() => expect(onClose).toHaveBeenCalled());
});

test("모두 0건이고 선점된 건도 없으면 발송 대상이 없었다고 알린다", async () => {
  await send(RESULT);

  expect(await screen.findByText("발송 대상이 없습니다")).toBeInTheDocument();
  expect(
    screen.getByText("활성 FCM 토큰이 없어 발송할 대상이 없습니다. 전송된 푸시가 없습니다."),
  ).toBeInTheDocument();
  expect(screen.queryByText(/자동 발송기/)).not.toBeInTheDocument();
});

test("자동 발송기가 먼저 가져간 건이 있으면 재발송하지 말라고 알린다", async () => {
  await send({ ...RESULT, alreadyClaimed: 2 });

  expect(await screen.findByText("이미 자동 발송 중입니다 — 다시 발송하지 마세요")).toBeInTheDocument();
  expect(screen.getByText(/자동 발송기가 2건을 먼저 가져갔습니다/)).toBeInTheDocument();
  expect(screen.getByText(/누락이 아닙니다/)).toBeInTheDocument();
  expect(screen.getByText(/다시 발송하면 인앱 알림과 푸시가 중복됩니다/)).toBeInTheDocument();
  // 대상이 없어 못 보낸 경우와 같은 0/0/0이지만, 그 문구가 나오면 안 된다.
  expect(screen.queryByText("발송 대상이 없습니다")).not.toBeInTheDocument();
});

test("일부는 발송되고 일부를 자동 발송기가 가져갔으면 경고와 함께 건수도 알린다", async () => {
  await send({ ...RESULT, sent: 1, skipped: 1, alreadyClaimed: 3 });

  expect(await screen.findByText("이미 자동 발송 중입니다 — 다시 발송하지 마세요")).toBeInTheDocument();
  expect(screen.getByText("이번 요청이 처리한 건: 전송 1 / 실패 0 / 건너뜀 1")).toBeInTheDocument();
  expect(screen.queryByText("알림 발송 완료")).not.toBeInTheDocument();
});
