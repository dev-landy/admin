import { formatManwon } from "@/lib/format/currency";
import type { RentChargeFrequency } from "./types";

export const RENT_CHARGE_FREQUENCY_OPTIONS: { label: string; value: RentChargeFrequency }[] = [
  { label: "월납", value: "MONTHLY" },
  { label: "계약기간 일시납", value: "ONE_TIME" },
];

/** 작성 중인 새 초안의 미입력 기본값이다. 구 API 어휘를 변환하지 않는다. */
export function normalizeRentChargeFrequency(value?: RentChargeFrequency | null): RentChargeFrequency {
  return value ?? "MONTHLY";
}

export function formatRentSchedule(
  rentChargeFrequency: RentChargeFrequency | null | undefined,
  rentPrice: number,
): string {
  if (rentChargeFrequency === "ONE_TIME") return `계약기간 일시납 · 총 ${formatManwon(rentPrice)}`;
  if (rentChargeFrequency === "MONTHLY") return `매월 · ${formatManwon(rentPrice)}`;
  return `납부 유형 확인 필요 · ${formatManwon(rentPrice)}`;
}
