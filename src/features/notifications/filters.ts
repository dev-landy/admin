export function parseNotificationUserId(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const userId = Number(value);
  return Number.isSafeInteger(userId) && userId > 0 ? userId : undefined;
}
