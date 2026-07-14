export type UserRole = "USER" | "ADMIN";
export type OAuthProvider = "KAKAO" | "GOOGLE";
export type UserStatus = "DRAFT" | "VERIFIED" | "ONBOARDED";

export type UserSummary = {
  userId: number;
  email: string;
  phone: string | null;
  provider: OAuthProvider;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
};

export type UserDetail = {
  userId: number;
  provider: OAuthProvider;
  role: UserRole;
  status: UserStatus;
  notifyDue: boolean;
  notifyOverdue: boolean;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserTenant = {
  tenantId: number;
  userId: number;
  name: string;
  roomNumber: number;
  rentPrice: number;
  depositAmount?: number | null;
  paymentDay: number;
  startDate: string;
  endDate: string | null;
  notifyEnabled: boolean;
};

export type FcmToken = {
  fcmTokenId: number;
  userId: number;
  value: string;
  platform: "ANDROID" | "IOS";
  silentWakeupSubscribed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UsersListResponse = {
  users: UserSummary[];
  page: number;
  size: number;
  totalElements: number;
};

export type UserTenantsResponse = { tenants: AdminUserTenant[] };
export type UserFcmTokensResponse = { fcmTokens: FcmToken[] };

export type ImpersonationTokensResponse = {
  accessToken: string;
  refreshToken: string;
};

export type FcmMessageResponse = { messageId: string };

export type UsersListParams = {
  page?: number;
  size?: number;
  provider?: OAuthProvider;
  status?: UserStatus;
  role?: UserRole;
};
