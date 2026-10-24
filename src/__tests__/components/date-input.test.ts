import dayjs from "dayjs";
import { commitDateInput, parseDateInput, TENANT_DATE_INPUT_FORMATS } from "@/components/date-input";

test.each([
  ["261106", "2026-11-06"],
  ["691106", "2069-11-06"],
  ["000229", "2000-02-29"],
  ["991231", "2099-12-31"],
  ["19691106", "1969-11-06"],
])("계약 날짜 %s는 명시한 세기 정책과 네 자리 연도를 유지한다", (text, expected) => {
  expect(parseDateInput(text, TENANT_DATE_INPUT_FORMATS).format("YYYY-MM-DD")).toBe(expected);
});

test("축약 날짜를 허용하지 않은 필터의 기존 파싱 계약은 넓히지 않는다", () => {
  expect(parseDateInput("261106", ["YYYY-MM-DD"]).isValid()).toBe(false);
  expect(parseDateInput("2026-11-06", ["YYYY-MM-DD"]).format("YYYY-MM-DD")).toBe("2026-11-06");
});

test("클릭 전에 확정하는 경로도 같은 두 자리 연도를 사용하고 잘못된 날짜는 저장하지 않는다", () => {
  const input = document.createElement("input");
  const commit = jest.fn();
  input.value = "691106";
  commitDateInput(input, TENANT_DATE_INPUT_FORMATS, dayjs("2026-11-06"), commit);
  expect(commit).toHaveBeenCalledTimes(1);
  expect(commit.mock.calls[0][0].format("YYYY-MM-DD")).toBe("2069-11-06");
  input.value = "690230";
  commitDateInput(input, TENANT_DATE_INPUT_FORMATS, dayjs("2026-11-06"), commit);
  expect(commit).toHaveBeenCalledTimes(1);
});
