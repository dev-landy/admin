export type RetentionRange = { start: string; end: string };
const shift = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const monday = (date: string) => shift(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7));
export function resolveRetentionRange(range: RetentionRange | undefined, today: string) {
  if (!range) return { start: shift(monday(today), -28), end: shift(monday(today), -1), until: monday(today) };
  const valid = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && shift(date, 0) === date;
  if (!valid(range.start) || !valid(range.end) || range.start > range.end || range.end > today || Date.parse(range.end) - Date.parse(range.start) > 366 * 86400000) {
    throw new Error('오늘까지의 날짜로 시작일과 종료일을 선택하세요. 최대 1년까지 조회할 수 있습니다.');
  }
  const until = shift(monday(range.end), 7);
  return { start: monday(range.start), end: shift(until, -1), until };
}
