const MILLIS_PER_SECOND = 1_000;
const MILLIS_PER_MINUTE = 60 * MILLIS_PER_SECOND;
const MILLIS_PER_HOUR = 60 * MILLIS_PER_MINUTE;

/** 배치 소요 시간(ms)을 사람이 읽는 한국어 표기로 바꾼다. 아직 끝나지 않은 실행은 `-`. */
export function formatDurationMillis(millis: number | null | undefined): string {
  if (millis == null || Number.isNaN(millis) || millis < 0) {
    return "-";
  }

  if (millis < MILLIS_PER_SECOND) {
    return `${millis}ms`;
  }

  if (millis < MILLIS_PER_MINUTE) {
    return `${(millis / MILLIS_PER_SECOND).toFixed(1)}초`;
  }

  if (millis < MILLIS_PER_HOUR) {
    const minutes = Math.floor(millis / MILLIS_PER_MINUTE);
    const seconds = Math.floor((millis % MILLIS_PER_MINUTE) / MILLIS_PER_SECOND);
    return `${minutes}분 ${seconds}초`;
  }

  const hours = Math.floor(millis / MILLIS_PER_HOUR);
  const minutes = Math.floor((millis % MILLIS_PER_HOUR) / MILLIS_PER_MINUTE);
  return `${hours}시간 ${minutes}분`;
}
