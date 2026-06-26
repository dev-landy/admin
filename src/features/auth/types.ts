export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type OAuthProvider = "KAKAO" | "GOOGLE";

/** Body for the prod social login endpoint: POST /v1/auth/login */
export type ProdLoginRequest = {
  provider: OAuthProvider;
  /** Provider token — KAKAO: access token, GOOGLE: ID token. */
  token: string;
};

export type ProdLoginResponse = AuthTokens & {
  isNewUser: boolean;
  onboarded: boolean;
};

/** Body for DELETE /v1/auth/logout */
export type LogoutRequest = {
  refreshToken: string;
  fcmToken?: string;
};

/** Subset of the Kakao token endpoint response we rely on. */
export type KakaoTokenResponse = {
  token_type: string;
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
};
