import { NextResponse } from "next/server";

import { serverEnv } from "@/config/env.server";
import { KAKAO_STATE_COOKIE } from "@/features/auth/kakao.constants";

export const runtime = "nodejs";

const KAKAO_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize";
const STATE_MAX_AGE_SECONDS = 600;

/**
 * Begins the Kakao OAuth flow. Generates a CSRF `state`, stores it in an
 * httpOnly cookie, and redirects the browser to Kakao's authorize page.
 * The REST API key stays server-side (never enters the client bundle).
 */
export async function GET() {
  const state = crypto.randomUUID();

  const authorizeUrl = new URL(KAKAO_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", serverEnv.kakaoRestApiKey);
  authorizeUrl.searchParams.set("redirect_uri", serverEnv.kakaoRedirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(KAKAO_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must return on Kakao's top-level redirect back
    path: "/",
    maxAge: STATE_MAX_AGE_SECONDS,
  });
  return response;
}
