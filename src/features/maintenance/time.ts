/** Business timestamps are Seoul wall-clock strings, never browser-local dates. */
export function seoulNow(): string { return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 23); }
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function normalizeTime(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?$/.exec(value);
  if (!match || !validDate(match[1]) || +match[2] > 23 || +match[3] > 59 || +(match[4] ?? 0) > 59) throw new Error('서울 기준 날짜와 시각을 확인하세요.');
  return `${match[1]}T${match[2]}:${match[3]}:${match[4] ?? '00'}${match[5] ? `.${match[5]}` : ''}`;
}
export function compareTime(a: string, b: string): number {
  // Normalize fractions to six digits without losing microseconds.
  const key = (v: string) => { const [s, f = ''] = normalizeTime(v).split('.'); return `${s}.${f.padEnd(6, '0')}`; };
  return key(a).localeCompare(key(b));
}
