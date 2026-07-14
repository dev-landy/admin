import type { PaymentSource } from "./types";

export const PAYMENT_SOURCE_PRESENTATION: Record<
  PaymentSource,
  { label: string; color: string }
> = {
  MANUAL: { label: "수동", color: "blue" },
  BANK_AUTO: { label: "은행 자동", color: "green" },
  INITIALIZED: { label: "초기화", color: "orange" },
};

export const PAYMENT_SOURCE_OPTIONS = (
  Object.entries(PAYMENT_SOURCE_PRESENTATION) as [
    PaymentSource,
    (typeof PAYMENT_SOURCE_PRESENTATION)[PaymentSource],
  ][]
).map(([value, { label }]) => ({ value, label }));
