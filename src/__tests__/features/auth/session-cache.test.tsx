import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AxiosError, isCancel, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import type { ReactNode } from "react";

import { AuthProvider, useAuth } from "@/features/auth/context";
import { refreshTokens, revokeSession } from "@/features/auth/api";
import { tokenStore } from "@/features/auth/store";
import { apiClient } from "@/lib/api/client";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock("@/features/auth/api", () => ({ refreshTokens: jest.fn(), revokeSession: jest.fn() }));
const originalAdapter = apiClient.defaults.adapter;

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000 } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}><AuthProvider>{children}</AuthProvider></QueryClientProvider>;
  const hook = renderHook(() => useAuth(), { wrapper });
  return { client, ...hook };
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

afterEach(() => { apiClient.defaults.adapter = originalAdapter; });

test.each([false, true])("로그아웃 철회 실패=%s에서도 이전 세션 캐시와 진행 중 조회를 정리한다", async (fails) => {
  tokenStore.setTokens({ accessToken: "old-access", refreshToken: "old-refresh" });
  let settleRevoke!: () => void;
  jest.mocked(revokeSession).mockImplementationOnce(() => new Promise((resolve, reject) => {
    settleRevoke = () => fails ? reject(new Error("network")) : resolve();
  }));
  const { client, result, unmount } = setup();
  client.setQueryData(["users", "list"], { account: "old-session" });
  client.getMutationCache().build(client, { mutationKey: ["private-account"] });
  let pendingSignal!: AbortSignal;
  let finishLookup!: (value: string) => void;
  const pendingLookup = client.query({
    queryKey: ["properties", "user", 1],
    queryFn: ({ signal }) => {
      pendingSignal = signal;
      return new Promise<string>((resolve) => { finishLookup = resolve; });
    },
  }).catch(() => undefined);
  let logout!: Promise<void>;

  try {
    act(() => { logout = result.current.logout(); });
    expect(revokeSession).toHaveBeenCalledWith({ accessToken: "old-access", refreshToken: "old-refresh" });
    expect(tokenStore.getAccessToken()).toBe("old-access");
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoggingOut).toBe(true);
    expect(pendingSignal.aborted).toBe(false);

    await act(async () => { settleRevoke(); await logout; });
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(tokenStore.getRefreshToken()).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoggingOut).toBe(false);
    expect(mockReplace).toHaveBeenCalledWith("/login");
    expect(pendingSignal.aborted).toBe(true);
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(client.getMutationCache().getAll()).toHaveLength(0);

    await act(async () => { finishLookup("old-session-response"); await pendingLookup; });
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    act(() => result.current.completeLogin({ accessToken: "new-access", refreshToken: "new-refresh" }));
    expect(result.current.isAuthenticated).toBe(true);
    expect(tokenStore.getAccessToken()).toBe("new-access");
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  } finally {
    unmount();
    client.clear();
  }
});

test("로그아웃 연속 호출은 렌더 전에도 한 철회 요청과 같은 완료 Promise를 공유한다", async () => {
  tokenStore.setTokens({ accessToken: "old-access", refreshToken: "old-refresh" });
  let finishRevoke!: () => void;
  jest.mocked(revokeSession).mockImplementationOnce(() => new Promise((resolve) => { finishRevoke = resolve; }));
  const { client, result, unmount } = setup();
  let first!: Promise<void>;
  let second!: Promise<void>;
  try {
    act(() => { first = result.current.logout(); second = result.current.logout(); });
    expect(first).toBe(second);
    expect(revokeSession).toHaveBeenCalledTimes(1);
    expect(result.current.isLoggingOut).toBe(true);
    await act(async () => { finishRevoke(); await first; });
    expect(result.current.isLoggingOut).toBe(false);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  } finally {
    unmount();
    client.clear();
  }
});

