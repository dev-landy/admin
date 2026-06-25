export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type OAuthProvider = "KAKAO" | "GOOGLE";

export type DevLoginRequest = {
  provider: OAuthProvider;
  sub: string;
};
