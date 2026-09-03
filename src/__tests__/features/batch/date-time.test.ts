import { formatMillis, formatSeconds } from "@/features/batch/dateTime";

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
