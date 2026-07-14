import { apiClient } from "@/lib/api/client";
import type {
  UsersListParams,
  UsersListResponse,
  UserDetail,
  UserTenantsResponse,
  UserFcmTokensResponse,
  UserRole,
  ImpersonationTokensResponse,
  FcmMessageResponse,
} from "./types";

export async function fetchUsers(params: UsersListParams): Promise<UsersListResponse> {
  const { data } = await apiClient.get<UsersListResponse>("/v1/admin/users", { params });
  return data;
}

export async function fetchUser(userId: number): Promise<UserDetail> {
  const { data } = await apiClient.get<UserDetail>(`/v1/admin/users/${userId}`);
  return data;
}

export async function fetchUserTenants(userId: number): Promise<UserTenantsResponse> {
  const { data } = await apiClient.get<UserTenantsResponse>(`/v1/admin/users/${userId}/tenants`);
  return data;
}

export async function fetchUserFcmTokens(userId: number): Promise<UserFcmTokensResponse> {
  const { data } = await apiClient.get<UserFcmTokensResponse>(`/v1/admin/users/${userId}/fcm-tokens`);
  return data;
}

export async function updateUserRole(userId: number, role: UserRole): Promise<{ userId: number; role: UserRole }> {
  const { data } = await apiClient.patch(`/v1/admin/users/${userId}/role`, { role });
  return data;
}

export async function updateUserNotifySettings(
  userId: number,
  settings: { notifyDue?: boolean; notifyOverdue?: boolean },
): Promise<{ userId: number; notifyDue: boolean; notifyOverdue: boolean }> {
  const { data } = await apiClient.patch(`/v1/admin/users/${userId}/notify-settings`, settings);
  return data;
}

export async function deleteUser(userId: number): Promise<void> {
  await apiClient.delete(`/v1/admin/users/${userId}`);
}

export async function deactivateFcmToken(fcmTokenId: number): Promise<void> {
  await apiClient.delete(`/v1/admin/fcm-tokens/${fcmTokenId}`);
}

export async function updateFcmTokenSilentWakeupSubscription(
  fcmTokenId: number,
  subscribed: boolean,
): Promise<void> {
  await apiClient.patch(`/v1/admin/fcm-tokens/${fcmTokenId}/silent-wakeup-subscription`, { subscribed });
}

export async function issueImpersonationTokens(userId: number): Promise<ImpersonationTokensResponse> {
  const { data } = await apiClient.post<ImpersonationTokensResponse>(
    `/v1/admin/users/${userId}/impersonation-tokens`,
  );
  return data;
}

export async function sendFcmTokenSilentMessage(fcmTokenId: number): Promise<FcmMessageResponse> {
  const { data } = await apiClient.post<FcmMessageResponse>(
    `/v1/admin/fcm-tokens/${fcmTokenId}/silent-messages`,
  );
  return data;
}
