"use client";

import { useState } from "react";
import { Button, InputNumber, Space } from "antd";

type Props = {
  value?: number;
  placeholder: string;
  onApply: (value: number | undefined) => void;
};

export function IdFilterDropdown({ value, placeholder, onApply }: Props) {
  const [draft, setDraft] = useState<number | undefined>(value);

  return (
    <Space direction="vertical" style={{ padding: 8 }}>
      <InputNumber<number>
        min={1}
        precision={0}
        placeholder={placeholder}
        value={draft}
        onChange={(next) => setDraft(next ?? undefined)}
        onPressEnter={() => onApply(draft)}
      />
      <Space>
        <Button type="primary" size="small" onClick={() => onApply(draft)}>
          적용
        </Button>
        <Button
          size="small"
          onClick={() => {
            setDraft(undefined);
            onApply(undefined);
          }}
        >
          초기화
        </Button>
      </Space>
    </Space>
  );
}
