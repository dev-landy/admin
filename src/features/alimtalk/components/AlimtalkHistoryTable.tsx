"use client";

import { useState } from "react";
import { Button, Select, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";

import { DateFilterDropdown } from "@/components/DateFilterDropdown";
import { IdFilterDropdown } from "@/components/IdFilterDropdown";
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

export function AlimtalkHistoryTable({
  data,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  filters,
  onFilterChange,
}: Props) {
  const [resolving, setResolving] = useState<AlimtalkSummary | null>(null);
  const columns: TableColumnsType<AlimtalkSummary> = [
    { title: "발송 ID", dataIndex: "alimtalkId", width: 100, align: "center" },
    {
      title: "유저 ID",
      dataIndex: "userId",
      width: 110,
      align: "center",
      filteredValue: filters.userId === undefined ? null : [filters.userId],
      filterDropdown: () => (
        <IdFilterDropdown
          value={filters.userId}
          placeholder="유저 ID"
          onApply={(value) => onFilterChange("userId", value)}
        />
      ),
    },
    {
      title: "수신자 (임차인 ID 필터)",
      key: "recipient",
      width: 200,
      align: "center",
      render: (_value, record) => `${record.recipientType === "TENANT" ? "임차인" : "유저"} #${record.recipientId}`,
      filteredValue: filters.tenantId === undefined ? null : [filters.tenantId],
      filterDropdown: () => (
        <IdFilterDropdown
          value={filters.tenantId}
          placeholder="임차인 ID"
          onApply={(value) => onFilterChange("tenantId", value)}
        />
      ),
    },
    {
      title: "종류",
      dataIndex: "type",
      width: 120,
      align: "center",
      filteredValue: filters.type === undefined ? null : [filters.type],
      filterDropdown: () =>
        selectFilter(filters.type, ALIMTALK_TYPE_OPTIONS, (next) => onFilterChange("type", next)),
      render: (value: AlimtalkType) => (
        <Tag color={ALIMTALK_TYPE_PRESENTATION[value].color}>{ALIMTALK_TYPE_PRESENTATION[value].label}</Tag>
      ),
    },
    {
      title: "발동",
      dataIndex: "triggerSource",
      width: 130,
      align: "center",
      filteredValue: filters.triggerSource === undefined ? null : [filters.triggerSource],
      filterDropdown: () =>
        selectFilter(filters.triggerSource, ALIMTALK_TRIGGER_OPTIONS, (next) =>
          onFilterChange("triggerSource", next),
        ),
      render: (value: AlimtalkTrigger) => (
        <Tag color={ALIMTALK_TRIGGER_PRESENTATION[value].color}>
          {ALIMTALK_TRIGGER_PRESENTATION[value].label}
        </Tag>
      ),
    },
    {
      title: "상태",
      dataIndex: "status",
      width: 120,
      align: "center",
      filteredValue: filters.status === undefined ? null : [filters.status],
      filterDropdown: () =>
        selectFilter(filters.status, ALIMTALK_STATUS_OPTIONS, (next) => onFilterChange("status", next)),
      render: (value: AlimtalkStatus) => (
        <Tag color={ALIMTALK_STATUS_PRESENTATION[value].color}>
          {ALIMTALK_STATUS_PRESENTATION[value].label}
        </Tag>
      ),
    },
    {
      title: "귀속월",
      dataIndex: "billingMonth",
      width: 120,
      align: "center",
      render: (value: string) => formatYearMonth(value),
    },
    {
      title: "대상일",
      dataIndex: "targetDate",
      width: 130,
      align: "center",
      // 범위 양끝을 한 컬럼에 몰아 둔다. targetDate 하나를 두 조건으로 거르는 것이라 컬럼을 나누면 더 헷갈린다.
      filteredValue: filters.from === undefined && filters.to === undefined ? null : [filters.from ?? "", filters.to ?? ""],
      filterDropdown: () => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Text type="secondary" style={{ padding: "8px 8px 0" }}>
            시작일
          </Text>
          <DateFilterDropdown value={filters.from} onApply={(value) => onFilterChange("from", value)} />
          <Text type="secondary" style={{ padding: "0 8px" }}>
            종료일
          </Text>
          <DateFilterDropdown value={filters.to} onApply={(value) => onFilterChange("to", value)} />
        </div>
      ),
    },
    {
      title: "금액",
      dataIndex: "amount",
      width: 120,
      align: "center",
      render: (value: number | null) => formatManwon(value),
    },
    {
      title: "메시지 ID",
      dataIndex: "messageId",
      width: 220,
      // 공급자 콘솔에서 건을 찾는 유일한 키라 잘라내지 않고 그대로 보여준다.
      render: (value: string | null) => (value ? <Text code copyable>{value}</Text> : "-"),
    },
    {
      title: "결과 코드",
      dataIndex: "providerCode",
      width: 120,
      align: "center",
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "요청일",
      dataIndex: "requestedAt",
      width: 180,
      render: (value: string) => formatSeconds(value),
    },
    {
      title: "갱신일",
      dataIndex: "updatedAt",
      width: 180,
      render: (value: string) => formatSeconds(value),
    },
    {
      title: "액션",
      key: "actions",
      width: 110,
      fixed: "right",
      render: (_value, record) => (
        <Button
          size="small"
          disabled={record.status !== "READY" && record.status !== "PENDING"}
          onClick={() => setResolving(record)}
        >
          미결 종결
        </Button>
      ),
    },
  ];

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
        rowKey={(r) => String(r.alimtalkId)}
      />
      <AlimtalkResolutionModal alimtalk={resolving} onClose={() => setResolving(null)} />
    </>
  );
}
