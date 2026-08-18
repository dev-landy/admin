import {
  formatBillingSchedule,
  normalizeBillingTiming,
} from "@/features/tenants/billingTiming";

test("납부 방식의 표시 문구를 납부일과 함께 만든다", () => {
  expect(formatBillingSchedule("PREPAID", 25)).toBe("선불 · 매월 25일");
  expect(formatBillingSchedule("POSTPAID", 25)).toBe("후불 · 매월 25일");
});

test("이전 응답처럼 납부 방식이 누락되면 PREPAID로 해석한다", () => {
  expect(normalizeBillingTiming(undefined)).toBe("PREPAID");
  expect(formatBillingSchedule(undefined, 25)).toBe("선불 · 매월 25일");
});
