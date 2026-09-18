import { formatKoreanDate, formatMillis, formatSeconds, formatYearMonth } from "@/lib/format/date";

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

test("목록 표기는 소수점 이하를 버리고 초 단위까지만 보여준다", () => {
  expect(formatSeconds("2026-09-03T12:30:08")).toBe("2026-09-03T12:30:08");
  expect(formatSeconds("2026-09-03T12:30:08.123")).toBe("2026-09-03T12:30:08");
  expect(formatSeconds("2026-09-03T12:30:08.123456")).toBe("2026-09-03T12:30:08");
});

test("상세 표기는 밀리초를 항상 3자리로 맞춘다", () => {
  expect(formatMillis("2026-09-03T12:30:08")).toBe("2026-09-03T12:30:08.000");
  expect(formatMillis("2026-09-03T12:30:08.1")).toBe("2026-09-03T12:30:08.100");
  expect(formatMillis("2026-09-03T12:30:08.123")).toBe("2026-09-03T12:30:08.123");
  expect(formatMillis("2026-09-03T12:30:08.123456")).toBe("2026-09-03T12:30:08.123");
});

test("값이 없거나 형식이 다르면 - 로 표시한다", () => {
  expect(formatSeconds(null)).toBe("-");
  expect(formatSeconds(undefined)).toBe("-");
  expect(formatSeconds("")).toBe("-");
  expect(formatSeconds("2026-09-03")).toBe("-");
  expect(formatSeconds("어제")).toBe("-");

  expect(formatMillis(null)).toBe("-");
  expect(formatMillis(undefined)).toBe("-");
  expect(formatMillis("")).toBe("-");
  expect(formatMillis("2026-09-03")).toBe("-");
  expect(formatMillis("어제")).toBe("-");
});
