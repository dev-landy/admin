"use client";

import Link from "next/link";
import { Select, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { IdFilterDropdown } from "@/components/IdFilterDropdown";
import { formatDateTime } from "@/lib/format/date";
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
      render: (value: number) => <Link href={`/users/${value}`}>{value}</Link>,
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
      render: (value: number) => <Link href={`/tenants/${value}`}>{value}</Link>,
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
      width: 140,
      align: "right",
      className: "admin-numeric",
      render: (v: number) => v.toLocaleString() + "원",
    },
    {
      title: "출처",
      dataIndex: "paymentSource",
      filteredValue: filters.source ? [filters.source] : null,
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
    { title: "수정일", dataIndex: "updatedAt", width: 170, align: "center", render: formatDateTime },
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
      ariaLabel="납부 목록"
      emptyText="조건에 맞는 납부 내역이 없습니다. 필터를 초기화하거나 청구월을 확인해 주세요."
    />
  );
}
