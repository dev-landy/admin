import axios from "axios";

import { env } from "@/config/env";
import type { AuthTokens, DevLoginRequest } from "./types";

// Separate instance to avoid circular dependency with the main apiClient
// (apiClient imports tokenStore; this file must not import apiClient)
const authHttp = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

export async function devLogin(payload: DevLoginRequest): Promise<AuthTokens> {
  const { data } = await authHttp.post<AuthTokens>("/dev/auth/login", payload);
  return data;
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const { data } = await authHttp.post<AuthTokens>("/v1/auth/refresh", {
    refreshToken,
  });
  return data;
}
