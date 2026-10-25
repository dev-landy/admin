import { toContractRegistrationValues } from "@/features/contract-ocr/registrationValues";
import { VALUES } from "@/test-utils/contractDocumentFixtures";

test.each(["2026-11-19", "2027-04-19"])("8개월·13개월 일시납도 합의 총액을 그대로 등록한다: %s", (endDate) => {
  const result = toContractRegistrationValues({
    ...VALUES, rentChargeFrequency: "ONE_TIME", billingTiming: "PREPAID",
    startDate: "2026-03-20", endDate, rentPrice: 8_000_001, maintenanceFee: 50_000,
  });
  expect(result).toMatchObject({
    rentChargeFrequency: "ONE_TIME", billingTiming: "PREPAID", endDate,
    rentPrice: 8_000_001, maintenanceFee: 50_000,
  });
  expect(Object.keys(result)).not.toContain("rentBillingCycle");
});

test("최종 일시납 요청은 종료일 누락과 후불을 거부한다", () => {
  expect(() => toContractRegistrationValues({ ...VALUES, rentChargeFrequency: "ONE_TIME", billingTiming: "PREPAID", endDate: null }))
    .toThrow("계약 종료일이 필요합니다");
  expect(() => toContractRegistrationValues({ ...VALUES, rentChargeFrequency: "ONE_TIME", billingTiming: "POSTPAID", endDate: "2027-04-19" }))
    .toThrow("선불만 가능합니다");
});

test("월납은 후불과 종료일 미입력을 유지하고 선택 금액은 0원으로 등록한다", () => {
  expect(toContractRegistrationValues({ ...VALUES, rentPrice: null, maintenanceFee: null, depositAmount: null }))
    .toMatchObject({ rentChargeFrequency: "MONTHLY", billingTiming: "POSTPAID", endDate: null, rentPrice: 0, maintenanceFee: 0, depositAmount: 0 });
});

test("미완성 초안은 최종 등록 요청으로 전송하지 않는다", () => {
  expect(() => toContractRegistrationValues({ ...VALUES, name: null })).toThrow("계약 등록에 필요한");
});
