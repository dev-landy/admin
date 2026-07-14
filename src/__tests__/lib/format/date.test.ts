import { formatKoreanDate, formatYearMonth } from "@/lib/format/date";

describe("date format", () => {
  it("날짜와 시간이 포함된 값을 한국어 날짜로 표시한다", () => {
    expect(formatKoreanDate("2026-07-02T17:01:29.365951")).toBe("2026년 7월 2일");
  });

  it("날짜가 없거나 형식이 올바르지 않으면 대시를 표시한다", () => {
    expect(formatKoreanDate(undefined)).toBe("-");
    expect(formatKoreanDate("invalid")).toBe("-");
  });

  it("청구월은 연도와 월까지만 표시한다", () => {
    expect(formatYearMonth("2026-07-01")).toBe("2026년 7월");
    expect(formatYearMonth("2026-07")).toBe("2026년 7월");
  });
});
