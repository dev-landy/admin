export type NotificationType = "DUE" | "OVERDUE" | "CUSTOM" | "PAYMENT_RECORDED";
export type OutboxStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

export type Notification = {
  notificationId: number;
  userId: number;
  tenantId: number | null;
  title: string;
  content?: string;
  type: NotificationType;
  targetDate: string;
  sentAt?: string;
  createdAt?: string;
  isRead: boolean;
};

export type OutboxEvent = {
  notificationOutboxEventId: number;
  notificationId: number;
  userId: number;
  fcmTokenId: number;
  tokenValue: string;
  status: OutboxStatus;
  attempts: number;
  lastAttemptedAt: string | null;
  sentAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
};

export type NotificationsListResponse = {
  notifications: Notification[];
  page: number;
  size: number;
  totalElements: number;
};

export type OutboxListResponse = {
  outbox: OutboxEvent[];
  page: number;
  size: number;
  totalElements: number;
};

export type NotificationsListParams = {
  page?: number;
  size?: number;
  userId?: number;
  type?: NotificationType;
  isRead?: boolean;
};

export type OutboxListParams = {
  page?: number;
  size?: number;
  userId?: number;
  status?: OutboxStatus;
  errorCode?: string;
};

export type SendCustomNotificationRequest = {
  userId: number;
  title: string;
  body: string;
};

export type SendCustomNotificationResponse = {
  notificationId: number;
  sent: number;
  failed: number;
  skipped: number;
  // 알림이 커밋된 뒤 이 요청이 outbox를 선점하기 전에 1분 주기 자동 발송기가 먼저 가져간 건수.
  // 누락이 아니라 이미 발송 중이라는 뜻이라, 발송 결과를 읽을 때 0건과 구분해야 한다.
  alreadyClaimed: number;
};
