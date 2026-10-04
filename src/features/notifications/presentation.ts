import type { NotificationType, OutboxStatus } from "./types";

export const NOTIFICATION_TYPE_OPTIONS: { label: string; value: NotificationType }[] = [
  { label: "납부일", value: "DUE" },
  { label: "연체", value: "OVERDUE" },
  { label: "계약 만료 예정", value: "CONTRACT_EXPIRING" },
  { label: "커스텀", value: "CUSTOM" },
  { label: "납부 확인", value: "PAYMENT_RECORDED" },
  { label: "계약 등록 완료", value: "CONTRACT_REGISTERED" },
  { label: "계약 등록 실패", value: "CONTRACT_FAILED" },
];

export const OUTBOX_STATUS_OPTIONS: { label: string; value: OutboxStatus }[] = [
  { label: "대기 · PENDING", value: "PENDING" },
  { label: "발송 중 · SENDING", value: "SENDING" },
  { label: "발송 완료 · SENT", value: "SENT" },
  { label: "실패 · FAILED", value: "FAILED" },
  { label: "건너뜀 · SKIPPED", value: "SKIPPED" },
];
