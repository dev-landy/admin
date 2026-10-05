import { sortRecords } from "@/lib/table/sort-records";

test("전체 배열을 정렬한 뒤 나눈 두 페이지가 전역 순서를 유지하고 원본 캐시는 변경하지 않는다", () => {
  const records = [{ id: 40 }, { id: 2 }, { id: 30 }, { id: 1 }];
  const sorted = sortRecords(records, "id", "asc");
  expect(sorted.slice(0, 2).map((r) => r.id)).toEqual([1, 2]);
  expect(sorted.slice(2, 4).map((r) => r.id)).toEqual([30, 40]);
  expect(records.map((r) => r.id)).toEqual([40, 2, 30, 1]);
});

test("같은 날짜는 고유 ID로 안정적으로 정렬하고 날짜 없는 항목은 어느 방향에서도 마지막에 둔다", () => {
  const records = [{ id: 3, date: null }, { id: 2, date: "2026-10-05" }, { id: 1, date: "2026-10-05" }, { id: 4, date: "2026-10-04" }];
  expect(sortRecords(records, "date", "asc", "id").map((r) => r.id)).toEqual([4, 1, 2, 3]);
  expect(sortRecords(records, "date", "desc", "id").map((r) => r.id)).toEqual([2, 1, 4, 3]);
});

test("소수초와 서로 다른 시간대의 시각도 실제 시간순으로 정렬한다", () => {
  const records = [
    { id: 3, date: "2026-10-05T09:00:00.1+09:00" },
    { id: 2, date: "2026-10-05T00:00:00.090002Z" },
    { id: 1, date: "2026-10-05T09:00:00.090001+09:00" },
  ];
  expect(sortRecords(records, "date", "asc").map((r) => r.id)).toEqual([1, 2, 3]);
  expect(sortRecords(records, "date", "desc").map((r) => r.id)).toEqual([3, 2, 1]);
});
