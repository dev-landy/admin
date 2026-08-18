import type { BillingTiming } from "./types";

export const BILLING_TIMING_OPTIONS: { label: string; value: BillingTiming }[] = [
  { label: "선불", value: "PREPAID" },
  { label: "후불", value: "POSTPAID" },
];

export function normalizeBillingTiming(value?: BillingTiming | null): BillingTiming {
  return value === "POSTPAID" ? "POSTPAID" : "PREPAID";
}

export function formatBillingSchedule(
  billingTiming: BillingTiming | null | undefined,
  paymentDay: number,
): string {
  const label = normalizeBillingTiming(billingTiming) === "POSTPAID" ? "후불" : "선불";
  return `${label} · 매월 ${paymentDay}일`;
}
