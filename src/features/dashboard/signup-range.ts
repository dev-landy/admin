export type SignupRange = { startDate: string; endDate: string };

/** Calendar arithmetic uses UTC only as a date container; the reporting day is KST. */
export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function getKstDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

export function getSignupRange(endDate: string): SignupRange {
  return { startDate: shiftDate(endDate, -6), endDate };
}

export function signupDates(range: SignupRange): string[] {
  return Array.from({ length: 7 }, (_, index) => shiftDate(range.startDate, index));
}
