"use client";

import { useState } from "react";
import { Button, DatePicker, Space } from "antd";
import dayjs, { type Dayjs } from "dayjs";

type Props = {
  value?: string;
  onApply: (value: string | undefined) => void;
};

export function DateFilterDropdown({ value, onApply }: Props) {
  const [draft, setDraft] = useState<Dayjs | null>(value ? dayjs(value) : null);

  return (
    <Space direction="vertical" style={{ padding: 8 }}>
      <DatePicker
        value={draft}
        format="YYYY-MM-DD"
        onChange={setDraft}
        placeholder="날짜 선택"
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
