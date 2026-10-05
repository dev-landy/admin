"use client";

import { Button, Space } from "antd";

export function FilterQuickViews({ views }: { views: { label: string; onClick: () => void; active?: boolean }[] }) {
  return <Space wrap className="admin-quick-views" style={{ marginBottom: 12 }} aria-label="자주 쓰는 조회 조건">
    {views.map(({ label, onClick, active }) => <Button key={label} size="small" aria-pressed={Boolean(active)} type={active ? "primary" : "default"} onClick={onClick}>{label}</Button>)}
  </Space>;
}
