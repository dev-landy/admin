"use client";

import { Select, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { PagedTable } from "@/components/PagedTable";
import type { Notification, NotificationType } from "../types";

type Props = {
  data: Notification[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number, s: number) => void;
  filters: { type?: NotificationType; isRead?: boolean };
  onFilterChange: (key: string, value: string | boolean | undefined) => void;
};

export function NotificationTable({ data, loading, page, pageSize, total, onPageChange, filters, onFilterChange }: Props) {
  const columns: TableColumnsType<Notification> = [
    { title: "ID", dataIndex: "notificationId", width: 80 },
    { title: "유저 ID", dataIndex: "userId", width: 90 },
    { title: "임차인 ID", dataIndex: "tenantId", width: 100 },
    { title: "제목", dataIndex: "title" },
    {
      title: "유형",
      dataIndex: "type",
      width: 100,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            placeholder="전체"
            value={filters.type}
            style={{ width: 130 }}
            onChange={(v) => onFilterChange("type", v)}
            options={[
              { label: "납부일", value: "DUE" },
              { label: "연체", value: "OVERDUE" },
              { label: "커스텀", value: "CUSTOM" },
            ]}
          />
        </div>
      ),
      render: (v: NotificationType) => {
        const color = v === "OVERDUE" ? "red" : v === "CUSTOM" ? "purple" : "blue";
        return <Tag color={color}>{v}</Tag>;
      },
    },
    { title: "대상일", dataIndex: "targetDate", width: 110 },
    { title: "발송일", dataIndex: "sentAt", width: 180 },
    {
      title: "읽음",
      dataIndex: "isRead",
      width: 80,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            placeholder="전체"
            value={filters.isRead}
            style={{ width: 120 }}
            onChange={(v) => onFilterChange("isRead", v)}
            options={[{ label: "읽음", value: true }, { label: "미읽음", value: false }]}
          />
        </div>
      ),
      render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "읽음" : "미읽음"}</Tag>,
    },
  ];

  return (
    <PagedTable
      columns={columns}
      dataSource={data}
      loading={loading}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      rowKey={(r) => String(r.notificationId)}
    />
  );
}
