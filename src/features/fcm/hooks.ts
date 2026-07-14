import { useMutation } from "@tanstack/react-query";

import {
  sendSilentPushToTopic,
  sendSilentWakeup,
  sendToToken,
  sendToTopic,
  subscribeTopic,
  unsubscribeTopic,
} from "./api";
import type {
  SendSilentPushToTopicRequest,
  SendToTokenRequest,
  SendToTopicRequest,
  TopicSubscriptionRequest,
} from "./types";

// 인프라 테스트 발송 — 서버 상태 캐시와 무관하므로 invalidation 없음.

export function useSendToToken() {
  return useMutation({ mutationFn: (req: SendToTokenRequest) => sendToToken(req) });
}

export function useSendToTopic() {
  return useMutation({ mutationFn: (req: SendToTopicRequest) => sendToTopic(req) });
}

export function useSendSilentPushToTopic() {
  return useMutation({ mutationFn: (req: SendSilentPushToTopicRequest) => sendSilentPushToTopic(req) });
}

export function useSubscribeTopic() {
  return useMutation({ mutationFn: (req: TopicSubscriptionRequest) => subscribeTopic(req) });
}

export function useUnsubscribeTopic() {
  return useMutation({ mutationFn: (req: TopicSubscriptionRequest) => unsubscribeTopic(req) });
}

export function useSendSilentWakeup() {
  return useMutation({ mutationFn: () => sendSilentWakeup() });
}
