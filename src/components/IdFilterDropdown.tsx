"use client";

import { useState } from "react";
import { Button, InputNumber, Space, Typography } from "antd";

type Props = {
  value?: number;
  placeholder: string;
  onApply: (value: number | undefined) => void;
};

export function IdFilterDropdown({ value, placeholder, onApply }: Props) {
  return <IdFilterDraft key={value ?? "empty"} value={value} placeholder={placeholder} onApply={onApply} />;
}

function IdFilterDraft({ value, placeholder, onApply }: Props) {
  const [draft, setDraft] = useState<number | undefined>(value);
  const [rawInvalid, setRawInvalid] = useState(false);
  const isValid = !rawInvalid && (draft === undefined || (Number.isSafeInteger(draft) && draft > 0));

  return (
    <Space orientation="vertical" style={{ padding: 12 }}>
      <InputNumber<number>
        min={1}
        precision={0}
        placeholder={placeholder}
        aria-label={placeholder}
        value={draft}
        onChange={(next) => { setDraft(next ?? undefined); setRawInvalid(false); }}
        onInput={(text) => setRawInvalid(text !== "" && (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text) < 1))}
        onBlur={() => setRawInvalid(false)}
        aria-invalid={!isValid}
        onPressEnter={(event) => {
          const text = (event.target as HTMLInputElement).value;
          if (text === "") onApply(undefined);
          else if (/^\d+$/.test(text) && Number.isSafeInteger(Number(text)) && Number(text) > 0) onApply(Number(text));
          setRawInvalid(false);
        }}
      />
      {!isValid && <Typography.Text type="danger">ID는 1 이상의 정수로 입력해 주세요.</Typography.Text>}
      <Space>
        <Button type="primary" size="small" disabled={!isValid} onClick={() => onApply(draft)}>
          적용
        </Button>
        <Button
          size="small"
          onClick={() => {
            setDraft(undefined);
            setRawInvalid(false);
            onApply(undefined);
          }}
        >
          초기화
        </Button>
      </Space>
    </Space>
  );
}