test.each([false, true])("이전 로그아웃 완료 실패=%s는 새 로그인 세션과 캐시를 정리하지 않는다", async (fails) => {
  tokenStore.setTokens({ accessToken: "old-access", refreshToken: "old-refresh" });
  let finishRevoke!: () => void;
  jest.mocked(revokeSession).mockImplementationOnce(() => new Promise((resolve, reject) => {
    finishRevoke = () => fails ? reject(new Error("old revoke failed")) : resolve();
  }));
  const { client, result, unmount } = setup();
  let pending!: Promise<void>;
  try {
    act(() => { pending = result.current.logout(); });
    act(() => result.current.completeLogin({ accessToken: "new-access", refreshToken: "new-refresh" }));
    client.setQueryData(["users", "new-session"], "new account");
    await act(async () => { finishRevoke(); await pending; });
    expect(tokenStore.getAccessToken()).toBe("new-access");
    expect(tokenStore.getRefreshToken()).toBe("new-refresh");
    expect(client.getQueryData(["users", "new-session"])).toBe("new account");
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoggingOut).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
  } finally {
    unmount();
    client.clear();
  }
});

test("새 로그인은 남아 있던 조회·mutation 캐시를 제거하고 새 토큰을 적용한다", () => {
  const { client, result, unmount } = setup();
  client.setQueryData(["users", "list"], { account: "previous-session" });
  client.getMutationCache().build(client, { mutationKey: ["private-account"] });

  try {
    act(() => result.current.completeLogin({ accessToken: "new-access", refreshToken: "new-refresh" }));
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(client.getMutationCache().getAll()).toHaveLength(0);
    expect(tokenStore.getAccessToken()).toBe("new-access");
    expect(result.current.isAuthenticated).toBe(true);
  } finally {
    unmount();
    client.clear();
  }
});

test("저장된 토큰이 없어도 로그아웃은 캐시를 비우고 로그인 화면으로 이동한다", async () => {
  const { client, result, unmount } = setup();
  client.setQueryData(["users", "list"], { account: "expired-session" });

  try {
    await act(() => result.current.logout());
    expect(revokeSession).not.toHaveBeenCalled();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockReplace).toHaveBeenCalledWith("/login");
  } finally {
    unmount();
    client.clear();
  }
});

test.each([
  ["logout", false], ["logout", true], ["login", false], ["login", true],
] as const)("Provider의 %s 뒤 옛 갱신 실패=%s는 세션을 복원하거나 새 토큰을 지우지 않는다", async (transition, fails) => {
  tokenStore.setTokens({ accessToken: "old-access", refreshToken: "old-refresh" });
  jest.mocked(revokeSession).mockResolvedValue(undefined);
  let signalStarted!: () => void;
  const started = new Promise<void>((resolve) => { signalStarted = resolve; });
  let finishRefresh!: () => void;
  jest.mocked(refreshTokens).mockImplementationOnce(() => new Promise((resolve, reject) => {
    finishRefresh = () => fails ? reject(new Error("old refresh failed")) : resolve({ accessToken: "old-fresh", refreshToken: "old-rotated" });
    signalStarted();
  }));
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
    const response: AxiosResponse = { config, status: 401, statusText: "401", headers: {}, data: {} };
    throw new AxiosError("unauthorized", "ERR_BAD_REQUEST", config, undefined, response);
  });
  apiClient.defaults.adapter = adapter;
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  const { client, result, unmount } = setup();
  client.setQueryData(["users", "list"], { account: "old-session" });
  const request = apiClient.get("/v1/admin/users").catch((error: unknown) => error);

  try {
    await started;
    if (transition === "logout") await act(() => result.current.logout());
    else act(() => result.current.completeLogin({ accessToken: "new-access", refreshToken: "new-refresh" }));
    finishRefresh();
    expect(isCancel(await request)).toBe(true);
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthenticated).toBe(transition === "login");
    expect(tokenStore.getAccessToken()).toBe(transition === "logout" ? null : "new-access");
    expect(tokenStore.getRefreshToken()).toBe(transition === "logout" ? null : "new-refresh");
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    expect(consoleError).not.toHaveBeenCalled();
    expect(mockReplace.mock.calls).toEqual(transition === "logout" ? [["/login"]] : []);
  } finally {
    consoleError.mockRestore();
    unmount();
    client.clear();
  }
});
