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

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
} as const;
