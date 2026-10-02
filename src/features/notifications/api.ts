import { apiClient } from "@/lib/api/client";
import type {
  NotificationsListParams,
  NotificationsListResponse,
  OutboxListParams,
  OutboxListResponse,
  DispatchNotificationsResponse,
  SendCustomNotificationRequest,
  SendCustomNotificationResponse,
} from "./types";

export async function fetchNotifications(params: NotificationsListParams): Promise<NotificationsListResponse> {
  const { data } = await apiClient.get<NotificationsListResponse>("/v1/admin/notifications", { params });
  return data;
}

export async function fetchOutbox(params: OutboxListParams): Promise<OutboxListResponse> {
  const { data } = await apiClient.get<OutboxListResponse>("/v1/admin/notifications/outbox", { params });
  return data;
}

export async function requeueOutbox(id: number): Promise<void> {
  await apiClient.post(`/v1/admin/notifications/outbox/${id}/requeue`);
}

export async function dispatchNotifications(size?: number): Promise<DispatchNotificationsResponse | null> {
  const { data } = await apiClient.post<unknown>("/v1/admin/notifications/dispatch", null, {
    params: size !== undefined ? { size } : undefined,
  });
  // 이전 서버는 성공해도 빈 본문을 반환한다. 통계를 만들거나 POST를 다시 보내지 않는다.
  if (!data || typeof data !== "object") return null;
  const result = data as Record<string, unknown>;
  const keys = ["processed", "sent", "failed", "skipped", "alreadyClaimed"] as const;
  if (!keys.every((key) => typeof result[key] === "number" && Number.isSafeInteger(result[key]) && result[key] >= 0)) return null;
  return data as DispatchNotificationsResponse;
}

export async function sendCustomNotification(
  body: SendCustomNotificationRequest,
): Promise<SendCustomNotificationResponse> {
  const { data } = await apiClient.post<SendCustomNotificationResponse>("/v1/admin/notifications/send", body);
  return data;
}
