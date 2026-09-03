import { formatDurationMillis } from "@/features/batch/duration";

test("아직 끝나지 않았거나 값이 없는 소요 시간은 - 로 표시한다", () => {
  expect(formatDurationMillis(null)).toBe("-");
  expect(formatDurationMillis(undefined)).toBe("-");
  expect(formatDurationMillis(Number.NaN)).toBe("-");
  expect(formatDurationMillis(-1)).toBe("-");
});

test("구간별로 ms·초·분·시간 단위를 나눠 표시한다", () => {
  expect(formatDurationMillis(0)).toBe("0ms");
  expect(formatDurationMillis(940)).toBe("940ms");
  expect(formatDurationMillis(1_500)).toBe("1.5초");
  expect(formatDurationMillis(90_000)).toBe("1분 30초");
  expect(formatDurationMillis(3_600_000 + 120_000)).toBe("1시간 2분");
});
