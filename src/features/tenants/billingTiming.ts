import type { BillingTiming, RentChargeFrequency } from "./types";

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
  rentChargeFrequency: RentChargeFrequency = "MONTHLY",
  maintenanceFee?: number | null,
): string {
  const label = normalizeBillingTiming(billingTiming) === "POSTPAID" ? "후불" : "선불";
  if (rentChargeFrequency === "ONE_TIME") {
    return (maintenanceFee ?? 0) > 0
      ? `${label} · 관리비 매월 ${paymentDay}일`
      : `${label} · 시작월 ${paymentDay}일 기준`;
  }
  return `${label} · 매월 ${paymentDay}일`;
}
