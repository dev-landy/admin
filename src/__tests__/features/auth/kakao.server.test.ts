/** @jest-environment node */
import { exchangeKakaoCode } from "@/features/auth/kakao.server";

describe("exchangeKakaoCode", () => {
  const realFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.KAKAO_REST_API_KEY = "rest-key";
    process.env.KAKAO_REDIRECT_URI = "http://localhost:3000/auth/kakao/callback";
    delete process.env.KAKAO_CLIENT_SECRET;
  });

  afterEach(() => {
    global.fetch = realFetch;
    process.env = { ...originalEnv };
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  function mockFetch(impl: jest.Mock) {
    global.fetch = impl as unknown as typeof fetch;
    return impl;
  }

  test("posts the form body and returns the access token", async () => {
    const fetchMock = mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token_type: "bearer", access_token: "kakao-at", expires_in: 3600 }),
      }),
    );

    const token = await exchangeKakaoCode("auth-code");

    expect(token).toBe("kakao-at");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://kauth.kakao.com/oauth/token");
    const body = new URLSearchParams(init.body as string);
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("client_id")).toBe("rest-key");
    expect(body.get("redirect_uri")).toBe("http://localhost:3000/auth/kakao/callback");
    expect(body.get("code")).toBe("auth-code");
    expect(body.get("client_secret")).toBeNull();
  });

  test("includes client_secret only when configured", async () => {
    process.env.KAKAO_CLIENT_SECRET = "secret";
    const fetchMock = mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token_type: "bearer", access_token: "x", expires_in: 1 }),
      }),
    );

    await exchangeKakaoCode("c");

    const body = new URLSearchParams((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.get("client_secret")).toBe("secret");
  });

  test("throws on a non-200 response", async () => {
    mockFetch(jest.fn().mockResolvedValue({ ok: false, status: 401, text: async () => "invalid_grant" }));
    await expect(exchangeKakaoCode("c")).rejects.toThrow(/Kakao token exchange failed \(401\)/);
  });

  test("throws when access_token is absent", async () => {
    mockFetch(jest.fn().mockResolvedValue({ ok: true, json: async () => ({ token_type: "bearer", expires_in: 1 }) }));
    await expect(exchangeKakaoCode("c")).rejects.toThrow(/no access_token/);
  });

  test("카카오가 응답하지 않으면 10초 후 실제 upstream 요청을 중단한다", async () => {
    jest.useFakeTimers();
    let signal: AbortSignal | undefined;
    mockFetch(jest.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      signal = init.signal as AbortSignal;
      signal.addEventListener("abort", () => reject(new Error("request aborted")), { once: true });
    })));
    const request = exchangeKakaoCode("single-use-code");
    const rejected = expect(request).rejects.toThrow("request aborted");
    jest.advanceTimersByTime(9_999);
    expect(signal?.aborted).toBe(false);
    jest.advanceTimersByTime(1);
    expect(signal?.aborted).toBe(true);
    await rejected;
    expect(jest.getTimerCount()).toBe(0);
  });
});
