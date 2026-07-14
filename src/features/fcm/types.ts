export type PushContent = {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
};

export type FcmSendResponse = { messageId: string };

export type TopicError = { index: number; reason: string };

export type TopicManagementResponse = {
  successCount: number;
  failureCount: number;
  errors: TopicError[];
};

export type SendToTokenRequest = { fcmTokenId: number; title: string; body: string };
export type SendToTopicRequest = { topic: string; content: PushContent };
export type SendSilentPushToTopicRequest = { topic: string; data: Record<string, string> };
export type TopicSubscriptionRequest = { topic: string; tokens: string[] };
