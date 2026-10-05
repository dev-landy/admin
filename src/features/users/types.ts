import type { BillingCycle, BillingTiming, TenantSearchParams } from "@/features/tenants/types";

export type UserRole = "USER" | "ADMIN";
export type OAuthProvider = "KAKAO" | "GOOGLE" | "APPLE";
export type UserStatus = "DRAFT" | "VERIFIED" | "ONBOARDED";
export type UserAccountState = "ALL" | "ACTIVE" | "WITHDRAWN";

export type UserSummary = {
  userId: number;
  email: string;
  phone: string | null;
  provider: OAuthProvider;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  /** 탈퇴 여부는 가입 단계와 별개이며, 구버전 API에서는 누락될 수 있다. */
  deletedAt?: string | null;
  /** 현재 등록된 FCM 기기의 OS 집계. 구버전 API의 필드 누락은 미확인으로 표시한다. */
  fcmPlatforms?: FcmToken["platform"][] | null;
};

export type UserDetail = {
  deletedAt?: string | null;
  userId: number;
  provider: OAuthProvider;
  role: UserRole;
  status: UserStatus;
  notifyDue: boolean;
  notifyOverdue: boolean;
  // 임대인이 설정 화면에서 켜고 끄는 값이다(기본 켜짐). 실제 발송은 임차인별 설정(기본 꺼짐)이 결정한다.
  alimtalkEnabled: boolean;
  email: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUserTenant = {
  deletedAt?: string | null;
  createdAt?: string | null;
  maintenanceFee?: number | null;
  parkingEnabled?: boolean;
  vehicleNumber?: string | null;
  tenantId: number;
  userId: number;
  propertyId?: number;
  propertyName?: string | null;
  userEmail?: string | null;
  phone?: string | null;
  contractType?: import("@/features/tenants/types").ContractType;
  name: string;
  roomNumber: number | string | null;
  rentPrice: number;
  depositAmount?: number | null;
  paymentDay: number;
  // 기존에는 paymentDay만 있었다. PREPAID/POSTPAID는 귀속월 대비 납부월을 정하고,
  // paymentDay와 함께 dueDate를 결정한다.
  billingTiming: BillingTiming;
  rentBillingCycle: BillingCycle;
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

export type UserListPageParams = { page?: number; size?: number; sort?: string };
export type UserTenantsParams = UserListPageParams & TenantSearchParams;
export type UserFcmTokensParams = UserListPageParams & { platform?: FcmToken["platform"]; silentWakeupSubscribed?: boolean; fcmTokenId?: number };
export type UserTenantsResponse = { tenants: AdminUserTenant[]; page: number; size: number; totalElements: number };
export type UserFcmTokensResponse = { fcmTokens: FcmToken[]; page: number; size: number; totalElements: number };

export type ImpersonationTokensResponse = {
  accessToken: string;
  refreshToken: string;
};

export type FcmMessageResponse = { messageId: string };

export type UsersListParams = {
  page?: number;
  size?: number;
  keyword?: string;
  userId?: number;
  provider?: OAuthProvider;
  status?: UserStatus;
  role?: UserRole;
  accountState?: UserAccountState;
  sort?: string;
};
