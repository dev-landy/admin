import "@/test-utils/antd";

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FcmPage from "@/app/(admin)/fcm/page";

import { FcmTopicSubscriptionCard } from "@/features/fcm/components/FcmTopicSubscriptionCard";
import { FcmSilentPushCard } from "@/features/fcm/components/FcmSilentPushCard";

const mockSend = jest.fn();
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockSilentPush = jest.fn();
let mockTokenPending = false;
let mockSubscribePending = false;
const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearch = "";
const mockFetchTokens = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }), useSearchParams: () => new URLSearchParams(mockSearch) }));
jest.mock("@/features/users/api", () => ({ fetchUserFcmTokens: (id: number, params: unknown) => mockFetchTokens(id, params),  fetchUser: jest.fn(async (userId: number) => ({ userId, email: `user${userId}@example.com` })), fetchUsers: jest.fn(async (params: { keyword?: string; userId?: number }) => ({ users: params.keyword === "77" || params.userId === 77 ? [{ userId: 77, email: "user77@example.com", phone: "010-****-1234" }] : [] })) }));

function renderFcmPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { ...render(<QueryClientProvider client={client}><ConfigProvider theme={{ token: { motion: false } }}><App><FcmPage /></App></ConfigProvider></QueryClientProvider>), client };
}

jest.mock("@/features/fcm/hooks", () => ({
  useSendToToken: () => ({ mutate: mockSend, mutateAsync: mockSend, isPending: mockTokenPending }),
  useSubscribeTopic: () => ({ mutate: mockSubscribe, isPending: mockSubscribePending }),
  useUnsubscribeTopic: () => ({ mutate: mockUnsubscribe, isPending: false }),
  useSendSilentPushToTopic: () => ({ mutate: mockSilentPush, isPending: false }),
  useSendSilentWakeup: () => ({ mutate: jest.fn(), isPending: false }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockReplace.mockReset();
  mockTokenPending = false;
  mockSearch = "";
  mockSend.mockReset();
  mockFetchTokens.mockReset().mockImplementation(async (id: number, params: { fcmTokenId?: number }) => ({ fcmTokens: params.fcmTokenId !== undefined && params.fcmTokenId !== 12 ? [] : [{ fcmTokenId: 12, userId: id, platform: "ANDROID", value: "masked***token", silentWakeupSubscribed: false, createdAt: "2026-10-01T09:00:00", updatedAt: "2026-10-04T09:00:00" }], page: 0, size: 20, totalElements: params.fcmTokenId !== undefined && params.fcmTokenId !== 12 ? 0 : 1 }));
  mockSubscribePending = false;
});

test("FCM 작업 탭은 해당 작업만 노출하고 이동 후 작성하던 테스트 내용을 보존한다", async () => {
  renderFcmPage();
  expect(screen.getByRole("combobox", { name: "유저" })).toBeEnabled();
  expect(screen.getByRole("combobox", { name: "등록 기기" })).toBeDisabled();
  expect(mockFetchTokens).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("제목"), { target: { value: "작성 중 테스트" } });
  expect(screen.queryByRole("button", { name: "구독" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "토픽 구독" }));
  expect(screen.getByRole("button", { name: "구독" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "발송" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "백그라운드 푸시" }));
  expect(screen.getByRole("button", { name: "silent push 발송" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "기기 테스트" }));
  await waitFor(() => expect(screen.getByLabelText("제목")).toHaveValue("작성 중 테스트"));
  expect(screen.queryByText("토픽 발송")).not.toBeInTheDocument();
  expect(mockSend).not.toHaveBeenCalled(); expect(mockSubscribe).not.toHaveBeenCalled(); expect(mockSilentPush).not.toHaveBeenCalled();
});

async function chooseUser() {
  const user = screen.getByRole("combobox", { name: "유저" });
  fireEvent.mouseDown(user); fireEvent.change(user, { target: { value: "77" } });
  fireEvent.click(await screen.findByText("user77@example.com · 010-****-1234 · #77", { selector: ".ant-select-item-option-content" }));
  await waitFor(() => expect(mockFetchTokens).toHaveBeenCalledWith(77, expect.objectContaining({ page: 1, size: 20 })));
}
async function chooseDevice() {
  await waitFor(() => expect(screen.getByRole("combobox", { name: "등록 기기" })).toBeEnabled());
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "등록 기기" }));
  fireEvent.click(await screen.findByText(/Android · 토큰 #12 · 최근/, { selector: ".ant-select-item-option-content" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "발송 내용 확인" })).toBeEnabled());
}

test("FCM 유저 검색 후 같은 화면에서 등록 기기를 선택하며 메시지 초안과 대상 URL을 보존한다", async () => {
  renderFcmPage();
  fireEvent.change(screen.getByLabelText("제목"), { target: { value: "대상 선택 전 초안" } });
  await chooseUser(); await chooseDevice();
  expect(screen.getByText("기기 토큰 masked***token")).toBeVisible();
  expect(screen.getByLabelText("제목")).toHaveValue("대상 선택 전 초안");
  expect(mockPush).not.toHaveBeenCalled();
  const target = new URL(mockReplace.mock.calls.at(-1)[0], "https://admin.test");
  expect(target.pathname).toBe("/fcm");
  expect(target.searchParams.get("userId")).toBe("77");
  expect(target.searchParams.get("fcmTokenId")).toBe("12");
  expect(mockSend).not.toHaveBeenCalled();
});

test("검증된 기기·내용을 확인한 뒤 한 번 발송하고 요청 중 취소를 잠그며 실패하면 초안을 재시도한다", async () => {
  let reject!: (error: Error) => void;
  const request = new Promise<never>((_, fail) => { reject = fail; });
  mockSend.mockReturnValueOnce(request).mockResolvedValueOnce({ messageId: "mock-message" });
  renderFcmPage();
  await chooseUser(); await chooseDevice();
  await act(async () => { fireEvent.submit(screen.getByLabelText("제목").closest("form")!); });
  expect(await screen.findByText("제목을 입력하세요.")).toBeVisible();
  expect(mockSend).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("제목"), { target: { value: "테스트" } });
  fireEvent.change(screen.getByLabelText("내용"), { target: { value: "본문" } });
  await act(async () => { fireEvent.submit(screen.getByLabelText("제목").closest("form")!); });
  const dialog = await screen.findByRole("dialog", { name: "선택한 등록 기기로 발송할까요?" });
  await waitFor(() => expect(dialog).toBeVisible());
  expect(within(dialog).getByText("유저 #77 · Android · 토큰 #12")).toBeVisible();
  expect(mockSend).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "발송" }));
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "취소" })).toBeDisabled());
  expect(screen.getByLabelText("제목")).toBeDisabled();
  fireEvent.keyDown(dialog, { key: "Escape", code: "Escape", keyCode: 27 });
  fireEvent.click(within(dialog).getByRole("button", { name: "발송" }));
  expect(mockSend).toHaveBeenCalledTimes(1);
  expect(mockSend).toHaveBeenCalledWith({ fcmTokenId: 12, title: "테스트", body: "본문" });
  await act(async () => { reject(new Error("network")); await request.catch(() => undefined); });
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "발송" })).toBeEnabled());
  expect(screen.getByLabelText("제목")).toHaveValue("테스트");
  await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "발송" })); });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(mockSend).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText("제목")).toHaveValue("");
});

