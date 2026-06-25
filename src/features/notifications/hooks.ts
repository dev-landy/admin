import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNotifications, fetchOutbox, requeueOutbox, dispatchNotifications } from "./api";
import type { NotificationsListParams, OutboxListParams } from "./types";

export const notificationKeys = {
  list: (p: NotificationsListParams) => ["notifications", "list", p] as const,
  outbox: (p: OutboxListParams) => ["notifications", "outbox", p] as const,
};

export function useNotifications(params: NotificationsListParams) {
  return useQuery({ queryKey: notificationKeys.list(params), queryFn: () => fetchNotifications(params) });
}

export function useOutbox(params: OutboxListParams) {
  return useQuery({ queryKey: notificationKeys.outbox(params), queryFn: () => fetchOutbox(params) });
}

export function useRequeueOutbox(params: OutboxListParams) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => requeueOutbox(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.outbox(params) }),
  });
}

export function useDispatchNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (size?: number) => dispatchNotifications(size),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", "outbox"] }),
  });
}
