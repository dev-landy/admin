import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/** Picker의 지연된 blur 알림 전에 다음 클릭이 확정된 입력을 사용할 수 있게 한다. */
export function commitDateInput(
  target: EventTarget | null,
  formats: readonly string[],
  current: Dayjs | null | undefined,
  onCommit: (value: Dayjs | null) => void,
) {
  if (!(target instanceof HTMLInputElement) || target.disabled || target.readOnly) return;
  const text = target.value.trim();
  const next = text ? dayjs(text, [...formats], true) : null;
  if (next && !next.isValid()) return;
  if ((!next && !current) || (next && dayjs.isDayjs(current) && current.isSame(next, "day"))) return;
  onCommit(next);
}

export function commitDateRangeInput(
  target: EventTarget | null,
  range: "start" | "end" | undefined,
  current: readonly [Dayjs | null, Dayjs | null] | null | undefined,
  onCommit: (value: [Dayjs | null, Dayjs | null] | null) => void,
) {
  if (range !== "start" && range !== "end") return;
  const dates: [Dayjs | null, Dayjs | null] = [current?.[0] ?? null, current?.[1] ?? null];
  const index = range === "start" ? 0 : 1;
  commitDateInput(target, ["YYYY-MM-DD"], dates[index], (date) => {
    dates[index] = date;
    // 관리 필터의 RangePicker는 allowEmpty이며 기본 order=true를 유지한다.
    if (dates[0] && dates[1] && dates[0].isAfter(dates[1], "day")) {
      const previousStart = dates[0];
      dates[0] = dates[1];
      dates[1] = previousStart;
    }
    onCommit(dates[0] || dates[1] ? dates : null);
  });
}
