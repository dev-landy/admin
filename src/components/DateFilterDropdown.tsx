"use client";

import { useState } from "react";
import { Button, DatePicker, Space } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { commitDateInput } from "./date-input";

type Props = {
  value?: string;
  onApply: (value: string | undefined) => void;
};

export function DateFilterDropdown({ value, onApply }: Props) {
  return <DateFilterDraft key={value ?? "empty"} value={value} onApply={onApply} />;
}

function DateFilterDraft({ value, onApply }: Props) {
  const [draft, setDraft] = useState<Dayjs | null>(value ? dayjs(value) : null);

  return (
    <Space orientation="vertical" style={{ padding: 12 }}>
      <DatePicker
        value={draft}
        format="YYYY-MM-DD"
        onChange={setDraft}
        onBlur={(event) => commitDateInput(event.target, ["YYYY-MM-DD"], draft, setDraft)}
        placeholder="날짜 선택"
        aria-label="필터 날짜"
      />
      <Space>
        <Button
          type="primary"
          size="small"
          onClick={() => onApply(draft?.format("YYYY-MM-DD"))}
        >
          적용
        </Button>
        <Button
          size="small"
          onClick={() => {
            setDraft(null);
            onApply(undefined);
          }}
        >
          초기화
        </Button>
      </Space>
    </Space>
  );
}
