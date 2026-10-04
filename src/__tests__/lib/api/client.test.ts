import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

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
