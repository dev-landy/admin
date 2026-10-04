import axios, { AxiosError, CanceledError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

import { env } from "@/config/env";
import { tokenStore } from "@/features/auth/store";
import { refreshTokens } from "@/features/auth/api";
import { parseProblemDetail } from "@/lib/api/problem";

const REQUEST_TIMEOUT_MS = 30_000;

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

// --- Request: attach access token ---
apiClient.interceptors.request.use((config) => {
  const token = tokenStore.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response: 401 refresh + retry, admin-forbidden 403 → force logout, other 403 passthrough ---
type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void };
type RefreshOperation = { refreshToken: string; queue: QueueEntry[] };
let refreshOperation: RefreshOperation | undefined;

function drainQueue(operation: RefreshOperation, token: string) {
  operation.queue.forEach((e) => e.resolve(token));
  operation.queue = [];
}

function rejectQueue(operation: RefreshOperation, err: unknown) {
  operation.queue.forEach((e) => e.reject(err));
  operation.queue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    const config = error.config as RetryableConfig | undefined;

    if (error.response?.status === 401 && config && !config._retry) {
      config._retry = true;
      const storedRefreshToken = tokenStore.getRefreshToken();
      if (!storedRefreshToken) {
        if (!tokenStore.getAccessToken()) {
          return Promise.reject(new CanceledError("인증 세션이 종료되어 요청을 취소했습니다.", config));
        }
        tokenStore.clearTokens();
        // 인증 상태와 사용자별 Query 캐시까지 새 문서에서 초기화해야 하므로 전체 이동한다.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
        return Promise.reject(error);
      }

      const pendingOperation = refreshOperation;
      if (pendingOperation?.refreshToken === storedRefreshToken) {
        return new Promise((resolve, reject) => {
          pendingOperation.queue.push({
            resolve: (token) => {
              config.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(config));
            },
            reject,
          });
        });
      }

      const operation: RefreshOperation = { refreshToken: storedRefreshToken, queue: [] };
      refreshOperation = operation;

      try {
        const tokens = await refreshTokens(storedRefreshToken);
        // 로그아웃·새 로그인 뒤 완료된 옛 갱신은 현재 세션의 토큰을 덮어쓸 수 없다.
        if (tokenStore.getRefreshToken() !== storedRefreshToken) {
          throw new CanceledError("인증 세션이 변경되어 요청을 취소했습니다.", config);
        }
        tokenStore.setTokens(tokens);
        drainQueue(operation, tokens.accessToken);
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return apiClient(config);
      } catch (refreshError) {
        const failure = tokenStore.getRefreshToken() !== storedRefreshToken
          ? new CanceledError("인증 세션이 변경되어 요청을 취소했습니다.", config)
          : refreshError;
        rejectQueue(operation, failure);
        if (axios.isCancel(failure)) return Promise.reject(failure);
        tokenStore.clearTokens();
        // 인증 상태와 사용자별 Query 캐시까지 새 문서에서 초기화해야 하므로 전체 이동한다.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
        return Promise.reject(failure);
      } finally {
        if (refreshOperation === operation) refreshOperation = undefined;
      }
    }

    // Non-admin account that successfully logged in: every /v1/admin/** call
    // 403s. Clear the session and send them back to login with an explanation.
    // Scoped to admin-forbidden so legitimate per-resource 403s still pass through.
    if (error.response?.status === 403) {
      const problem = parseProblemDetail(error);
      if (problem?.type.endsWith("admin-forbidden")) {
        tokenStore.clearTokens();
        if (typeof window !== "undefined") {
          // 권한이 없는 세션의 상태와 캐시를 초기화하고 거절 사유를 표시한다.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/login?denied=1";
        }
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.error("[api] request failed", {
        url: config?.url,
        method: config?.method,
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    return Promise.reject(error);
  },
);
