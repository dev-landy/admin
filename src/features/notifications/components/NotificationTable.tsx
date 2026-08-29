"use client";

import { useState } from "react";
import { Descriptions, Drawer, Select, Tag, Typography } from "antd";
import type { DescriptionsProps, TableColumnsType } from "antd";

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

function notificationTypeColor(type: NotificationType): string {
  if (type === "OVERDUE") return "red";
  if (type === "CUSTOM") return "purple";
  if (type === "PAYMENT_RECORDED") return "green";
  return "blue";
}

export function NotificationTable({
  data,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  filters,
  onFilterChange,
}: Props) {
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const columns: TableColumnsType<Notification> = [
    { title: "알림 ID", dataIndex: "notificationId", width: 90 },
    { title: "유저 ID", dataIndex: "userId", width: 90 },
    { title: "임차인 ID", dataIndex: "tenantId", width: 120, render: (value: number | null) => value ?? "-" },
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
              { label: "납부 확인", value: "PAYMENT_RECORDED" },
            ]}
          />
        </div>
      ),
      render: (v: NotificationType) => <Tag color={notificationTypeColor(v)}>{v}</Tag>,
    },
    { title: "대상일", dataIndex: "targetDate", width: 110 },
    {
      title: "발송/생성일",
      key: "sentOrCreatedAt",
      width: 180,
      render: (_, record) => record.sentAt ?? record.createdAt ?? "-",
    },
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

  const detailItems: DescriptionsProps["items"] = selectedNotification
    ? [
        { key: "userId", label: "유저 ID", children: selectedNotification.userId },
        { key: "tenantId", label: "임차인 ID", children: selectedNotification.tenantId ?? "-" },
        {
          key: "type",
          label: "유형",
          children: <Tag color={notificationTypeColor(selectedNotification.type)}>{selectedNotification.type}</Tag>,
        },
        {
          key: "isRead",
          label: "읽음 상태",
          children: (
            <Tag color={selectedNotification.isRead ? "green" : "default"}>
              {selectedNotification.isRead ? "읽음" : "미읽음"}
            </Tag>
          ),
        },
        { key: "title", label: "제목", children: selectedNotification.title },
        {
          key: "content",
          label: "본문",
          children: (
            <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
              {selectedNotification.content ?? (
                <Typography.Text type="secondary">본문 정보가 제공되지 않았습니다.</Typography.Text>
              )}
            </Typography.Paragraph>
          ),
        },
        { key: "targetDate", label: "대상일", children: selectedNotification.targetDate },
        { key: "sentAt", label: "발송일", children: selectedNotification.sentAt ?? "-" },
        { key: "createdAt", label: "생성일", children: selectedNotification.createdAt ?? "-" },
      ]
    : [];

  return (
    <>
      <PagedTable
        columns={columns}
        dataSource={data}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        rowKey={(r) => String(r.notificationId)}
        onRow={(record) => ({
          "aria-label": `알림 #${record.notificationId} 상세 보기`,
          onClick: () => setSelectedNotification(record),
          onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setSelectedNotification(record);
            }
          },
          style: { cursor: "pointer" },
          tabIndex: 0,
        })}
      />
      <Drawer
        title={selectedNotification ? `알림 #${selectedNotification.notificationId}` : "알림 상세"}
        open={selectedNotification !== null}
        onClose={() => setSelectedNotification(null)}
        size={520}
        destroyOnHidden
      >
        <Descriptions bordered column={1} size="small" items={detailItems} />
      </Drawer>
    </>
  );
}
