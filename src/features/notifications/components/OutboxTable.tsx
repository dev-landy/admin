"use client";

import type { ListSortControl } from "@/lib/navigation/useListSort";

import { useRef, useState } from "react";
import Link from "next/link";
import { App, Button, Descriptions, Drawer, Input, Select, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";

import { formatDateTime } from "@/lib/format/date";
import { PagedTable } from "@/components/PagedTable";
import { listDetailPath, relatedListPath } from "@/lib/navigation/listReturn";
import { useAdminViewport } from "@/components/useAdminViewport";
import { RecordCard } from "@/components/RecordCard";
import { EntityCell } from "@/components/EntityCell";
import { RowActions } from "@/components/RowActions";
import { IdFilterDropdown } from "@/components/IdFilterDropdown";
import { parseProblemDetail } from "@/lib/api/problem";
import { useRequeueOutbox } from "../hooks";
import { OUTBOX_STATUS_OPTIONS } from "../presentation";
import type { OutboxEvent, OutboxListParams, OutboxStatus } from "../types";

const OUTBOX_COLUMN_SIZING = {
  recipient: { min: 320, preferred: 540, grow: 2 },
  device: { min: 190 },
  status: { min: 190 },
  times: { min: 240, preferred: 280, grow: 0.5 },
  error: { min: 240, preferred: 420, grow: 1 },
  actions: { min: 144 },
  state: { min: 250, preferred: 390, grow: 1 },
} as const;

const STATUS_COLOR: Record<OutboxStatus, string> = { PENDING: "blue", SENDING: "processing", SENT: "green", FAILED: "red", SKIPPED: "orange" };
function outboxStatusLabel(status: OutboxStatus): string {
  return OUTBOX_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

type Props = {
  sortControl?: ListSortControl;
  returnPath?: string;
  data: OutboxEvent[]; loading: boolean; disabled?: boolean; page: number; pageSize: number; total: number;
  onPageChange: (p: number, s: number) => void;
  filters: Omit<OutboxListParams, "page" | "size">;
  onFilterChange: (key: string, value: string | number | undefined) => void;
};

export function OutboxTable({ sortControl, returnPath: sourceReturnPath, data, loading, disabled = false, page, pageSize, total, onPageChange, filters, onFilterChange }: Props) {
  const { notification } = App.useApp();
  const { mutateAsync: requeue } = useRequeueOutbox();
  const inFlight = useRef(new Set<number>());
  const [pendingIds, setPendingIds] = useState<ReadonlySet<number>>(new Set());
  const viewport = useAdminViewport();
  const [selected, setSelected] = useState<OutboxEvent | null>(null);

  async function requeueEvent(record: OutboxEvent) {
    const id = record.notificationOutboxEventId;
    if (disabled || inFlight.current.has(id) || (record.status !== "FAILED" && record.status !== "SKIPPED")) return;
    inFlight.current.add(id);
    setPendingIds(new Set(inFlight.current));
    try {
      // The hook awaits its settled list refresh, so another attempt cannot race it.
      await requeue(id);
      notification.success({ title: "재시도 큐에 추가되었습니다.", description: "즉시 발송하려면 수동 Dispatch를 실행하세요. 대상일이 지난 예약 알림은 다시 건너뜁니다." });
    } catch (error) {
      const problem = parseProblemDetail(error);
      notification.error({ title: problem?.title ?? "Requeue 실패", description: problem?.detail });
    } finally {
      inFlight.current.delete(id);
      setPendingIds(new Set(inFlight.current));
    }
  }

  const returnParams = new URLSearchParams({ page: String(page), size: String(pageSize) });
  for (const [key, value] of Object.entries(filters)) if (value !== undefined) returnParams.set(key, String(value));
  const returnPath = sourceReturnPath ?? "/notifications/outbox?" + returnParams.toString();

  const renderActions = (record: OutboxEvent) => {
    const pending = pendingIds.has(record.notificationOutboxEventId);
    const allowed = record.status === "FAILED" || record.status === "SKIPPED";
    return <RowActions subject={`Outbox #${record.notificationOutboxEventId}`} loading={pending} disabled={pending || disabled}
      primary={<Button size="small" onClick={() => setSelected(record)}>상세</Button>}
      items={[{ key: "requeue", label: allowed ? "Requeue" : "Requeue · 실패/건너뜀만 가능", disabled: pending || !allowed, onClick: () => requeueEvent(record) },
        { key: "notification", label: "인앱 알림 보기", href: relatedListPath("/notifications", { notificationId: record.notificationId }, returnPath) }]} />;
  };
  const renderDetails = (record: OutboxEvent) => <Descriptions size="small" column={1} layout="vertical" items={[
    { key: "ids", label: "식별자", children: `이벤트 #${record.notificationOutboxEventId} · 알림 #${record.notificationId} · 유저 #${record.userId}` },
    { key: "target", label: "업무 대상일", children: record.targetDate ?? "-" },
    { key: "device", label: "기기 토큰", children: `#${record.fcmTokenId} · ${record.tokenValue}` },
    { key: "userPhone", label: "수신 유저 연락처", children: record.userPhone ?? "-" },
    { key: "tenantPhone", label: "임차인 연락처", children: record.tenantPhone ?? "-" },
    { key: "statusCode", label: "상태 코드", children: record.status },
    { key: "attempts", label: "시도 횟수", children: record.attempts },
    { key: "error", label: "실패 원인", children: [record.lastErrorCode, record.lastErrorMessage].filter(Boolean).join(" · ") || "없음" },
  ]} />;
  const columns: TableColumnsType<OutboxEvent> = [
    {
      title: "발송 대상", key: "recipient", width: 320,
      filteredValue: filters.userId === undefined ? null : [filters.userId],
      filterDropdown: () => <IdFilterDropdown key={filters.userId ?? "all"} value={filters.userId} placeholder="유저 ID" onApply={(value) => onFilterChange("userId", value)} />,
      render: (_, record) => <EntityCell primary={record.notificationTitle || `알림 #${record.notificationId}`}
        secondary={<Link href={listDetailPath("/users", record.userId, returnPath)}>{record.userEmail || `유저 #${record.userId}`}</Link>} meta={[record.tenantName, record.propertyName, record.roomNumber, record.targetDate ? `대상일 ${record.targetDate}` : undefined, `알림 #${record.notificationId} · 이벤트 #${record.notificationOutboxEventId}`].filter(Boolean).join(" · ")} />,
    },
    {
      title: "기기", key: "device", width: 190,
      render: (_, record) => <EntityCell primary={`토큰 #${record.fcmTokenId}`} secondary={<Typography.Text code>{record.tokenValue}</Typography.Text>} meta="마스킹된 토큰" />,
    },
    {
      title: "상태", dataIndex: "status", width: 190,
      filteredValue: filters.status ? [filters.status] : null,
      filterDropdown: () => <div style={{ padding: 8 }}><Select allowClear aria-label="대기열 상태 필터" placeholder="전체" value={filters.status}
        style={{ width: 160 }} onChange={(value) => onFilterChange("status", value)} options={OUTBOX_STATUS_OPTIONS} /></div>,
      render: (value: OutboxStatus, record) => <EntityCell primary={<Tag color={STATUS_COLOR[value]}>{outboxStatusLabel(value)}</Tag>} secondary={`시도 ${record.attempts}회`} />,
    },
    {
      title: "처리 시각", key: "times", width: 240,
      render: (_, record) => <EntityCell primary={<span title={record.lastAttemptedAt ?? undefined}>마지막 시도 {formatDateTime(record.lastAttemptedAt)}</span>}
        secondary={<span title={record.sentAt ?? undefined}>발송 {formatDateTime(record.sentAt)}</span>} />,
    },
    {
      title: "오류", key: "error", width: 240,
      filteredValue: filters.errorCode ? [filters.errorCode] : null,
      filterDropdown: () => <div style={{ padding: 8 }}><Input.Search key={filters.errorCode ?? "all"} allowClear defaultValue={filters.errorCode}
        aria-label="에러 코드 필터" placeholder="에러 코드 정확 일치" onSearch={(value) => onFilterChange("errorCode", value.trim() || undefined)} /></div>,
      render: (_, record) => <EntityCell primary={record.lastErrorCode ?? "오류 코드 없음"} secondary={record.lastErrorMessage} />,
    },
    {
      title: "작업", key: "actions", width: 144, fixed: "right",
      render: (_, record) => renderActions(record),
    },
  ];

  const compactColumns: TableColumnsType<OutboxEvent> = [
    { title: "발송 대상", key: "recipient", width: 320, render: (_, record) => <EntityCell primary={record.notificationTitle || `알림 #${record.notificationId}`}
      secondary={<Link href={listDetailPath("/users", record.userId, returnPath)}>{record.userEmail || `유저 #${record.userId}`}</Link>} meta={[record.tenantName, record.propertyName, record.roomNumber].filter(Boolean).join(" · ")} /> },
    { title: "결과 · 실제 시각", key: "state", width: 250, render: (_, record) => <EntityCell primary={<Tag color={STATUS_COLOR[record.status]}>{outboxStatusLabel(record.status)}</Tag>}
      secondary={`발송 ${formatDateTime(record.sentAt)}`} meta={`마지막 시도 ${formatDateTime(record.lastAttemptedAt)}`} /> },
    { title: "작업", key: "actions", width: 144, render: (_, record) => renderActions(record) },
  ];

  return <>
    <PagedTable sortControl={sortControl} columns={columns} compactColumns={compactColumns} columnSizing={OUTBOX_COLUMN_SIZING} renderCompactDetails={renderDetails}
      renderCard={(record) => <RecordCard title={record.notificationTitle || `알림 #${record.notificationId}`} subtitle={<Link href={listDetailPath("/users", record.userId, returnPath)}>{record.userEmail || `유저 #${record.userId}`}</Link>}
        meta={<Tag color={STATUS_COLOR[record.status]}>{outboxStatusLabel(record.status)}</Tag>} ariaLabel={`Outbox #${record.notificationOutboxEventId}`} fields={[
          { label: "수신 유저 연락처", value: record.userPhone ?? "-" },
          { label: "임차인 · 건물 · 호실", value: [record.tenantName, record.propertyName, record.roomNumber].filter(Boolean).join(" · ") || "-" },
          { label: "업무 대상일", value: record.targetDate ?? "-" },
          { label: "실제 푸시 발송", value: formatDateTime(record.sentAt) },
          { label: "마지막 시도", value: formatDateTime(record.lastAttemptedAt) },
          { label: "실패 원인", value: record.lastErrorCode ?? "없음" },
        ]} actions={renderActions(record)} details={renderDetails(record)} />} dataSource={data} loading={loading} page={page} pageSize={pageSize} total={total} onPageChange={onPageChange}
      emptyText={Object.values(filters).some((value) => value !== undefined) ? "조건에 맞는 발송 대기열이 없습니다. 필터를 초기화해 전체 내역을 확인하세요." : "등록된 푸시 발송 대기열이 없습니다."}
      ariaLabel="알림 발송 대기열" rowKey={(record) => String(record.notificationOutboxEventId)} />
    <Drawer title={selected ? `Outbox #${selected.notificationOutboxEventId}` : "발송 기록"} open={selected !== null} onClose={() => setSelected(null)} size="min(560px, 100vw)" destroyOnHidden>
      {selected && <Descriptions layout={viewport === "mobile" ? "vertical" : "horizontal"} column={1} bordered size="small" items={[
        { key: "notification", label: "알림", children: `#${selected.notificationId}` },
        { key: "user", label: "유저", children: selected.userEmail ? `${selected.userEmail} · #${selected.userId}` : `#${selected.userId}` },
        { key: "recipient", label: "임차인 · 건물 · 호실", children: [selected.tenantName, selected.propertyName, selected.roomNumber].filter(Boolean).join(" · ") || "-" },
        { key: "target", label: "업무 대상일", children: selected.targetDate ?? "-" },
        { key: "token", label: "기기 토큰", children: `#${selected.fcmTokenId} · ${selected.tokenValue}` },
        { key: "status", label: "상태", children: outboxStatusLabel(selected.status) },
        { key: "attempts", label: "시도 횟수", children: selected.attempts },
        { key: "attempted", label: "마지막 시도", children: formatDateTime(selected.lastAttemptedAt) },
        { key: "sent", label: "발송 시각", children: formatDateTime(selected.sentAt) },
        { key: "errorCode", label: "에러 코드", children: selected.lastErrorCode ?? "-" },
        { key: "errorMessage", label: "에러 메시지", children: selected.lastErrorMessage ?? "-" },
      ]} />}
    </Drawer>
  </>;
}
