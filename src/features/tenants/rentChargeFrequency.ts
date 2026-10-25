import { formatManwon } from "@/lib/format/currency";
import type { RentChargeFrequency } from "./types";

export const BILLING_CYCLE_OPTIONS: { label: string; value: RentChargeFrequency }[] = [
  { label: "매월", value: "MONTHLY" },
  { label: "매년", value: "ONE_TIME" },
];

export function normalizeRentChargeFrequency(value?: RentChargeFrequency | null): RentChargeFrequency {
  return value === "ONE_TIME" ? "ONE_TIME" : "MONTHLY";
}

export function formatRentSchedule(
  rentChargeFrequency: RentChargeFrequency | null | undefined,
  rentPrice: number,
): string {
  const label = normalizeRentChargeFrequency(rentChargeFrequency) === "ONE_TIME" ? "매년" : "매월";
  return `${label} · ${formatManwon(rentPrice)}`;
}
