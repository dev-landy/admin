export function formatKoreanDate(value: string | null | undefined): string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return "-";
  }

  const [, year, month, day] = match;
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

export function formatYearMonth(value: string | null | undefined): string {
  const match = value?.match(/^(\d{4})-(\d{2})(?:-|$)/);
  if (!match) {
    return "-";
  }

  const [, year, month] = match;
  return `${year}년 ${Number(month)}월`;
}
