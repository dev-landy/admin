import { AxiosError, isCancel, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

import { tokenStore } from "@/features/auth/store";
import { refreshTokens } from "@/features/auth/api";
import { apiClient } from "@/lib/api/client";

jest.mock("@/features/auth/api", () => ({ refreshTokens: jest.fn() }));

const originalAdapter = apiClient.defaults.adapter;
const mockRefresh = jest.mocked(refreshTokens);

function response(config: InternalAxiosRequestConfig, status: number): AxiosResponse {
  return { config, status, statusText: String(status), headers: {}, data: { url: config.url } };
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  tokenStore.setTokens({ accessToken: "expired", refreshToken: "refresh" });
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  localStorage.clear();
});

test("동시 401 요청은 한 번 갱신하고 최신 Authorization으로 각각 재전송한다", async () => {
  const sent: { url: string | undefined; token: unknown }[] = [];
  apiClient.defaults.adapter = async (config) => {
    const token = config.headers.get("Authorization");
    sent.push({ url: config.url, token });
    if (token === "Bearer expired") {
      throw new AxiosError("unauthorized", "ERR_BAD_REQUEST", config, undefined, response(config, 401));
    }
    return response(config, 200);
  };
  mockRefresh.mockResolvedValue({ accessToken: "fresh", refreshToken: "rotated" });

  const results = await Promise.all([apiClient.get("/v1/admin/users"), apiClient.get("/v1/admin/tenants")]);

  expect(mockRefresh).toHaveBeenCalledTimes(1);
  expect(mockRefresh).toHaveBeenCalledWith("refresh");
  expect(results.map((result) => result.status)).toEqual([200, 200]);
  expect(sent.filter((request) => request.token === "Bearer fresh").map((request) => request.url).sort())
    .toEqual(["/v1/admin/tenants", "/v1/admin/users"]);
  expect(tokenStore.getRefreshToken()).toBe("rotated");
});

test("갱신 후에도 401인 요청은 재시도 표식을 유지하고 갱신 루프를 만들지 않는다", async () => {
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
    throw new AxiosError("unauthorized", "ERR_BAD_REQUEST", config, undefined, response(config, 401));
  });
  apiClient.defaults.adapter = adapter;
  mockRefresh.mockResolvedValue({ accessToken: "fresh", refreshToken: "rotated" });
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

  try {
    await expect(apiClient.get("/v1/admin/users")).rejects.toMatchObject({ response: { status: 401 } });
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(adapter.mock.calls[1][0].headers.get("Authorization")).toBe("Bearer fresh");
  } finally {
    consoleError.mockRestore();
  }
});

test.each([
  ["logout", false], ["logout", true], ["login", false], ["login", true],
] as const)("%s 이후 옛 세션 갱신 실패=%s는 토큰·새 세션·화면 이동을 변경하지 않는다", async (transition, fails) => {
  let finishRefresh!: () => void;
  let startedRefresh!: () => void;
  const refreshStarted = new Promise<void>((resolve) => { startedRefresh = resolve; });
  mockRefresh.mockImplementationOnce(() => new Promise((resolve, reject) => {
    finishRefresh = () => fails ? reject(new Error("old refresh failed")) : resolve({ accessToken: "old-fresh", refreshToken: "old-rotated" });
    startedRefresh();
  }));
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
    if (config.headers.get("Authorization") === "Bearer expired") {
      throw new AxiosError("unauthorized", "ERR_BAD_REQUEST", config, undefined, response(config, 401));
    }
    return response(config, 200);
  });
  apiClient.defaults.adapter = adapter;
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  const requests = [apiClient.get("/v1/admin/users"), apiClient.get("/v1/admin/tenants")].map((request) => request.catch((error: unknown) => error));

  try {
    await refreshStarted;
    await Promise.resolve();
    if (transition === "logout") tokenStore.clearTokens();
    else tokenStore.setTokens({ accessToken: "new-access", refreshToken: "new-refresh" });
    finishRefresh();
    const errors = await Promise.all(requests);
    expect(errors.every(isCancel)).toBe(true);
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(tokenStore.getAccessToken()).toBe(transition === "logout" ? null : "new-access");
    expect(tokenStore.getRefreshToken()).toBe(transition === "logout" ? null : "new-refresh");
    expect(consoleError).not.toHaveBeenCalled();
  } finally {
    consoleError.mockRestore();
  }
});

test("갱신 대기열에서 재전송한 401도 추가 갱신 없이 한 번만 재시도한다", async () => {
  const counts = new Map<string, number>();
  apiClient.defaults.adapter = async (config) => {
    const url = config.url!;
    const count = (counts.get(url) ?? 0) + 1;
    counts.set(url, count);
    if (count <= 2) throw new AxiosError("unauthorized", "ERR_BAD_REQUEST", config, undefined, response(config, 401));
    return response(config, 200);
  };
  mockRefresh.mockResolvedValue({ accessToken: "fresh", refreshToken: "rotated" });
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

  try {
    const results = await Promise.allSettled([apiClient.get("/v1/admin/users"), apiClient.get("/v1/admin/tenants")]);
    expect(results.map((result) => result.status)).toEqual(["rejected", "rejected"]);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect([...counts.values()]).toEqual([2, 2]);
  } finally {
    consoleError.mockRestore();
  }
});

test("새 세션의 갱신은 옛 갱신과 대기열을 공유하지 않는다", async () => {
  let startOld!: () => void;
  let startNew!: () => void;
  const oldStarted = new Promise<void>((resolve) => { startOld = resolve; });
  const newStarted = new Promise<void>((resolve) => { startNew = resolve; });
  let failOld!: () => void;
  let finishNew!: () => void;
  mockRefresh.mockImplementationOnce(() => new Promise((_resolve, reject) => {
    failOld = () => reject(new Error("old refresh failed"));
    startOld();
  })).mockImplementationOnce(() => new Promise((resolve) => {
    finishNew = () => resolve({ accessToken: "new-fresh", refreshToken: "new-rotated" });
    startNew();
  }));
  apiClient.defaults.adapter = async (config) => {
    if (config.headers.get("Authorization") !== "Bearer new-fresh") {
      throw new AxiosError("unauthorized", "ERR_BAD_REQUEST", config, undefined, response(config, 401));
    }
    return response(config, 200);
  };
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  const oldRequest = apiClient.get("/v1/admin/users").catch((error: unknown) => error);

  try {
    await oldStarted;
    tokenStore.setTokens({ accessToken: "new-expired", refreshToken: "new-refresh" });
    const requests = [apiClient.get("/v1/admin/tenants"), apiClient.get("/v1/admin/properties")];
    await newStarted;
    await Promise.resolve();
    failOld();
    expect(isCancel(await oldRequest)).toBe(true);
    expect(tokenStore.getRefreshToken()).toBe("new-refresh");
    finishNew();
    expect((await Promise.all(requests)).map((result) => result.status)).toEqual([200, 200]);
    expect(mockRefresh).toHaveBeenCalledTimes(2);
    expect(tokenStore.getRefreshToken()).toBe("new-rotated");
    expect(consoleError).not.toHaveBeenCalled();
  } finally {
    consoleError.mockRestore();
  }
});
