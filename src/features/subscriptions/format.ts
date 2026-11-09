/** Subscription bounds are Instants; existing user timestamps are server-local strings. */
export function formatSubscriptionTime(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(date);
}

/** datetime-local input represents Korean time, independent of the operator's browser zone. */
export function parseGrantExpiration(value: string, now = Date.now()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+09:00`);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= now) return null;
  if (new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16) !== value) return null;
  return date.toISOString();
}
