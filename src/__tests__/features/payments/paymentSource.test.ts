import {
  PAYMENT_SOURCE_OPTIONS,
  PAYMENT_SOURCE_PRESENTATION,
} from "@/features/payments/paymentSource";

describe("payment source presentation", () => {
  it("모든 납부 출처를 서로 다른 색상과 한글 이름으로 제공한다", () => {
    expect(PAYMENT_SOURCE_PRESENTATION).toEqual({
      MANUAL: { label: "수동", color: "blue" },
      BANK_AUTO: { label: "은행 자동", color: "green" },
      INITIALIZED: { label: "초기화", color: "orange" },
    });
    expect(new Set(Object.values(PAYMENT_SOURCE_PRESENTATION).map(({ color }) => color)).size).toBe(3);
    expect(PAYMENT_SOURCE_OPTIONS).toContainEqual({ label: "초기화", value: "INITIALIZED" });
  });
});
