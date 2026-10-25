import {
  formatRentSchedule,
  normalizeRentChargeFrequency,
} from "@/features/tenants/rentChargeFrequency";

test("임대료 납부 유형와 금액을 함께 표시한다", () => {
  expect(formatRentSchedule("MONTHLY", 500_000)).toBe("매월 · 50만원");
  expect(formatRentSchedule("ONE_TIME", 12_000_000)).toBe("계약기간 일시납 · 총 1,200만원");
});

test("이전 응답처럼 임대료 납부 유형가 누락되면 MONTHLY로 해석한다", () => {
  expect(normalizeRentChargeFrequency(undefined)).toBe("MONTHLY");
  expect(formatRentSchedule(undefined, 500_000)).toBe("납부 유형 확인 필요 · 50만원");
});
