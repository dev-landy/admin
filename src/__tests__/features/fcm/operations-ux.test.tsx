import "@/test-utils/antd";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";

import { FcmTokenSendCard } from "@/features/fcm/components/FcmTokenSendCard";
import { FcmTopicSubscriptionCard } from "@/features/fcm/components/FcmTopicSubscriptionCard";
import { FcmSilentPushCard } from "@/features/fcm/components/FcmSilentPushCard";

const mockSend = jest.fn();
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockSilentPush = jest.fn();
let mockTokenPending = false;
let mockSubscribePending = false;

jest.mock("@/features/fcm/hooks", () => ({
  useSendToToken: () => ({ mutate: mockSend, isPending: mockTokenPending }),
  useSubscribeTopic: () => ({ mutate: mockSubscribe, isPending: mockSubscribePending }),
  useUnsubscribeTopic: () => ({ mutate: mockUnsubscribe, isPending: false }),
  useSendSilentPushToTopic: () => ({ mutate: mockSilentPush, isPending: false }),
  useSendSilentWakeup: () => ({ mutate: jest.fn(), isPending: false }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockTokenPending = false;
  mockSubscribePending = false;
});

test("등록 토큰 폼은 submit 동작으로 검증 후 발송하며 진행 중 입력과 발송을 잠근다", async () => {
  const view = render(<App><FcmTokenSendCard /></App>);
  await act(async () => { fireEvent.change(screen.getByLabelText("FCM 토큰 ID"), { target: { value: "12" } }); });
  await act(async () => { fireEvent.change(screen.getByLabelText("제목"), { target: { value: "테스트" } }); });
  await act(async () => { fireEvent.change(screen.getByLabelText("내용"), { target: { value: "본문" } }); });
  await act(async () => { fireEvent.submit(screen.getByLabelText("제목").closest("form")!); });
  await waitFor(() => expect(mockSend).toHaveBeenCalledWith({ fcmTokenId: 12, title: "테스트", body: "본문" }, expect.any(Object)));

  mockTokenPending = true;
  view.rerender(<App><FcmTokenSendCard /></App>);
  expect(screen.getByLabelText("제목")).toBeDisabled();
  expect(screen.getByRole("button", { name: /발송$/ })).toBeDisabled();
});

test("구독 중에는 반대 작업을 실행할 수 없고 비어 있는 값은 필드 오류로 남는다", async () => {
  const view = render(<App><FcmTopicSubscriptionCard /></App>);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "구독" })); });
  expect(await screen.findByText("토픽을 입력하세요.")).toBeInTheDocument();
  expect(mockSubscribe).not.toHaveBeenCalled();

  mockSubscribePending = true;
  view.rerender(<App><FcmTopicSubscriptionCard /></App>);
  expect(screen.getByRole("button", { name: "구독 해제" })).toBeDisabled();
  expect(screen.getByLabelText("토픽")).toBeDisabled();
  expect(mockUnsubscribe).not.toHaveBeenCalled();
});

test("Silent Push 항목 삭제는 이름을 가진 버튼이며 중복 key를 발송하지 않는다", async () => {
  render(<App><FcmSilentPushCard /></App>);
  await act(async () => { fireEvent.change(screen.getByLabelText("토픽"), { target: { value: "test-topic" } }); });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /data 항목 추가$/ })); });
  const removeButton = screen.getByRole("button", { name: "data 항목 2 삭제" });
  expect(removeButton).toBeEnabled();
  await act(async () => { fireEvent.click(removeButton); });
  expect(screen.queryByLabelText("data 항목 2 key")).not.toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /data 항목 추가$/ })); });
  for (const index of [1, 2]) {
    await act(async () => { fireEvent.change(screen.getByLabelText(`data 항목 ${index} key`), { target: { value: index === 1 ? "same" : " same " } }); });
    await act(async () => { fireEvent.change(screen.getByLabelText(`data 항목 ${index} value`), { target: { value: `value${index}` } }); });
  }
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "silent push 발송" })); });
  const confirmButton = await screen.findByRole("button", { name: "발송" });
  await act(async () => { fireEvent.click(confirmButton); });
  expect(await screen.findByText("data key는 중복 없이 입력하세요.")).toBeInTheDocument();
  expect(mockSilentPush).not.toHaveBeenCalled();
});
