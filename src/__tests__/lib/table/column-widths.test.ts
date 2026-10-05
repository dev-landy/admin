import { allocateColumnWidths } from "@/lib/table/column-widths";

test("알림의 제목보다 긴 수신자 정보에 여유를 주고 상태·작업은 필요한 폭을 유지한다", () => {
  const layout = allocateColumnWidths(1648, [
    { min: 280, preferred: 460, grow: 1 },
    { min: 340, preferred: 600, grow: 2 },
    { min: 110, preferred: 110, grow: 0 },
    { min: 240, preferred: 260, grow: 0.5 },
    { min: 144, preferred: 144, grow: 0 },
  ]);
  expect(layout.total).toBeCloseTo(1648);
  expect(layout.widths[1]).toBeGreaterThan(layout.widths[0]);
  expect(layout.widths[1]).toBeGreaterThan(600);
  expect(layout.widths[2]).toBe(110);
  expect(layout.widths[4]).toBe(144);
});

test("빠르게 채워진 짧은 열 대신 아직 폭이 필요한 열에 공간을 먼저 배분한다", () => {
  const layout = allocateColumnWidths(160, [
    { min: 40, preferred: 50, grow: 1 },
    { min: 40, preferred: 100, grow: 1 },
    { min: 20, preferred: 20, grow: 0 },
  ]);
  expect(layout.widths).toEqual([50, 90, 20]);
});

test("최소 정보 폭보다 좁으면 내용을 줄이지 않고 표 전환·스크롤에 필요한 최소 폭을 돌려준다", () => {
  const layout = allocateColumnWidths(400, [
    { min: 300, preferred: 500, grow: 2 },
    { min: 240, preferred: 300, grow: 1 },
    { min: 144, preferred: 144, grow: 0 },
  ]);
  expect(layout.widths).toEqual([300, 240, 144]);
  expect(layout.total).toBe(684);
});

test("빈 열과 가변 정책이 없는 기본 표도 처리한다", () => {
  expect(allocateColumnWidths(800, [])).toEqual({ widths: [], total: 0 });
  expect(allocateColumnWidths(800, [{ min: 160, preferred: 160, grow: 0 }]).widths).toEqual([800]);
});
