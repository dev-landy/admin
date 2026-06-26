import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

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

// --- Response: 401 refresh + retry, 403 passthrough ---
type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void };
let queue: QueueEntry[] = [];

function drainQueue(token: string) {
  queue.forEach((e) => e.resolve(token));
  queue = [];
}

function rejectQueue(err: unknown) {
  queue.forEach((e) => e.reject(err));
  queue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;

    if (error.response?.status === 401 && config && !config._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (token) => {
              config.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(config));
            },
            reject,
          });
        });
      }

      config._retry = true;
      isRefreshing = true;

      const storedRefreshToken = tokenStore.getRefreshToken();
      if (!storedRefreshToken) {
        isRefreshing = false;
        rejectQueue(error);
        tokenStore.clearTokens();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const tokens = await refreshTokens(storedRefreshToken);
        tokenStore.setTokens(tokens);
        drainQueue(tokens.accessToken);
        config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return apiClient(config);
      } catch (refreshError) {
        rejectQueue(refreshError);
        tokenStore.clearTokens();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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
