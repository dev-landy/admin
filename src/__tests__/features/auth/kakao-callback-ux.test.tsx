import "@/test-utils/antd";
import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { KakaoCallback } from "@/features/auth/kakao-callback";

const mockReplace = jest.fn();
const mockCompleteLogin = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock("@/features/auth/context", () => ({ useAuth: () => ({ completeLogin: mockCompleteLogin }) }));

const originalFetch = global.fetch;
const tokens = { accessToken: "access", refreshToken: "refresh" };
const response = { ok: true, json: async () => tokens } as Response;

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
  jest.useRealTimers();
});

test("StrictMode에서도 인가 코드를 한 번만 교환하고 성공한 세션으로 이동한다", async () => {
  const fetchMock = jest.fn().mockResolvedValue(response);
  global.fetch = fetchMock;
  render(<StrictMode><KakaoCallback code="single-use-code" state="state" /></StrictMode>);
  await waitFor(() => expect(mockCompleteLogin).toHaveBeenCalledWith(tokens));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith("/");
});

test("30초가 지나면 새 로그인으로 복구하며 같은 코드를 재교환하거나 늦은 세션을 적용하지 않는다", async () => {
  jest.useFakeTimers();
  let resolveRequest!: (value: Response) => void;
  const fetchMock = jest.fn().mockImplementation(() => new Promise<Response>((resolve) => { resolveRequest = resolve; }));
  global.fetch = fetchMock;
  render(<KakaoCallback code="single-use-code" state="state" />);
  const signal = (fetchMock.mock.calls[0][1] as RequestInit).signal!;
  act(() => jest.advanceTimersByTime(29_999));
  expect(signal.aborted).toBe(false);
  act(() => jest.advanceTimersByTime(1));
  expect(signal.aborted).toBe(true);
  expect(screen.getByText(/로그인 응답이 지연되고 있습니다/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "로그인으로 돌아가기" }));
  expect(mockReplace).toHaveBeenCalledWith("/login");
  await act(async () => { resolveRequest(response); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(mockCompleteLogin).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledTimes(1);
});

test("callback에서 떠난 뒤 완료된 교환은 로그인 세션과 현재 화면을 바꾸지 않는다", async () => {
  let resolveRequest!: (value: Response) => void;
  global.fetch = jest.fn().mockImplementation(() => new Promise<Response>((resolve) => { resolveRequest = resolve; }));
  const view = render(<KakaoCallback code="single-use-code" state="state" />);
  view.unmount();
  await act(async () => { resolveRequest(response); });
  expect(mockCompleteLogin).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});

test("같은 callback에서 code와 state가 바뀌면 새 로그인으로 복구하고 이전 교환 완료와 타임아웃은 무시한다", async () => {
  jest.useFakeTimers();
  let resolveRequest!: (value: Response) => void;
  const fetchMock = jest.fn().mockImplementation(() => new Promise<Response>((resolve) => { resolveRequest = resolve; }));
  global.fetch = fetchMock;
  const view = render(<StrictMode><KakaoCallback code="old-code" state="old-state" /></StrictMode>);
  view.rerender(<StrictMode><KakaoCallback code="new-code" state="new-state" /></StrictMode>);
  expect(screen.getByText(/로그인 요청이 변경되었습니다/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "로그인으로 돌아가기" }));
  expect(mockReplace).toHaveBeenCalledWith("/login");
  act(() => jest.advanceTimersByTime(30_000));
  expect(screen.queryByText(/로그인 응답이 지연되고 있습니다/)).not.toBeInTheDocument();
  await act(async () => { resolveRequest(response); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(mockCompleteLogin).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledTimes(1);
});

test("callback 오류로 바뀌거나 이전 params로 돌아와도 이전 교환이 결과 소유권을 되찾지 않는다", async () => {
  let resolveRequest!: (value: Response) => void;
  const fetchMock = jest.fn().mockImplementation(() => new Promise<Response>((resolve) => { resolveRequest = resolve; }));
  global.fetch = fetchMock;
  const view = render(<KakaoCallback code="old-code" state="old-state" />);
  view.rerender(<KakaoCallback code="old-code" state="old-state" error="access_denied" />);
  expect(screen.getByText("카카오 로그인이 취소되었습니다.")).toBeVisible();
  view.rerender(<KakaoCallback code="old-code" state="old-state" />);
  expect(screen.getByText(/로그인 요청이 변경되었습니다/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "로그인으로 돌아가기" }));
  expect(mockReplace).toHaveBeenCalledWith("/login");
  await act(async () => { resolveRequest(response); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(mockCompleteLogin).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledTimes(1);
});
