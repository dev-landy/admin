export type UserRole = "USER" | "ADMIN";
export type OAuthProvider = "KAKAO" | "GOOGLE";

export type UserSummary = {
  userId: number;
  email: string;
  provider: OAuthProvider;
  role: UserRole;
  onboarded: boolean;
  createdAt: string;
};

export type UserDetail = {
  userId: number;
  provider: OAuthProvider;
  role: UserRole;
  onboarded: boolean;
  notifyDue: boolean;
  notifyOverdue: boolean;
  email: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserTenant = {
  tenantId: number;
  userId: number;
  name: string;
  roomNumber: number;
  rentPrice: number;
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

export type UsersListParams = {
  page?: number;
  size?: number;
  provider?: OAuthProvider;
  onboarded?: boolean;
  role?: UserRole;
};
