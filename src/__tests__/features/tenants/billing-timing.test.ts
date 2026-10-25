import {
  formatBillingSchedule,
  normalizeBillingTiming,
} from "@/features/tenants/billingTiming";

test("납부 방식의 표시 문구를 납부일과 함께 만든다", () => {
  expect(formatBillingSchedule("PREPAID", 25)).toBe("선불 · 매월 25일");
  expect(formatBillingSchedule("POSTPAID", 25)).toBe("후불 · 매월 25일");
});

test("새 초안의 납부 방식 기본값은 PREPAID다", () => {
  expect(normalizeBillingTiming(undefined)).toBe("PREPAID");
  expect(formatBillingSchedule(undefined, 25)).toBe("선불 · 매월 25일");
});

test("일시납에서는 임대료 총액과 월별 관리비 납부를 구분한다", () => {
  expect(formatBillingSchedule("PREPAID", 5, "ONE_TIME", 50_000)).toBe("선불 · 관리비 매월 5일");
  expect(formatBillingSchedule("PREPAID", 5, "ONE_TIME", 0)).toBe("선불 · 시작월 5일 기준");
});