test("URL의 토큰 ID도 선택한 유저의 등록 목록에서 확인하고 미등록 ID는 발송하지 않는다", async () => {
  mockSearch = "userId=77&fcmTokenId=999&returnTo=%2Fusers%2F77";
  renderFcmPage();
  expect(await screen.findByText("선택한 유저에게 등록된 토큰 ID가 아닙니다.")).toBeVisible();
  expect(screen.getByRole("button", { name: "발송 내용 확인" })).toBeDisabled();
  expect(mockFetchTokens).toHaveBeenCalledWith(77, { fcmTokenId: 999, page: 1, size: 20 });
  fireEvent.change(screen.getByLabelText("제목"), { target: { value: "보존할 초안" } });
  fireEvent.click(screen.getByText(/^토큰 ID 직접 조회 (펼치기|접기)$/, { selector: "summary" }));
  await waitFor(() => expect(screen.getByLabelText("FCM 토큰 ID")).toBeVisible());
  fireEvent.change(screen.getByLabelText("FCM 토큰 ID"), { target: { value: "12" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "이 유저의 토큰 확인" })); });
  await waitFor(() => expect(screen.getByRole("button", { name: "발송 내용 확인" })).toBeEnabled());
  expect(screen.getByLabelText("제목")).toHaveValue("보존할 초안");
  const target = new URL(mockReplace.mock.calls.at(-1)[0], "https://admin.test");
  expect(target.searchParams.get("returnTo")).toBe("/users/77");
  expect(target.searchParams.get("fcmTokenId")).toBe("12");
  expect(mockSend).not.toHaveBeenCalled();
});

