/** @jest-environment node */
import axios, { AxiosHeaders } from "axios";

import { POST } from "@/app/api/v1/admin/properties/geocoding/route";

jest.mock("axios", () => ({
  ...jest.requireActual("axios"),
  __esModule: true,
  default: { post: jest.fn() },
}));
jest.mock("@/config/env", () => ({ env: { apiBaseUrl: "https://landy-api.example" } }));

const mockPost = jest.mocked(axios.post);
const result = '{"targetCount":2,"attemptedCount":2,"updatedCount":1,"skippedCount":0,"failedCount":1,"stopReason":"EXHAUSTED","failures":[{"propertyId":125,"reason":"EMPTY_RESULT"}]}';

function request(authorization: string | null = "Bearer admin-token") {
  return new Request("http://localhost:3000/api/v1/admin/properties/geocoding", {
    method: "POST",
    headers: authorization ? { Authorization: authorization } : undefined,
  });
}

beforeEach(() => jest.clearAllMocks());

test("본문 없는 관리자 요청을 시간 제한 없이 전달하고 집계 원문을 반환한다", async () => {
  mockPost.mockResolvedValue({ data: result, status: 200, headers: new AxiosHeaders({ "content-type": "application/json" }) });
  const input = request();
  const response = await POST(input);

  expect(mockPost).toHaveBeenCalledWith("https://landy-api.example/v1/admin/properties/geocoding", undefined, expect.objectContaining({
    headers: { Authorization: "Bearer admin-token" },
    timeout: 0,
    maxRedirects: 0,
    responseType: "text",
    signal: input.signal,
  }));
  const config = mockPost.mock.calls[0][2]!;
  expect(config.validateStatus?.(503)).toBe(true);
  const transforms = config.transformResponse;
  expect(Array.isArray(transforms)).toBe(true);
  if (Array.isArray(transforms)) expect(transforms[0].call({ headers: new AxiosHeaders() }, result, new AxiosHeaders())).toBe(result);
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("application/json");
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.text()).toBe(result);
});

test.each([401, 403, 503])("백엔드의 %i 오류 상태와 Problem Detail을 보존한다", async (status) => {
  const body = JSON.stringify({ type: "/problems/geocoding-unavailable", title: "처리 실패", status, detail: "좌표 조회를 사용할 수 없습니다." });
  mockPost.mockResolvedValue({ data: body, status, headers: new AxiosHeaders({ "content-type": "application/problem+json" }) });

  const response = await POST(request());

  expect(response.status).toBe(status);
  expect(response.headers.get("content-type")).toBe("application/problem+json");
  expect(await response.text()).toBe(body);
});

test.each([null, "Basic credentials"])("Bearer 인증이 없으면 백엔드를 호출하지 않는다: %s", async (authorization) => {
  const response = await POST(request(authorization));

  expect(response.status).toBe(401);
  expect(mockPost).not.toHaveBeenCalled();
});

test("연결 실패는 내부 오류 정보 없이 502 Problem Detail로 반환한다", async () => {
  mockPost.mockRejectedValue(new Error("private backend address and credentials"));

  const response = await POST(request());

  expect(response.status).toBe(502);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({
    type: "/problems/geocoding-proxy",
    title: "건물 주소 일괄 처리 결과를 확인하지 못했습니다.",
    status: 502,
    detail: "서버 연결을 확인해 주세요. 일부 건물은 이미 처리되었을 수 있습니다.",
  });
});
