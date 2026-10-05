"use client";

import type { ListSortControl } from "@/lib/navigation/useListSort";

import { useState } from "react";
import Link from "next/link";
import { Button, Descriptions, Drawer, Select, Tag, Typography } from "antd";
import type { DescriptionsProps, TableColumnsType } from "antd";

import { formatDateTime, formatTechnicalDateTime } from "@/lib/format/date";
import { listDetailPath, relatedListPath } from "@/lib/navigation/listReturn";
import { useAdminViewport } from "@/components/useAdminViewport";
import { RecordCard } from "@/components/RecordCard";
import { EntityCell } from "@/components/EntityCell";
import { RowActions } from "@/components/RowActions";
import { PagedTable } from "@/components/PagedTable";
import { IdFilterDropdown } from "@/components/IdFilterDropdown";
import { NOTIFICATION_TYPE_OPTIONS } from "../presentation";
import type { Notification, NotificationType } from "../types";

const NOTIFICATION_COLUMN_SIZING = {
  notification: { min: 280, preferred: 460, grow: 1 },
  recipient: { min: 340, preferred: 600, grow: 2 },
  isRead: { min: 110 },
  dates: { min: 220, preferred: 260, grow: 0.5 },
  actions: { min: 144 },
  summary: { min: 360, preferred: 660, grow: 2 },
  state: { min: 240, preferred: 360, grow: 1 },
} as const;

type Props = {
  sortControl?: ListSortControl;
  returnPath?: string;
  data: Notification[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number, s: number) => void;
  filters: { userId?: number; type?: NotificationType; isRead?: boolean };
  onFilterChange: (key: string, value: string | number | boolean | undefined) => void;
};

function roomLabel(room: string | null | undefined): string | undefined {
  return room ? `${room.replace(/호$/, "")}호` : undefined;
}

function notificationTypeColor(type: NotificationType): string {
  if (type === "OVERDUE" || type === "CONTRACT_FAILED") return "red";
  if (type === "CUSTOM") return "purple";
  if (type === "PAYMENT_RECORDED" || type === "CONTRACT_REGISTERED") return "green";
  if (type === "CONTRACT_EXPIRING") return "orange";
  return "blue";
}