test("URL의 단일 토큰 조회 범위를 표시하고 전체 기기로 바로 전환해도 초안을 보존한다", async () => {
  mockSearch = "userId=77&fcmTokenId=12&returnTo=%2Fusers%2F77";
  renderFcmPage();
  await waitFor(() => expect(screen.getByRole("button", { name: "발송 내용 확인" })).toBeEnabled());
  expect(screen.getByText("토큰 #12만 조회 중")).toBeVisible();
  const showAll = screen.getByRole("button", { name: "전체 등록 기기 보기" });
  expect(showAll).toBeVisible();
  fireEvent.change(screen.getByLabelText("제목"), { target: { value: "다른 기기로 보낼 초안" } });
  fireEvent.click(showAll);
  await waitFor(() => expect(mockFetchTokens).toHaveBeenLastCalledWith(77, { fcmTokenId: undefined, page: 1, size: 20 }));
  expect(screen.queryByText("토큰 #12만 조회 중")).not.toBeInTheDocument();
  expect(screen.getByLabelText("제목")).toHaveValue("다른 기기로 보낼 초안");
  expect(screen.getByRole("button", { name: "발송 내용 확인" })).toBeDisabled();
  const url = new URL(mockReplace.mock.calls.at(-1)[0], "https://admin.test");
  expect(url.searchParams.get("userId")).toBe("77");
  expect(url.searchParams.has("fcmTokenId")).toBe(false);
  expect(url.searchParams.get("returnTo")).toBe("/users/77");
  expect(mockSend).not.toHaveBeenCalled();
});

test("등록 기기 다음 페이지를 조회하고 URL을 갱신해도 선택 범위와 메시지 초안을 유지한다", async () => {
  mockSearch = "userId=77";
  mockFetchTokens.mockImplementation(async (id: number, params: { page: number }) => ({
    fcmTokens: [{ fcmTokenId: params.page === 2 ? 32 : 12, userId: id, platform: "IOS", value: "masked***token", silentWakeupSubscribed: false, createdAt: "2026-10-01", updatedAt: "2026-10-04" }],
    page: params.page - 1, size: 20, totalElements: 21,
  }));
  mockReplace.mockImplementation((url: string) => { mockSearch = new URL(url, "https://admin.test").search; });
  const view = renderFcmPage();
  fireEvent.change(screen.getByLabelText("제목"), { target: { value: "두 번째 기기 초안" } });
  const next = await screen.findByRole("button", { name: "등록 기기 다음 페이지" });
  fireEvent.click(next);
  await waitFor(() => expect(mockFetchTokens).toHaveBeenLastCalledWith(77, expect.objectContaining({ page: 2 })));
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "등록 기기" }));
  fireEvent.click(await screen.findByText(/iOS · 토큰 #32 · 최근/, { selector: ".ant-select-item-option-content" }));
  // Simulate Next applying the URL written by the target selection.
  view.rerender(<QueryClientProvider client={view.client}><ConfigProvider theme={{ token: { motion: false } }}><App><FcmPage /></App></ConfigProvider></QueryClientProvider>);
  await waitFor(() => expect(screen.getByRole("button", { name: "발송 내용 확인" })).toBeEnabled());
  expect(mockFetchTokens).toHaveBeenLastCalledWith(77, expect.objectContaining({ page: 2 }));
  expect(screen.getByLabelText("제목")).toHaveValue("두 번째 기기 초안");
  expect(new URL(mockReplace.mock.calls.at(-1)[0], "https://admin.test").searchParams.get("fcmTokenId")).toBe("32");
  expect(mockSend).not.toHaveBeenCalled();
});

test("구독 중에는 반대 작업을 실행할 수 없고 비어 있는 값은 필드 오류로 남는다", async () => {
  const view = render(<App><FcmTopicSubscriptionCard /></App>);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "구독" })); });
  expect(await screen.findByText("토픽을 입력하세요.")).toBeInTheDocument();
  expect(mockSubscribe).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.change(screen.getByLabelText("토픽"), { target: { value: " alerts " } });
    fireEvent.change(screen.getByLabelText("토큰 목록 (줄 단위)"), { target: { value: " token-a \n\n token-b " } });
    fireEvent.click(screen.getByRole("button", { name: "구독" }));
  });
  await waitFor(() => expect(mockSubscribe).toHaveBeenCalledWith(
    { topic: "alerts", tokens: ["token-a", "token-b"] },
    expect.any(Object),
  ));
  mockSubscribePending = true;
  view.rerender(<App><FcmTopicSubscriptionCard /></App>);
  expect(screen.getByRole("button", { name: "구독 해제" })).toBeDisabled();
  expect(screen.getByLabelText("토픽")).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "구독 해제" }));
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
