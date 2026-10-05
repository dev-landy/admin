"use client";

import type { ReactNode } from "react";
import { Button, Tag, Typography } from "antd";
import { ClearOutlined, CloseOutlined } from "@ant-design/icons";

type Props = {
  filters: { label: string; value: ReactNode; onRemove?: () => void }[];
  onReset: () => void;
};

export function FilterSummary({ filters, onReset }: Props) {
  if (!filters.length) return null;
  return (
    <div className="admin-filter-summary" role="status" aria-label="적용한 필터">
      <Typography.Text type="secondary">적용한 필터</Typography.Text>
      {filters.map(({ label, value, onRemove }) => <Tag key={label} closeIcon={onRemove ? <CloseOutlined aria-label={`${label} 조건 해제`} /> : false} onClose={(event) => { event.preventDefault(); onRemove?.(); }}>{label}: {value}</Tag>)}
      <Button icon={<ClearOutlined />} onClick={onReset}>필터 초기화</Button>
    </div>
  );
}
