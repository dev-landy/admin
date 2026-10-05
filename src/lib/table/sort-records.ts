import type { SortDirection } from "@/components/ListSortSelect";

function timestamp(value: string): { time: number; fraction: number } | undefined {
  if (!/^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value)) return;
  const fractional = value.match(/\.(\d{1,9})/);
  const whole = fractional ? value.replace(fractional[0], "") : value;
  const time = Date.parse(whole.replace(" ", "T"));
  return Number.isFinite(time) ? { time, fraction: Number(fractional?.[1].padEnd(9, "0") ?? 0) } : undefined;
}

function compare(a: unknown, b: unknown, direction: SortDirection): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  const sign = direction === "asc" ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return (a - b) * sign;
  if (typeof a === "string" && typeof b === "string") {
    const first = timestamp(a), second = timestamp(b);
    if (first && second) return (first.time - second.time || first.fraction - second.fraction) * sign;
  }
  return String(a).localeCompare(String(b), "ko", { numeric: true }) * sign;
}

/** 전체 조회 배열을 정렬한 뒤 페이지를 나누며 원본 Query 캐시는 변경하지 않는다. */
export function sortRecords<T extends object>(records: readonly T[], field: keyof T | string, direction: SortDirection, tieBreaker?: keyof T | string): T[] {
  const value = (record: T, key: keyof T | string) => record[key as keyof T];
  return [...records].sort((a, b) => compare(value(a, field), value(b, field), direction)
    || (tieBreaker ? compare(value(a, tieBreaker), value(b, tieBreaker), direction) : 0));
}
