"use client";

import { Select, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { IdFilterDropdown } from "@/components/IdFilterDropdown";
import { PagedTable } from "@/components/PagedTable";
import { formatYearMonth } from "@/lib/format/date";
import { PAYMENT_SOURCE_OPTIONS, PAYMENT_SOURCE_PRESENTATION } from "../paymentSource";
import type { Payment, PaymentSource } from "../types";

type Props = {
  data: Payment[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number, s: number) => void;
  filters: { source?: PaymentSource; userId?: number; tenantId?: number };
  onFilterChange: (key: string, value: string | number | undefined) => void;
};

export function PaymentTable({
  data,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  filters,
  onFilterChange,
}: Props) {
  const columns: TableColumnsType<Payment> = [
    { title: "납부 ID", dataIndex: "paymentId", width: 90, align: "center" },
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
      title: "임차인 ID",
      dataIndex: "tenantId",
      width: 120,
      align: "center",
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
      title: "청구월",
      dataIndex: "billingMonth",
      width: 110,
      align: "center",
      render: (v: string) => formatYearMonth(v),
    },
    { title: "납부일", dataIndex: "paidAt", width: 110, align: "center" },
    {
      title: "금액",
      dataIndex: "amount",
      width: 120,
      align: "center",
      render: (v: number) => v.toLocaleString() + "원",
    },
    {
      title: "출처",
      dataIndex: "paymentSource",
      width: 130,
      align: "center",
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            placeholder="전체"
            value={filters.source}
            style={{ width: 140 }}
            onChange={(v) => onFilterChange("source", v)}
            options={PAYMENT_SOURCE_OPTIONS}
          />
        </div>
      ),
      render: (v: PaymentSource) => {
        const presentation = PAYMENT_SOURCE_PRESENTATION[v];
        return <Tag color={presentation.color}>{presentation.label}</Tag>;
      },
    },
    { title: "수정일", dataIndex: "updatedAt", width: 170, align: "center", ellipsis: true },
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
      rowKey={(r) => String(r.paymentId)}
    />
  );
}
