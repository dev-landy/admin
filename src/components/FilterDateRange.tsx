"use client";

import { DatePicker, type FormInstance } from "antd";
import type { ComponentProps } from "react";
import { commitDateRangeInput } from "@/components/date-input";

type Props = {
  form: FormInstance;
  name: string;
  value?: ComponentProps<typeof DatePicker.RangePicker>["value"];
  onChange?: ComponentProps<typeof DatePicker.RangePicker>["onChange"];
  id?: string;
};

/** 한쪽 날짜만 지정해도 blur 직후 조회에 확정한 날짜를 전달한다. */
export function FilterDateRange({ form, name, ...props }: Props) {
  return <DatePicker.RangePicker
    {...props} allowEmpty={[true, true]} format="YYYY-MM-DD" style={{ width: "100%" }}
    onBlur={(event, info) => commitDateRangeInput(event.target, info.range, form.getFieldValue(name), (dates) => form.setFieldValue(name, dates))}
  />;
}
