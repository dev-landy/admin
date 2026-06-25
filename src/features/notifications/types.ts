export type NotificationType = "DUE" | "OVERDUE";
export type OutboxStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

export type Notification = {
  notificationId: number;
  userId: number;
  tenantId: number;
  title: string;
  content: string;
  type: NotificationType;
  targetDate: string;
  sentAt: string;
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
