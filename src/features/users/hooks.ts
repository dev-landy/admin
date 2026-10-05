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
import type { UsersListParams, UserRole, UserTenantsParams, UserFcmTokensParams } from "./types";

export const userKeys = {
  all: ["users"] as const,
  lists: ["users", "list"] as const,
  list: (p: UsersListParams) => ["users", "list", p] as const,
  detail: (id: number) => ["users", id] as const,
  tenants: (id: number) => ["users", id, "tenants"] as const,
  tenantPage: (id: number, page: number, size: number, filters: UserTenantsParams = {}) => ["users", id, "tenants", { ...filters, page, size }] as const,
  fcmTokens: (id: number) => ["users", id, "fcm-tokens"] as const,
  fcmTokenPage: (id: number, page: number, size: number, filters: UserFcmTokensParams = {}) => ["users", id, "fcm-tokens", { ...filters, page, size }] as const,
};

export function useUsers(params: UsersListParams) {
  return useQuery({ queryKey: userKeys.list(params), queryFn: () => fetchUsers(params) });
}

export function useUser(userId: number) {
  return useQuery({ queryKey: userKeys.detail(userId), queryFn: () => fetchUser(userId) });
}

export function useUserTenants(userId: number, page = 1, size = 20, filters: UserTenantsParams = {}) {
  return useQuery({ queryKey: userKeys.tenantPage(userId, page, size, filters), queryFn: () => fetchUserTenants(userId, { ...filters, page, size }) });
}

export function useUserFcmTokens(userId: number, page = 1, size = 20, filters: UserFcmTokensParams = {}) {
  return useQuery({ queryKey: userKeys.fcmTokenPage(userId, page, size, filters), queryFn: () => fetchUserFcmTokens(userId, { ...filters, page, size }) });
}

export function useUpdateUserRole(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (role: UserRole) => updateUserRole(userId, role),
    onSuccess: () => {
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
    // 계정 삭제는 소유 데이터도 정리하므로 다른 화면의 삭제 전 캐시가 남지 않게 한다.
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: userKeys.all }),
      qc.invalidateQueries({ queryKey: ["properties"] }),
      qc.invalidateQueries({ queryKey: ["tenants"] }),
      qc.invalidateQueries({ queryKey: ["payments"] }),
      qc.invalidateQueries({ queryKey: ["notifications"] }),
      qc.invalidateQueries({ queryKey: ["contract-documents"] }),
      qc.invalidateQueries({ queryKey: ["alimtalks", "list"] }),
    ]),
  });
}

export function useDeactivateFcmToken(userId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fcmTokenId: number) => deactivateFcmToken(fcmTokenId),
    // 등록 기기가 사라지면 사용자 목록의 OS 집계도 바뀐다.
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: userKeys.fcmTokens(userId) }),
      qc.invalidateQueries({ queryKey: userKeys.lists }),
    ]),
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
