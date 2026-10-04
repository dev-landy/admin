import axios, { AxiosError, AxiosHeaders, CanceledError, type InternalAxiosRequestConfig } from "axios";
import { QueryClient } from "@tanstack/react-query";

import { getQueryClient } from "@/lib/query/get-query-client";

let client: QueryClient;

function httpFailure(config: InternalAxiosRequestConfig, status: number, retryAfter?: string) {
  return new AxiosError("request failed", "ERR_BAD_RESPONSE", config, undefined, {
    config, status, statusText: String(status), data: {},
    headers: new AxiosHeaders(retryAfter ? { "Retry-After": retryAfter } : {}),
  });
}

function lookup(failure: (config: InternalAxiosRequestConfig) => Error, alwaysFails = false) {
  let attempts = 0;
  const adapter = jest.fn(async (config: InternalAxiosRequestConfig) => {
    attempts += 1;
    if (attempts === 1 || alwaysFails) throw failure(config);
    return { config, status: 200, statusText: "OK", data: "ready", headers: new AxiosHeaders() };
  });
  const http = axios.create({ adapter });
  const result = client.query({
    queryKey: ["policy", "request"],
    queryFn: async () => (await http.get<string>("/v1/admin/users")).data,
  });
  return { adapter, result };
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-04T00:00:00Z"));
  client = new QueryClient({ defaultOptions: getQueryClient().getDefaultOptions() });
});

afterEach(() => {
  client.clear();
  jest.useRealTimers();
});

test.each([400, 401, 403, 404, 409, 422, 501, 505])("확정 HTTP %i는 Query의 추가 요청 없이 오류를 보여준다", async (status) => {
  const { adapter, result } = lookup((config) => httpFailure(config, status));
  await expect(result).rejects.toMatchObject({ response: { status } });
  expect(adapter).toHaveBeenCalledTimes(1);
});

test("취소된 Axios 요청은 자동 재시도하지 않는다", async () => {
  const { adapter, result } = lookup(() => new CanceledError("canceled"));
  await expect(result).rejects.toMatchObject({ code: "ERR_CANCELED" });
  expect(adapter).toHaveBeenCalledTimes(1);
});

test.each([408, 429, 500, 502, 503, 504])("일시적인 HTTP %i는 1초 뒤 한 번 더 조회해 복구한다", async (status) => {
  const { adapter, result } = lookup((config) => httpFailure(config, status));
  await jest.advanceTimersByTimeAsync(999);
  expect(adapter).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(1);
  await expect(result).resolves.toBe("ready");
  expect(adapter).toHaveBeenCalledTimes(2);
});

test.each(["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"])("%s 네트워크 실패를 한 번 더 조회한다", async (code) => {
  const { adapter, result } = lookup((config) => new AxiosError("network", code, config));
  await jest.advanceTimersByTimeAsync(1_000);
  await expect(result).resolves.toBe("ready");
  expect(adapter).toHaveBeenCalledTimes(2);
});

test("계속 실패하는 조회는 최대 한 번만 재시도한다", async () => {
  const { adapter, result } = lookup((config) => httpFailure(config, 503), true);
  const rejected = expect(result).rejects.toMatchObject({ response: { status: 503 } });
  await jest.advanceTimersByTimeAsync(10_000);
  await rejected;
  expect(adapter).toHaveBeenCalledTimes(2);
});

test.each(["5", "Sun, 04 Oct 2026 00:00:05 GMT"])("Retry-After %s의 서버 대기 시간을 지킨다", async (retryAfter) => {
  const { adapter, result } = lookup((config) => httpFailure(config, 503, retryAfter));
  await jest.advanceTimersByTimeAsync(4_999);
  expect(adapter).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(1);
  await expect(result).resolves.toBe("ready");
  expect(adapter).toHaveBeenCalledTimes(2);
});

test.each(["31", "Sun, 04 Oct 2026 00:00:31 GMT"])("긴 Retry-After %s는 조기 재요청 없이 수동 재조회로 넘긴다", async (retryAfter) => {
  const { adapter, result } = lookup((config) => httpFailure(config, 429, retryAfter));
  await expect(result).rejects.toMatchObject({ response: { status: 429 } });
  await jest.advanceTimersByTimeAsync(30_000);
  expect(adapter).toHaveBeenCalledTimes(1);
});

test.each(["invalid", "-1", "1.5"])("잘못된 Retry-After %s는 기본 지연으로 처리한다", async (retryAfter) => {
  const { adapter, result } = lookup((config) => httpFailure(config, 503, retryAfter));
  await jest.advanceTimersByTimeAsync(1_000);
  await expect(result).resolves.toBe("ready");
  expect(adapter).toHaveBeenCalledTimes(2);
});

test("조회 코드 자체의 오류는 같은 실행을 반복하지 않는다", async () => {
  const { adapter, result } = lookup(() => new Error("invalid query implementation"));
  await expect(result).rejects.toThrow("invalid query implementation");
  expect(adapter).toHaveBeenCalledTimes(1);
});
