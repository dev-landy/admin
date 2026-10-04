import type { OAuthProvider } from "./types";

export const OAUTH_PROVIDER_LABELS: Record<OAuthProvider, string> = {
  KAKAO: "카카오",
  GOOGLE: "구글",
  APPLE: "애플",
};

export const OAUTH_PROVIDER_OPTIONS = Object.entries(OAUTH_PROVIDER_LABELS).map(
  ([value, label]) => ({ value: value as OAuthProvider, label }),
);
