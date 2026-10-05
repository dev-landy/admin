"use client";

import type { ListSortControl } from "@/lib/navigation/useListSort";

import { useState } from "react";
import Link from "next/link";
import { Button, Descriptions, Drawer, Select, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";

import { DateFilterDropdown } from "@/components/DateFilterDropdown";
import { IdFilterDropdown } from "@/components/IdFilterDropdown";
import { listDetailPath } from "@/lib/navigation/listReturn";
import { useAdminViewport } from "@/components/useAdminViewport";
import { RecordCard } from "@/components/RecordCard";
import { EntityCell } from "@/components/EntityCell";
import { RowActions } from "@/components/RowActions";
import { PagedTable } from "@/components/PagedTable";
import { formatSeconds, formatYearMonth } from "@/lib/format/date";
import { formatManwon } from "@/lib/format/currency";
import {
  ALIMTALK_STATUS_OPTIONS,
  ALIMTALK_STATUS_PRESENTATION,
  ALIMTALK_TRIGGER_OPTIONS,
  ALIMTALK_TRIGGER_PRESENTATION,
  ALIMTALK_TYPE_OPTIONS,
  ALIMTALK_TYPE_PRESENTATION,
} from "../presentation";
import type { AlimtalkStatus, AlimtalkSummary, AlimtalkTrigger, AlimtalkType } from "../types";
import { AlimtalkResolutionModal } from "./AlimtalkResolutionModal";

const { Text } = Typography;

const ALIMTALK_COLUMN_SIZING = {
  send: { min: 220 },
  recipient: { min: 320, preferred: 540, grow: 2 },
  result: { min: 280, preferred: 440, grow: 1 },
  billing: { min: 220 },
  times: { min: 240, preferred: 280, grow: 0.5 },
  actions: { min: 144 },
} as const;

export type AlimtalkHistoryFilters = {
  userId?: number;
  tenantId?: number;
  type?: AlimtalkType;
  triggerSource?: AlimtalkTrigger;
  status?: AlimtalkStatus;
  from?: string;
  to?: string;
};

type Props = {
  sortControl?: ListSortControl;
  returnPath?: string;
  data: AlimtalkSummary[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number, s: number) => void;
  filters: AlimtalkHistoryFilters;
  onFilterChange: (key: string, value: string | number | undefined) => void;
};

function selectFilter<T extends string>(
  value: T | undefined,
  options: { label: string; value: T }[],
  onChange: (next: T | undefined) => void,
) {
  return (
    <div style={{ padding: 8 }}>
      <Select
        allowClear
        placeholder="전체"
        value={value}
        style={{ width: 150 }}
        onChange={(next) => onChange(next ?? undefined)}
        options={options}
      />
    </div>
  );
}

export function AlimtalkHistoryTable({ sortControl, returnPath: sourceReturnPath,
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
  const [selected, setSelected] = useState<AlimtalkSummary | null>(null);
  const [resolving, setResolving] = useState<AlimtalkSummary | null>(null);
  const returnParams = new URLSearchParams({ page: String(page), size: String(pageSize) });
  for (const [key, value] of Object.entries(filters)) if (value !== undefined) returnParams.set(key, String(value));
  returnParams.set("tab", "history");
  const returnPath = sourceReturnPath ?? "/alimtalk?" + returnParams.toString();

  const renderActions = (record: AlimtalkSummary) => <RowActions subject={`알림톡 #${record.alimtalkId}`}
    primary={<Button size="small" onClick={() => setSelected(record)}>상세</Button>}
    items={[{ key: "resolve", label: record.status === "READY" || record.status === "PENDING" ? "미결 종결" : "미결 종결 · 제출 전/결과 대기만 가능", disabled: record.status !== "READY" && record.status !== "PENDING",
      onClick: () => { if (record.status === "READY" || record.status === "PENDING") setResolving(record); } }]} />;
  const renderDetails = (record: AlimtalkSummary) => <Descriptions size="small" column={1} layout="vertical" items={[
    { key: "ids", label: "식별자", children: `알림톡 #${record.alimtalkId} · ${record.recipientType} #${record.recipientId} · 요청 유저 #${record.userId}` },
    { key: "type", label: "발송 목적", children: ALIMTALK_TYPE_PRESENTATION[record.type].label },
    { key: "trigger", label: "발동 경로", children: ALIMTALK_TRIGGER_PRESENTATION[record.triggerSource].label },
    { key: "amount", label: "청구 금액 · 귀속월", children: `${formatManwon(record.amount)} · ${formatYearMonth(record.billingMonth)}` },
    { key: "message", label: "공급자 메시지 ID", children: record.messageId ? <Text code copyable>{record.messageId}</Text> : "-" },
    { key: "provider", label: "공급자 결과 코드", children: record.providerCode ?? "-" },
    { key: "updated", label: "갱신일", children: formatSeconds(record.updatedAt) },
  ]} />;
  const columns: TableColumnsType<AlimtalkSummary> = [
    {
      title: "발송", key: "send", width: 220,
      filteredValue: filters.type || filters.triggerSource ? [filters.type ?? "", filters.triggerSource ?? ""] : null,
      filterDropdown: () => <div><Text type="secondary">종류</Text>{selectFilter(filters.type, ALIMTALK_TYPE_OPTIONS, (value) => onFilterChange("type", value))}
        <Text type="secondary">발동 경로</Text>{selectFilter(filters.triggerSource, ALIMTALK_TRIGGER_OPTIONS, (value) => onFilterChange("triggerSource", value))}</div>,
      render: (_, record) => <EntityCell primary={<Tag color={ALIMTALK_TYPE_PRESENTATION[record.type].color}>{ALIMTALK_TYPE_PRESENTATION[record.type].label}</Tag>}
        secondary={<Tag color={ALIMTALK_TRIGGER_PRESENTATION[record.triggerSource].color}>{ALIMTALK_TRIGGER_PRESENTATION[record.triggerSource].label}</Tag>}
        meta={<>발송 #<span>{record.alimtalkId}</span></>} />,
    },
    {
      title: "수신 대상 · 현재 정보", key: "recipient", width: 320,
      filteredValue: filters.userId || filters.tenantId ? [filters.userId ?? "", filters.tenantId ?? ""] : null,
      filterDropdown: () => <div><IdFilterDropdown value={filters.userId} placeholder="유저 ID" onApply={(value) => onFilterChange("userId", value)} />
        <IdFilterDropdown value={filters.tenantId} placeholder="임차인 ID" onApply={(value) => onFilterChange("tenantId", value)} /></div>,
      render: (_, record) => <EntityCell primary={<Link href={listDetailPath(record.recipientType === "TENANT" ? "/tenants" : "/users", record.recipientId, returnPath)}>{record.recipientType === "TENANT" ? record.tenantName || `임차인 #${record.recipientId}` : record.recipientEmail || `유저 #${record.recipientId}`}</Link>}
        secondary={[record.propertyName, record.roomNumber, record.recipientPhone].filter(Boolean).join(" · ") || undefined}
        meta={`요청 유저 ${record.userEmail || `#${record.userId}`}`} />,
    },
    {
      title: "결과", key: "result", width: 280,
      filteredValue: filters.status === undefined ? null : [filters.status],
      filterDropdown: () => selectFilter(filters.status, ALIMTALK_STATUS_OPTIONS, (value) => onFilterChange("status", value)),
      render: (_, record) => <EntityCell primary={<Tag color={ALIMTALK_STATUS_PRESENTATION[record.status].color}>{ALIMTALK_STATUS_PRESENTATION[record.status].label}</Tag>}
        secondary={record.providerCode} meta={record.messageId ? <Text code copyable>{record.messageId}</Text> : "메시지 ID 없음"} />,
    },
    {
      title: "청구 대상", key: "billing", width: 220,
      filteredValue: filters.from || filters.to ? [filters.from ?? "", filters.to ?? ""] : null,
      filterDropdown: () => <div><Text type="secondary">대상 시작일</Text><DateFilterDropdown value={filters.from} onApply={(value) => onFilterChange("from", value)} />
        <Text type="secondary">대상 종료일</Text><DateFilterDropdown value={filters.to} onApply={(value) => onFilterChange("to", value)} /></div>,
      render: (_, record) => <EntityCell primary={`대상일 ${record.targetDate}`} secondary={`귀속월 ${formatYearMonth(record.billingMonth)}`} meta={formatManwon(record.amount)} />,
    },
    {
      title: "처리 시각", key: "times", width: 240,
      render: (_, record) => <EntityCell primary={`요청 ${formatSeconds(record.requestedAt)}`} secondary={`갱신 ${formatSeconds(record.updatedAt)}`} />,
    },
    {
      title: "작업", key: "actions", width: 144, fixed: "right",
      render: (_, record) => renderActions(record),
    },
  ];

  const compactColumns: TableColumnsType<AlimtalkSummary> = [
    { title: "알림톡 · 현재 대상", key: "recipient", width: 320, render: (_, record) => <EntityCell primary={<Link href={listDetailPath(record.recipientType === "TENANT" ? "/tenants" : "/users", record.recipientId, returnPath)}>{record.recipientType === "TENANT" ? record.tenantName || `임차인 #${record.recipientId}` : record.recipientEmail || `유저 #${record.recipientId}`}</Link>}
      secondary={[record.propertyName, record.roomNumber, record.recipientPhone].filter(Boolean).join(" · ")} meta={ALIMTALK_TYPE_PRESENTATION[record.type].label} /> },
    { title: "결과 · 일정", key: "result", width: 280, render: (_, record) => <EntityCell primary={<Tag color={ALIMTALK_STATUS_PRESENTATION[record.status].color}>{ALIMTALK_STATUS_PRESENTATION[record.status].label}</Tag>}
      secondary={`대상일 ${record.targetDate}`} meta={`요청 ${formatSeconds(record.requestedAt)}`} /> },
    { title: "작업", key: "actions", width: 144, render: (_, record) => renderActions(record) },
  ];

  return (
    <>
      <PagedTable sortControl={sortControl}
        columns={columns} compactColumns={compactColumns} columnSizing={ALIMTALK_COLUMN_SIZING} renderCompactDetails={renderDetails}
        renderCard={(record) => <RecordCard title={ALIMTALK_TYPE_PRESENTATION[record.type].label}
          subtitle={<Link href={listDetailPath(record.recipientType === "TENANT" ? "/tenants" : "/users", record.recipientId, returnPath)}>{record.recipientType === "TENANT" ? record.tenantName || `임차인 #${record.recipientId}` : record.recipientEmail || `유저 #${record.recipientId}`}</Link>}
          meta={<Tag color={ALIMTALK_STATUS_PRESENTATION[record.status].color}>{ALIMTALK_STATUS_PRESENTATION[record.status].label}</Tag>}
          ariaLabel={`알림톡 #${record.alimtalkId}`} fields={[
            { label: "수신자 현재 연락처", value: record.recipientPhone ?? "-" },
            { label: "건물 · 호실", value: [record.propertyName, record.roomNumber].filter(Boolean).join(" · ") || "-" },
            { label: "요청 유저", value: record.userEmail || `#${record.userId}` },
            { label: "업무 대상일", value: record.targetDate },
            { label: "실제 요청 시각", value: formatSeconds(record.requestedAt) },
          ]} actions={renderActions(record)} details={renderDetails(record)} />}
        dataSource={data}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        emptyText={Object.values(filters).some((value) => value !== undefined) ? "조건에 맞는 알림톡 발송 이력이 없습니다. 필터를 초기화해 전체 이력을 확인하세요." : "알림톡 발송 이력이 없습니다."}
        ariaLabel="알림톡 발송 이력"
        rowKey={(r) => String(r.alimtalkId)}
      />
      <AlimtalkResolutionModal alimtalk={resolving} onClose={() => setResolving(null)} />
      <Drawer title={selected ? `알림톡 #${selected.alimtalkId}` : "발송 이력"} open={selected !== null} onClose={() => setSelected(null)} size="min(560px, 100vw)" destroyOnHidden>
        {selected && <Descriptions layout={viewport === "mobile" ? "vertical" : "horizontal"} column={1} size="small" bordered items={[
          { key: "recipient", label: "수신자", children: `${selected.recipientType === "TENANT" ? "임차인" : "유저"} #${selected.recipientId}` },
          { key: "owner", label: "요청 유저", children: selected.userEmail ? `${selected.userEmail} · #${selected.userId}` : `#${selected.userId}` },
          { key: "contact", label: "현재 수신자 연락처", children: selected.recipientPhone ?? "-" },
          { key: "building", label: "건물 · 호실", children: [selected.propertyName, selected.roomNumber].filter(Boolean).join(" · ") || "-" },
          { key: "type", label: "종류", children: ALIMTALK_TYPE_PRESENTATION[selected.type].label },
          { key: "trigger", label: "발동", children: ALIMTALK_TRIGGER_PRESENTATION[selected.triggerSource].label },
          { key: "status", label: "상태", children: ALIMTALK_STATUS_PRESENTATION[selected.status].label },
          { key: "target", label: "대상일", children: selected.targetDate },
          { key: "month", label: "귀속월", children: formatYearMonth(selected.billingMonth) },
          { key: "amount", label: "금액", children: formatManwon(selected.amount) },
          { key: "message", label: "메시지 ID", children: selected.messageId ? <Text code copyable>{selected.messageId}</Text> : "-" },
          { key: "provider", label: "결과 코드", children: selected.providerCode ?? "-" },
          { key: "requested", label: "발송 요청일", children: formatSeconds(selected.requestedAt) },
          { key: "updated", label: "갱신일", children: formatSeconds(selected.updatedAt) },
        ]} />}
      </Drawer>
    </>
  );
}
