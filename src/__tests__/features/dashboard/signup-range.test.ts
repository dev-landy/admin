import { getKstDate, getSignupRange, shiftDate, signupDates } from '@/features/dashboard/signup-range';

test('signup dates use the Korean calendar across midnight and year boundaries', () => {
  expect(getKstDate(new Date('2026-12-31T14:59:59Z'))).toBe('2026-12-31');
  expect(getKstDate(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01');
  expect(getSignupRange('2027-01-01')).toEqual({ startDate: '2026-12-26', endDate: '2027-01-01' });
});

test('weekly navigation gives seven consecutive dates including leap day', () => {
  expect(shiftDate('2028-03-03', -7)).toBe('2028-02-25');
  expect(signupDates(getSignupRange('2028-03-03'))).toEqual([
    '2028-02-26', '2028-02-27', '2028-02-28', '2028-02-29', '2028-03-01', '2028-03-02', '2028-03-03',
  ]);
});
