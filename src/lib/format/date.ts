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

/** Human-readable minute precision; preserve the server's local date and time. */
export function formatDateTime(value: string | null | undefined): string {
  const match = value?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]}` : "-";
}

// 백엔드가 LocalDateTime을 자기 타임존에서 이미 문자열로 만들어 내려준다.
// Date·dayjs로 파싱하면 브라우저 타임존으로 재해석되므로 문자열 그대로 다듬는다.
const LOCAL_DATE_TIME = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?/;

const MILLIS_DIGITS = 3;

/** 목록용 표기. 초 단위까지만 남기고 소수점 이하는 버린다. 값이 없거나 형식이 다르면 `-`. */
export function formatSeconds(value: string | null | undefined): string {
  const match = value?.match(LOCAL_DATE_TIME);
  if (!match) {
    return "-";
  }

  return match[1].replace("T", " ");
}

/** Exact server-local time for diagnosis, including fractions and any offset. */
export function formatTechnicalDateTime(value: string | null | undefined): string {
  if (!value || !LOCAL_DATE_TIME.test(value)) return "-";
  return value.replace("T", " ");
}

/**
 * 상세용 표기. 밀리초를 항상 3자리로 맞춘다. 서버가 마이크로초까지 내려주면 잘라내고,
 * 소수부가 없으면 0으로 채워 행마다 자릿수가 달라 보이지 않게 한다. 형식이 다르면 `-`.
 */
export function formatMillis(value: string | null | undefined): string {
  const match = value?.match(LOCAL_DATE_TIME);
  if (!match) {
    return "-";
  }

  const [, seconds, fraction = ""] = match;
  return `${seconds}.${fraction.slice(0, MILLIS_DIGITS).padEnd(MILLIS_DIGITS, "0")}`;
}
