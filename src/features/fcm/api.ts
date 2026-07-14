import { apiClient } from "@/lib/api/client";
import type {
  FcmSendResponse,
  SendSilentPushToTopicRequest,
  SendToTokenRequest,
  SendToTopicRequest,
  TopicManagementResponse,
  TopicSubscriptionRequest,
} from "./types";

export async function sendToToken({ fcmTokenId, ...body }: SendToTokenRequest): Promise<FcmSendResponse> {
  const { data } = await apiClient.post<FcmSendResponse>(
    `/v1/admin/fcm-tokens/${fcmTokenId}/test-messages`,
    body,
  );
  return data;
}

export async function sendToTopic({ topic, content }: SendToTopicRequest): Promise<FcmSendResponse> {
  const { data } = await apiClient.post<FcmSendResponse>(
    `/v1/admin/fcm/topics/${encodeURIComponent(topic)}`,
    { content },
  );
  return data;
}

export async function sendSilentPushToTopic({
  topic,
  data: payload,
}: SendSilentPushToTopicRequest): Promise<FcmSendResponse> {
  const { data } = await apiClient.post<FcmSendResponse>(
    `/v1/admin/fcm/topics/${encodeURIComponent(topic)}/silent-push`,
    { data: payload },
  );
  return data;
}

export async function subscribeTopic({ topic, tokens }: TopicSubscriptionRequest): Promise<TopicManagementResponse> {
  const { data } = await apiClient.post<TopicManagementResponse>(
    `/v1/admin/fcm/topics/${encodeURIComponent(topic)}/subscriptions`,
    { tokens },
  );
  return data;
}

export async function unsubscribeTopic({
  topic,
  tokens,
}: TopicSubscriptionRequest): Promise<TopicManagementResponse> {
  const { data } = await apiClient.delete<TopicManagementResponse>(
    `/v1/admin/fcm/topics/${encodeURIComponent(topic)}/subscriptions`,
    { data: { tokens } },
  );
  return data;
}

export async function sendSilentWakeup(): Promise<FcmSendResponse> {
  const { data } = await apiClient.post<FcmSendResponse>("/v1/admin/fcm/silent-wakeup");
  return data;
}
