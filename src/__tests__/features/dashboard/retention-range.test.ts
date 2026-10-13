/** @jest-environment node */
import { resolveRetentionRange } from '@/features/dashboard/retention-range';
test('August selection expands to Monday weeks and includes the last week', () => {
  expect(resolveRetentionRange({ start: '2026-08-01', end: '2026-08-31' }, '2026-10-13')).toEqual({ start: '2026-07-27', end: '2026-09-06', until: '2026-09-07' });
});
test.each([{ start: '2026-02-30', end: '2026-03-01' }, { start: '2026-09-01', end: '2026-08-01' }, { start: '2026-10-01', end: '2026-11-01' }])('invalid ranges are rejected', range => {
 expect(() => resolveRetentionRange(range, '2026-10-13')).toThrow();
});
