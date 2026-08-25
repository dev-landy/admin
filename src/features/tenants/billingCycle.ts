import { formatManwon } from "@/lib/format/currency";
import type { BillingCycle } from "./types";

export const BILLING_CYCLE_OPTIONS: { label: string; value: BillingCycle }[] = [
  { label: "매월", value: "MONTHLY" },
  { label: "매년", value: "YEARLY" },
];

export function normalizeBillingCycle(value?: BillingCycle | null): BillingCycle {
  return value === "YEARLY" ? "YEARLY" : "MONTHLY";
}

export function formatRentSchedule(
  rentBillingCycle: BillingCycle | null | undefined,
  rentPrice: number,
): string {
  const label = normalizeBillingCycle(rentBillingCycle) === "YEARLY" ? "매년" : "매월";
  return `${label} · ${formatManwon(rentPrice)}`;
}
