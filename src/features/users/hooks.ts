import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUsers,
  fetchUser,
  fetchUserTenants,
  fetchUserFcmTokens,
  updateUserRole,
  updateUserNotifySettings,
  updateUserAlimtalkEnabled,
  deleteUser,
  deactivateFcmToken,
  updateFcmTokenSilentWakeupSubscription,
  issueImpersonationTokens,
  sendFcmTokenSilentMessage,
} from "./api";
import type { UsersListParams, UserRole } from "./types";

export const userKeys = {
  all: ["users"] as const,
  list: (p: UsersListParams) => ["users", "list", p] as const,
  detail: (id: number) => ["users", id] as const,
  tenants: (id: number) => ["users", id, "tenants"] as const,
  tenantPage: (id: number, page: number, size: number) => ["users", id, "tenants", { page, size }] as const,
  fcmTokens: (id: number) => ["users", id, "fcm-tokens"] as const,
  fcmTokenPage: (id: number, page: number, size: number) => ["users", id, "fcm-tokens", { page, size }] as const,
};

export function useUsers(params: UsersListParams) {
  return useQuery({ queryKey: userKeys.list(params), queryFn: () => fetchUsers(params) });
}

export function useUser(userId: number) {
  return useQuery({ queryKey: userKeys.detail(userId), queryFn: () => fetchUser(userId) });
}

export function useUserTenants(userId: number, page = 1, size = 20) {
  return useQuery({ queryKey: userKeys.tenantPage(userId, page, size), queryFn: () => fetchUserTenants(userId, { page, size }) });
}

export function useUserFcmTokens(userId: number, page = 1, size = 20) {
  return useQuery({ queryKey: userKeys.fcmTokenPage(userId, page, size), queryFn: () => fetchUserFcmTokens(userId, { page, size }) });
}

export function useUpdateUserRole(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (role: UserRole) => updateUserRole(userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) });
      qc.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

export function useUpdateUserNotifySettings(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (s: { notifyDue?: boolean; notifyOverdue?: boolean }) =>
      updateUserNotifySettings(userId, s),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.detail(userId) }),
  });
}

/** 임대인의 세입자 알림톡 마스터 토글이다. 끄면 임차인별 설정과 무관하게 그 계정 발송이 전부 멈춘다. */
export function useUpdateUserAlimtalkEnabled(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alimtalkEnabled: boolean) => updateUserAlimtalkEnabled(userId, alimtalkEnabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.detail(userId) }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => deleteUser(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  });
}

export function useDeactivateFcmToken(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fcmTokenId: number) => deactivateFcmToken(fcmTokenId),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.fcmTokens(userId) }),
  });
}

export function useUpdateFcmTokenSilentWakeupSubscription(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fcmTokenId, subscribed }: { fcmTokenId: number; subscribed: boolean }) =>
      updateFcmTokenSilentWakeupSubscription(fcmTokenId, subscribed),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.fcmTokens(userId) }),
  });
}

export function useIssueImpersonationTokens(userId: number) {
  return useMutation({ mutationFn: () => issueImpersonationTokens(userId) });
}

export function useSendFcmTokenSilentMessage() {
  return useMutation({ mutationFn: (fcmTokenId: number) => sendFcmTokenSilentMessage(fcmTokenId) });
}
