import {
  formatRentSchedule,
  normalizeBillingCycle,
} from "@/features/tenants/billingCycle";

test("임대료 청구 주기와 금액을 함께 표시한다", () => {
  expect(formatRentSchedule("MONTHLY", 500_000)).toBe("매월 · 50만원");
  expect(formatRentSchedule("YEARLY", 12_000_000)).toBe("매년 · 1,200만원");
});

test("이전 응답처럼 임대료 청구 주기가 누락되면 MONTHLY로 해석한다", () => {
  expect(normalizeBillingCycle(undefined)).toBe("MONTHLY");
  expect(formatRentSchedule(undefined, 500_000)).toBe("매월 · 50만원");
});
