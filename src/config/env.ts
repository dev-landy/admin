/**
 * Centralized, validated access to environment configuration.
 *
 * Validate at the boundary (here) so the rest of the app can trust these values
 * instead of reaching into `process.env` directly and re-checking everywhere.
 */

// In the browser, always route through the Next.js proxy (/api) to avoid CORS.
// On the server (SSR / Route Handlers), hit the backend directly.
const DEFAULT_API_BASE_URL = "http://localhost:8080";

function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api";
  }

  const value = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[env] NEXT_PUBLIC_API_BASE_URL is not set. Falling back to ${DEFAULT_API_BASE_URL}`,
      );
    }
    return DEFAULT_API_BASE_URL;
  }

  return value.replace(/\/+$/, "");
}

const APP_ENVS = ["prod", "dev", "local"] as const;

export type AppEnv = (typeof APP_ENVS)[number];

function isAppEnv(value: string): value is AppEnv {
  return (APP_ENVS as readonly string[]).includes(value);
}

// NEXT_PUBLIC_ 변수는 `process.env.NEXT_PUBLIC_APP_ENV`처럼 정적으로 참조한
// 표현식만 빌드 시점에 인라인되므로 동적 접근(process.env[key])을 쓰면 안 된다.
function resolveAppEnv(): AppEnv {
  const value = process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase();
  if (value && isAppEnv(value)) {
    return value;
  }

  if (value || process.env.NODE_ENV === "production") {
    console.warn(
      `[env] NEXT_PUBLIC_APP_ENV is ${value ? `invalid ("${value}")` : "not set"}. Falling back to "local"`,
    );
  }
  return "local";
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  appEnv: resolveAppEnv(),
} as const;
