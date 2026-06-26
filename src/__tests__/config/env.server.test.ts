/** @jest-environment node */
import { serverEnv } from "@/config/env.server";

describe("serverEnv", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  test("returns trimmed required vars", () => {
    process.env.KAKAO_REST_API_KEY = " rest-key ";
    process.env.KAKAO_REDIRECT_URI = " http://localhost:3000/auth/kakao/callback ";
    expect(serverEnv.kakaoRestApiKey).toBe("rest-key");
    expect(serverEnv.kakaoRedirectUri).toBe("http://localhost:3000/auth/kakao/callback");
  });

  test("throws when a required var is missing", () => {
    delete process.env.KAKAO_REST_API_KEY;
    expect(() => serverEnv.kakaoRestApiKey).toThrow(/KAKAO_REST_API_KEY/);
  });

  test("client secret is optional", () => {
    delete process.env.KAKAO_CLIENT_SECRET;
    expect(serverEnv.kakaoClientSecret).toBeUndefined();
    process.env.KAKAO_CLIENT_SECRET = "secret";
    expect(serverEnv.kakaoClientSecret).toBe("secret");
  });
});
