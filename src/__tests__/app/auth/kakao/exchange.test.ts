/** @jest-environment node */
import { AxiosError, AxiosHeaders } from "axios";
import { NextRequest } from "next/server";

jest.mock("@/features/auth/kakao.server", () => ({ exchangeKakaoCode: jest.fn() }));
jest.mock("@/features/auth/api", () => ({ prodLogin: jest.fn() }));

import { POST } from "@/app/auth/kakao/exchange/route";
import { exchangeKakaoCode } from "@/features/auth/kakao.server";
import { prodLogin } from "@/features/auth/api";
import { KAKAO_STATE_COOKIE } from "@/features/auth/kakao.constants";

const mockExchange = exchangeKakaoCode as jest.Mock;
const mockProdLogin = prodLogin as jest.Mock;

function makeRequest(body: unknown, stateCookie?: string): NextRequest {
  const req = new NextRequest("http://localhost:3000/auth/kakao/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (stateCookie !== undefined) {
    req.cookies.set(KAKAO_STATE_COOKIE, stateCookie);
  }
  return req;
}

afterEach(() => jest.clearAllMocks());

test("happy path exchanges code, logs in, returns tokens", async () => {
  mockExchange.mockResolvedValue("kakao-at");
  mockProdLogin.mockResolvedValue({
    accessToken: "a",
    refreshToken: "r",
    isNewUser: false,
    onboarded: true,
  });

  const res = await POST(makeRequest({ code: "c", state: "s" }, "s"));

  expect(res.status).toBe(200);
  await expect(res.json()).resolves.toEqual({ accessToken: "a", refreshToken: "r" });
  expect(mockProdLogin).toHaveBeenCalledWith({ provider: "KAKAO", token: "kakao-at" });
  // state cookie cleared (single-use)
  expect(res.cookies.get(KAKAO_STATE_COOKIE)?.value).toBe("");
});

test("state mismatch → 400 without exchanging", async () => {
  const res = await POST(makeRequest({ code: "c", state: "s" }, "different"));
  expect(res.status).toBe(400);
  await expect(res.json()).resolves.toEqual({ reason: "invalid_state" });
  expect(mockExchange).not.toHaveBeenCalled();
});

test("missing state cookie → 400", async () => {
  const res = await POST(makeRequest({ code: "c", state: "s" }));
  expect(res.status).toBe(400);
  await expect(res.json()).resolves.toEqual({ reason: "invalid_state" });
});

test("kakao exchange failure → 502", async () => {
  mockExchange.mockRejectedValue(new Error("nope"));
  const res = await POST(makeRequest({ code: "c", state: "s" }, "s"));
  expect(res.status).toBe(502);
  await expect(res.json()).resolves.toEqual({ reason: "kakao_exchange_failed" });
});

test("backend 401 forwards the status but not the raw backend body", async () => {
  mockExchange.mockResolvedValue("kakao-at");
  const problem = {
    type: "/problems/oauth-authentication-failed",
    title: "Unauthorized",
    status: 401,
    detail: "bad token",
  };
  mockProdLogin.mockRejectedValue(
    new AxiosError("e", undefined, undefined, undefined, {
      data: problem,
      status: 401,
      statusText: "Unauthorized",
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    }),
  );

  const res = await POST(makeRequest({ code: "c", state: "s" }, "s"));

  // Status is preserved (client maps it to a message); backend body is not leaked.
  expect(res.status).toBe(401);
  await expect(res.json()).resolves.toEqual({ reason: "backend_login_failed" });
});
