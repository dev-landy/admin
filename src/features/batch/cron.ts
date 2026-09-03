// 이 서비스의 배치는 모두 하루 단위 날짜 키 작업이라 크론 식이 세 모양으로만 쓰인다.
//   `0 M H * * *`     매일 한 번
//   `0 S/N H * * *`   한 시간 안에서 S분부터 N분 간격 반복
//   `0 M H1-H2 * * *` H1~H2시의 매시 M분
// 세 모양만 다루면 되므로 라이브러리 없이 직접 해석한다. 벗어나는 식은 건드리지 않고
// 원문을 그대로 보여주고, 편집은 직접 입력 모드로 넘긴다.
const DAILY = /^0 (\d{1,2}) (\d{1,2}) \* \* \*$/;
const INTERVAL = /^0 (\d{1,2})\/(\d{1,2}) (\d{1,2}) \* \* \*$/;
const HOURLY_RANGE = /^0 (\d{1,2}) (\d{1,2})-(\d{1,2}) \* \* \*$/;

const MAX_HOUR = 23;
const MAX_MINUTE = 59;

export type CronForm =
  | { mode: "daily"; hour: number; minute: number }
  | { mode: "interval"; hour: number; startMinute: number; intervalMinutes: number }
  | { mode: "hourlyRange"; startHour: number; endHour: number; minute: number };

export type CronMode = CronForm["mode"];

function isHour(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_HOUR;
}

function isMinute(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= MAX_MINUTE;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** 크론 식을 편집기용 구조로 해석한다. 아는 세 모양이 아니면 `null`. */
export function parseCron(expression: string): CronForm | null {
  const trimmed = expression.trim();

  const daily = trimmed.match(DAILY);
  if (daily) {
    const minute = Number(daily[1]);
    const hour = Number(daily[2]);
    return isMinute(minute) && isHour(hour) ? { mode: "daily", hour, minute } : null;
  }

  const interval = trimmed.match(INTERVAL);
  if (interval) {
    const startMinute = Number(interval[1]);
    const intervalMinutes = Number(interval[2]);
    const hour = Number(interval[3]);
    return isMinute(startMinute) && isMinute(intervalMinutes) && intervalMinutes > 0 && isHour(hour)
      ? { mode: "interval", hour, startMinute, intervalMinutes }
      : null;
  }

  const hourlyRange = trimmed.match(HOURLY_RANGE);
  if (hourlyRange) {
    const minute = Number(hourlyRange[1]);
    const startHour = Number(hourlyRange[2]);
    const endHour = Number(hourlyRange[3]);
    return isMinute(minute) && isHour(startHour) && isHour(endHour) && startHour <= endHour
      ? { mode: "hourlyRange", startHour, endHour, minute }
      : null;
  }

  return null;
}

/** 편집기 구조를 크론 식으로 되돌린다. `parseCron`과 왕복해도 원문이 그대로 나온다. */
export function buildCron(form: CronForm): string {
  switch (form.mode) {
    case "daily":
      return `0 ${form.minute} ${form.hour} * * *`;
    case "interval":
      return `0 ${form.startMinute}/${form.intervalMinutes} ${form.hour} * * *`;
    case "hourlyRange":
      return `0 ${form.minute} ${form.startHour}-${form.endHour} * * *`;
  }
}

/** 크론 식을 한국어 설명으로 바꾼다. 해석하지 못하면 원문을 그대로 돌려준다. */
export function describeCron(expression: string): string {
  const form = parseCron(expression);
  if (!form) {
    return expression;
  }

  switch (form.mode) {
    case "daily":
      return `매일 ${pad(form.hour)}:${pad(form.minute)}`;
    case "interval": {
      const start = `${pad(form.hour)}:${pad(form.startMinute)}`;
      // 간격 반복은 그 시간 안에서만 돈다. 마지막 발동 시각까지 보여줘야 범위를 오해하지 않는다.
      const lastMinute =
        form.startMinute +
        Math.floor((MAX_MINUTE - form.startMinute) / form.intervalMinutes) * form.intervalMinutes;
      const repeated = `매일 ${start}부터 ${form.intervalMinutes}분 간격`;
      return lastMinute === form.startMinute
        ? repeated
        : `${repeated} (${pad(form.hour)}:${pad(lastMinute)}까지)`;
    }
    case "hourlyRange":
      return form.minute === 0
        ? `매일 ${form.startHour}~${form.endHour}시 정각`
        : `매일 ${form.startHour}~${form.endHour}시 ${form.minute}분`;
  }
}
