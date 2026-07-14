import { formatManwon, manwonToWon, wonToManwon } from "@/lib/format/currency";

describe("currency format", () => {
  it("원 단위 금액을 만원 단위로 표시한다", () => {
    expect(formatManwon(500_000)).toBe("50만원");
    expect(formatManwon(60_000_000)).toBe("6,000만원");
    expect(formatManwon(5_000)).toBe("0.5만원");
  });

  it("금액이 없거나 숫자가 아니면 대시를 표시한다", () => {
    expect(formatManwon(undefined)).toBe("-");
    expect(formatManwon(null)).toBe("-");
    expect(formatManwon(Number.NaN)).toBe("-");
  });

  it("만원 단위 입력값과 원 단위 API 값을 변환한다", () => {
    expect(wonToManwon(500_000)).toBe(50);
    expect(wonToManwon(undefined)).toBeUndefined();
    expect(manwonToWon(50)).toBe(500_000);
  });
});
