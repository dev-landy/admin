import { NextResponse, type NextRequest } from "next/server";
import { AxiosError } from "axios";

import { prodLogin } from "@/features/auth/api";
import { KAKAO_STATE_COOKIE } from "@/features/auth/kakao.constants";
import { exchangeKakaoCode } from "@/features/auth/kakao.server";

export const runtime = "nodejs";

/**
 * Completes the Kakao OAuth flow:
 * 1. verify the CSRF state cookie against the posted state,
 * 2. exchange the code for a Kakao access token (server-side),
 * 3. log into the Landy backend and return the rotated app tokens.
 *
 * The state cookie is single-use and deleted on every response path.
 */
export async function POST(request: NextRequest) {
  let body: { code?: unknown; state?: unknown };
  try {
    body = await request.json();
  } catch {
    return deleteStateAnd(NextResponse.json({ reason: "invalid_request" }, { status: 400 }));
  }

  const code = typeof body.code === "string" ? body.code : "";
  const state = typeof body.state === "string" ? body.state : "";
  const storedState = request.cookies.get(KAKAO_STATE_COOKIE)?.value;

  if (!storedState || !state || storedState !== state) {
    return deleteStateAnd(NextResponse.json({ reason: "invalid_state" }, { status: 400 }));
  }
  if (!code) {
    return deleteStateAnd(NextResponse.json({ reason: "invalid_request" }, { status: 400 }));
  }

  let kakaoAccessToken: string;
  try {
    kakaoAccessToken = await exchangeKakaoCode(code);
  } catch {
    return deleteStateAnd(
      NextResponse.json({ reason: "kakao_exchange_failed" }, { status: 502 }),
    );
  }

  try {
    const tokens = await prodLogin({ provider: "KAKAO", token: kakaoAccessToken });
    return deleteStateAnd(
      NextResponse.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }),
    );
  } catch (error) {
    // Forward only the backend's status (the client maps status → message);
    // never relay the raw backend body to this pre-auth, public endpoint.
    const status =
      error instanceof AxiosError ? error.response?.status ?? 502 : 502;
    return deleteStateAnd(
      NextResponse.json({ reason: "backend_login_failed" }, { status }),
    );
  }
}

function deleteStateAnd(response: NextResponse): NextResponse {
  response.cookies.delete(KAKAO_STATE_COOKIE);
  return response;
}