export function NotificationTable({ sortControl, returnPath: sourceReturnPath,
  data,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  filters,
  onFilterChange,
}: Props) {
  const viewport = useAdminViewport();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const returnParams = new URLSearchParams({ page: String(page), size: String(pageSize) });
  for (const [key, value] of Object.entries(filters)) if (value !== undefined) returnParams.set(key, String(value));
  const returnPath = sourceReturnPath ?? "/notifications?" + returnParams.toString();

  const renderActions = (record: Notification) => <RowActions subject={`알림 #${record.notificationId}`}
    primary={<Button size="small" onClick={() => setSelectedNotification(record)}>보기</Button>}
    items={[{ key: "outbox", label: "이 알림의 발송 대기열", href: relatedListPath("/notifications/outbox", { notificationId: record.notificationId }, returnPath) }]} />;
  const renderDetails = (record: Notification) => <Descriptions size="small" column={1} layout="vertical" items={[
    { key: "id", label: "식별자", children: `알림 #${record.notificationId} · 유저 #${record.userId} · 임차인 ${record.tenantId ?? "없음"}` },
    { key: "type", label: "알림 유형", children: NOTIFICATION_TYPE_OPTIONS.find((option) => option.value === record.type)?.label ?? record.type },
    { key: "userPhone", label: "수신 유저 연락처", children: record.userPhone ?? "-" },
    { key: "tenantPhone", label: "임차인 연락처", children: record.tenantPhone ?? "-" },
    { key: "body", label: "본문", children: <div style={{ whiteSpace: "pre-wrap" }}>{record.content ?? "본문 정보가 제공되지 않았습니다."}</div> },
    { key: "created", label: "생성일", children: formatTechnicalDateTime(record.createdAt) },
  ]} />;
  const columns: TableColumnsType<Notification> = [
    {
      title: "알림", key: "notification", width: 280,
      filteredValue: filters.type ? [filters.type] : null,
      filterDropdown: () => <div style={{ padding: 8 }}><Select allowClear aria-label="알림 유형 필터"
        placeholder="전체" value={filters.type} style={{ width: 180 }} onChange={(value) => onFilterChange("type", value)} options={NOTIFICATION_TYPE_OPTIONS} /></div>,
      render: (_, record) => <EntityCell primary={record.title}
        secondary={<Tag color={notificationTypeColor(record.type)}>{NOTIFICATION_TYPE_OPTIONS.find((option) => option.value === record.type)?.label ?? record.type}</Tag>}
        meta={`알림 #${record.notificationId}`} />,
    },
    {
      title: "대상", key: "recipient", width: 340,
      filteredValue: filters.userId === undefined ? null : [filters.userId],
      filterDropdown: () => <IdFilterDropdown key={filters.userId ?? "all"} value={filters.userId} placeholder="유저 ID" onApply={(value) => onFilterChange("userId", value)} />,
      render: (_, record) => <EntityCell primary={<Link href={listDetailPath("/users", record.userId, returnPath)} onClick={(event) => event.stopPropagation()}>{record.userEmail || `유저 #${record.userId}`}</Link>}
        secondary={record.userPhone ? `수신 유저 전화 ${record.userPhone}` : undefined}
        meta={record.tenantId === null ? "임차인 연결 없음" : <Link href={listDetailPath("/tenants", record.tenantId, returnPath)} onClick={(event) => event.stopPropagation()}>{record.tenantName || `임차인 #${record.tenantId}`}{record.propertyName || record.roomNumber ? ` · ${[record.propertyName, roomLabel(record.roomNumber)].filter(Boolean).join(" ")}` : ""}</Link>} />,
    },
    {
      title: "읽음 상태", dataIndex: "isRead", width: 110, align: "center",
      filteredValue: filters.isRead === undefined ? null : [filters.isRead],
      filterDropdown: () => <div style={{ padding: 8 }}><Select allowClear aria-label="읽음 상태 필터" placeholder="전체"
        value={filters.isRead === undefined ? undefined : String(filters.isRead)} style={{ width: 120 }}
        onChange={(value) => onFilterChange("isRead", value === undefined ? undefined : value === "true")}
        options={[{ label: "읽음", value: "true" }, { label: "미읽음", value: "false" }]} /></div>,
      render: (value: boolean) => <Tag color={value ? "green" : "default"}>{value ? "읽음" : "미읽음"}</Tag>,
    },
    {
      title: "일정", key: "dates", width: 220,
      render: (_, record) => <EntityCell primary={`대상일 ${record.targetDate}`}
        secondary={<span title={record.sentAt ?? record.createdAt}>{record.sentAt ? "발행" : "생성"} {formatDateTime(record.sentAt ?? record.createdAt)}</span>}
        meta={record.sentAt ? `생성 ${formatDateTime(record.createdAt)}` : undefined} />,
    },
    {
      title: "작업", key: "actions", width: 144, fixed: "right",
      render: (_, record) => renderActions(record),
    },
  ];

  const compactColumns: TableColumnsType<Notification> = [
    { title: "알림 · 대상", key: "summary", width: 360, render: (_, record) => <EntityCell primary={record.title}
      secondary={<Link href={listDetailPath("/users", record.userId, returnPath)} onClick={(event) => event.stopPropagation()}>{record.userEmail || `유저 #${record.userId}`}</Link>} meta={<>{[record.tenantName ? `임차인 ${record.tenantName}` : undefined, record.propertyName, roomLabel(record.roomNumber)].filter(Boolean).join(" · ")}{record.userPhone && <div>수신 유저 연락처 {record.userPhone}</div>}</>} /> },
    { title: "상태 · 일정", key: "state", width: 240, render: (_, record) => <EntityCell
      primary={<Tag color={record.isRead ? "green" : "default"}>{record.isRead ? "읽음" : "미읽음"}</Tag>}
      secondary={`대상일 ${record.targetDate}`} meta={`발행 ${formatDateTime(record.sentAt)}`} /> },
    { title: "작업", key: "actions", width: 144, render: (_, record) => renderActions(record) },
  ];

  const detailItems: DescriptionsProps["items"] = selectedNotification
    ? [
        { key: "userId", label: "유저", children: selectedNotification.userEmail ? `${selectedNotification.userEmail} · #${selectedNotification.userId}` : selectedNotification.userId },
        { key: "userPhone", label: "유저 연락처", children: selectedNotification.userPhone ?? "-" },
        { key: "tenantId", label: "임차인", children: selectedNotification.tenantName ? `${selectedNotification.tenantName} · #${selectedNotification.tenantId}` : selectedNotification.tenantId ?? "-" },
        { key: "building", label: "건물 · 호실", children: [selectedNotification.propertyName, roomLabel(selectedNotification.roomNumber)].filter(Boolean).join(" · ") || "-" },
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
        { key: "sentAt", label: "알림 발행 시각", children: selectedNotification.sentAt ? formatDateTime(selectedNotification.sentAt) : "제공되지 않음" },
        { key: "createdAt", label: "생성일", children: formatTechnicalDateTime(selectedNotification.createdAt) },
      ]
    : [];

  return (
    <>
      <PagedTable sortControl={sortControl}
        columns={columns} compactColumns={compactColumns} columnSizing={NOTIFICATION_COLUMN_SIZING} renderCompactDetails={renderDetails}
        renderCard={(record) => <RecordCard title={record.title}
          subtitle={NOTIFICATION_TYPE_OPTIONS.find((option) => option.value === record.type)?.label ?? record.type}
          meta={<Tag color={record.isRead ? "green" : "default"}>{record.isRead ? "읽음" : "미읽음"}</Tag>}
          ariaLabel={`알림 #${record.notificationId}`} fields={[
            { label: "수신 유저", value: <Link href={listDetailPath("/users", record.userId, returnPath)}>{record.userEmail || `#${record.userId}`}</Link> },
            { label: "수신 유저 연락처", value: record.userPhone ?? "-" },
            { label: "임차인 · 건물 · 호실", value: record.tenantId ? <Link href={listDetailPath("/tenants", record.tenantId, returnPath)}>{[record.tenantName, record.propertyName, roomLabel(record.roomNumber)].filter(Boolean).join(" · ") || `임차인 #${record.tenantId}`}</Link> : "연결 없음" },
            { label: "업무 대상일", value: record.targetDate },
            { label: "알림 발행 시각", value: formatDateTime(record.sentAt) },
          ]} actions={renderActions(record)} details={renderDetails(record)} />}
        dataSource={data}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        emptyText={Object.values(filters).some((value) => value !== undefined) ? "조건에 맞는 알림이 없습니다. 필터를 초기화해 전체 알림을 확인하세요." : "저장된 인앱 알림이 없습니다."}
        ariaLabel="인앱 알림 목록"
        rowKey={(r) => String(r.notificationId)}
        onRow={(record) => ({
          onClick: (event) => { if (event.target instanceof Element && event.target.closest("a, button")) return; setSelectedNotification(record); },
          onKeyDown: (event) => {
            if (event.target !== event.currentTarget) return;
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
        size="min(520px, 100vw)"
        destroyOnHidden
      >
        <Descriptions bordered layout={viewport === "mobile" ? "vertical" : "horizontal"} column={1} size="small" items={detailItems} />
      </Drawer>
    </>
  );
}
