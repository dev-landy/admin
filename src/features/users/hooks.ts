import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUsers,
  fetchUser,
  fetchUserTenants,
  fetchUserFcmTokens,
  updateUserRole,
  updateUserNotifySettings,
  deleteUser,
  deactivateFcmToken,
} from "./api";
import type { UsersListParams, UserRole } from "./types";

export const userKeys = {
  all: ["users"] as const,
  list: (p: UsersListParams) => ["users", "list", p] as const,
  detail: (id: number) => ["users", id] as const,
  tenants: (id: number) => ["users", id, "tenants"] as const,
  fcmTokens: (id: number) => ["users", id, "fcm-tokens"] as const,
};

export function useUsers(params: UsersListParams) {
  return useQuery({ queryKey: userKeys.list(params), queryFn: () => fetchUsers(params) });
}

export function useUser(userId: number) {
  return useQuery({ queryKey: userKeys.detail(userId), queryFn: () => fetchUser(userId) });
}

export function useUserTenants(userId: number) {
  return useQuery({ queryKey: userKeys.tenants(userId), queryFn: () => fetchUserTenants(userId) });
}

export function useUserFcmTokens(userId: number) {
  return useQuery({ queryKey: userKeys.fcmTokens(userId), queryFn: () => fetchUserFcmTokens(userId) });
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
