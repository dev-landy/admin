import axios from "axios";

import { env } from "@/config/env";
import type {
  AuthTokens,
  LogoutRequest,
  ProdLoginRequest,
  ProdLoginResponse,
} from "./types";

// Separate instance to avoid circular dependency with the main apiClient
// (apiClient imports tokenStore; this file must not import apiClient)
const authHttp = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

/** Social login. Server-side only (Kakao access token is obtained server-side). */
export async function prodLogin(payload: ProdLoginRequest): Promise<ProdLoginResponse> {
  const { data } = await authHttp.post<ProdLoginResponse>("/v1/auth/login", payload);
  return data;
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const { data } = await authHttp.post<AuthTokens>("/v1/auth/refresh", {
    refreshToken,
  });
  return data;
}

/** Revokes the refresh token server-side. Requires the current access token. */
export async function revokeSession(tokens: AuthTokens): Promise<void> {
  await authHttp.delete("/v1/auth/logout", {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
    data: { refreshToken: tokens.refreshToken } satisfies LogoutRequest,
  });
}
