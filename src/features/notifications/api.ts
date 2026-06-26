import { apiClient } from "@/lib/api/client";
import type {
  NotificationsListParams,
  NotificationsListResponse,
  OutboxListParams,
  OutboxListResponse,
  OutboxEvent,
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

export async function requeueOutbox(id: number): Promise<OutboxEvent> {
  const { data } = await apiClient.post<OutboxEvent>(`/v1/admin/notifications/outbox/${id}/requeue`);
  return data;
}

export async function dispatchNotifications(size?: number): Promise<{ processed: number }> {
  const { data } = await apiClient.post<{ processed: number }>("/v1/admin/notifications/dispatch", null, {
    params: size !== undefined ? { size } : undefined,
  });
  return data;
}

export async function sendCustomNotification(
  body: SendCustomNotificationRequest,
): Promise<SendCustomNotificationResponse> {
  const { data } = await apiClient.post<SendCustomNotificationResponse>("/v1/admin/notifications/send", body);
  return data;
}
