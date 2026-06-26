/**
 * Server-only, validated access to secret configuration (Kakao OAuth).
 *
 * NEVER import this from client code — these values (REST API key, client
 * secret) must never reach the browser bundle. The runtime guard below makes
 * an accidental client import fail loudly instead of silently leaking.
 *
 * Values are read lazily (getters) so a missing var throws at request time
 * where it can be handled, not at module load / build time.
 */

if (typeof window !== "undefined") {
  throw new Error("@/config/env.server must not be imported in the browser");
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[env.server] Missing required environment variable: ${name}`);
  }
  return value;
}

export const serverEnv = {
  /** Kakao REST API key — `client_id` for authorize + token exchange. */
  get kakaoRestApiKey(): string {
    return required("KAKAO_REST_API_KEY");
  },
  /** Must exactly match the redirect URI registered in the Kakao app. */
  get kakaoRedirectUri(): string {
    return required("KAKAO_REDIRECT_URI");
  },
  /** Optional — only sent if Client Secret is enabled in the Kakao console. */
  get kakaoClientSecret(): string | undefined {
    return process.env.KAKAO_CLIENT_SECRET?.trim() || undefined;
  },
} as const;
