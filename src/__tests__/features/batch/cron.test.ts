import { buildCron, describeCron, parseCron } from "@/features/batch/cron";

// 운영에 실제로 등록된 9개 스케줄의 크론 식.
const REAL_EXPRESSIONS = [
  "0 0 9 * * *",
  "0 10/10 9 * * *",
  "0 0 10 * * *",
  "0 0 11-23 * * *",
  "0 0 5 * * *",
  "0 10/10 5 * * *",
  "0 0 6 * * *",
  "0 0 3 * * *",
  "0 10/10 3 * * *",
];

const UNPARSEABLE = [
  "0 0 9 * * MON",
  "*/5 * * * * *",
  "0 0 9 * *",
  "0 0 25 * * *",
  "0 60 9 * * *",
  "0 0/0 9 * * *",
  "0 0 23-11 * * *",
  "매일 아홉시",
  "",
];

test("매일 한 번 도는 식을 시·분으로 해석한다", () => {
  expect(parseCron("0 0 9 * * *")).toEqual({ mode: "daily", hour: 9, minute: 0 });
  expect(parseCron("0 30 8 * * *")).toEqual({ mode: "daily", hour: 8, minute: 30 });
});

test("한 시간 안에서 반복하는 식을 시작 분·간격으로 해석한다", () => {
  expect(parseCron("0 10/10 9 * * *")).toEqual({
    mode: "interval",
    hour: 9,
    startMinute: 10,
    intervalMinutes: 10,
  });
});

test("시간 범위 식을 시작 시·종료 시·분으로 해석한다", () => {
  expect(parseCron("0 0 11-23 * * *")).toEqual({
    mode: "hourlyRange",
    startHour: 11,
    endHour: 23,
    minute: 0,
  });
});

test("해석할 수 없는 식은 null을 돌려준다", () => {
  for (const expression of UNPARSEABLE) {
    expect(parseCron(expression)).toBeNull();
  }
});

test("세 모양 모두 해석한 뒤 다시 만들면 원래 식이 그대로 나온다", () => {
  for (const expression of REAL_EXPRESSIONS) {
    const form = parseCron(expression);
    expect(form).not.toBeNull();
    expect(buildCron(form!)).toBe(expression);
  }
});

test("편집기 구조에서 크론 식을 만든다", () => {
  expect(buildCron({ mode: "daily", hour: 8, minute: 30 })).toBe("0 30 8 * * *");
  expect(buildCron({ mode: "interval", hour: 5, startMinute: 10, intervalMinutes: 15 })).toBe(
    "0 10/15 5 * * *",
  );
  expect(buildCron({ mode: "hourlyRange", startHour: 11, endHour: 23, minute: 30 })).toBe(
    "0 30 11-23 * * *",
  );
});

test("운영 중인 9개 스케줄을 한국어 설명으로 바꾼다", () => {
  expect(describeCron("0 0 9 * * *")).toBe("매일 09:00");
  expect(describeCron("0 10/10 9 * * *")).toBe("매일 09:10부터 10분 간격 (09:50까지)");
  expect(describeCron("0 0 10 * * *")).toBe("매일 10:00");
  expect(describeCron("0 0 11-23 * * *")).toBe("매일 11~23시 정각");
  expect(describeCron("0 0 5 * * *")).toBe("매일 05:00");
  expect(describeCron("0 10/10 5 * * *")).toBe("매일 05:10부터 10분 간격 (05:50까지)");
  expect(describeCron("0 0 6 * * *")).toBe("매일 06:00");
  expect(describeCron("0 0 3 * * *")).toBe("매일 03:00");
  expect(describeCron("0 10/10 3 * * *")).toBe("매일 03:10부터 10분 간격 (03:50까지)");
});

test("정각이 아닌 시간 범위는 분을 함께 설명한다", () => {
  expect(describeCron("0 30 11-23 * * *")).toBe("매일 11~23시 30분");
});

test("해석할 수 없는 식은 원문을 그대로 보여준다", () => {
  for (const expression of UNPARSEABLE) {
    expect(describeCron(expression)).toBe(expression);
  }
});
