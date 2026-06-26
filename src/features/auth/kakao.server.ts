/**
 * Server-only Kakao OAuth helper.
 *
 * The authorization code → access token exchange must run on the server: the
 * REST API key / client secret are secret, and Kakao's token endpoint is not
 * CORS-accessible from the browser.
 */

import { serverEnv } from "@/config/env.server";
import type { KakaoTokenResponse } from "./types";

if (typeof window !== "undefined") {
  throw new Error("@/features/auth/kakao.server must not be imported in the browser");
}

const KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token";

/**
 * Exchanges a Kakao authorization code for a Kakao **access token**.
 * The `redirect_uri` must be identical to the one used to obtain the code.
 *
 * @throws Error when Kakao returns a non-200 or omits the access token.
 */
export async function exchangeKakaoCode(code: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: serverEnv.kakaoRestApiKey,
    redirect_uri: serverEnv.kakaoRedirectUri,
    code,
  });

  const clientSecret = serverEnv.kakaoClientSecret;
  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const response = await fetch(KAKAO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Kakao token exchange failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as KakaoTokenResponse;
  if (!data.access_token) {
    throw new Error("Kakao token exchange returned no access_token");
  }

  return data.access_token;
}
