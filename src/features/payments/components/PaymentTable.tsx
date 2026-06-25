"use client";

import { Select, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { PagedTable } from "@/components/PagedTable";
import type { Payment, PaymentSource } from "../types";

type Props = {
  data: Payment[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number, s: number) => void;
  filters: { source?: PaymentSource };
  onFilterChange: (key: string, value: string | undefined) => void;
};

export function PaymentTable({ data, loading, page, pageSize, total, onPageChange, filters, onFilterChange }: Props) {
  const columns: TableColumnsType<Payment> = [
    { title: "ID", dataIndex: "paymentId", width: 80 },
    { title: "유저 ID", dataIndex: "userId", width: 90 },
    { title: "임차인 ID", dataIndex: "tenantId", width: 100 },
    { title: "청구월", dataIndex: "billingMonth", width: 110 },
    { title: "납부일", dataIndex: "paidAt", width: 110 },
    { title: "금액", dataIndex: "amount", render: (v: number) => v.toLocaleString() + "원" },
    {
      title: "출처",
      dataIndex: "paymentSource",
      width: 130,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            placeholder="전체"
            value={filters.source}
            style={{ width: 140 }}
            onChange={(v) => onFilterChange("source", v)}
            options={[
              { label: "수동", value: "MANUAL" },
              { label: "은행 자동", value: "BANK_AUTO" },
            ]}
          />
        </div>
      ),
      render: (v: PaymentSource) => <Tag>{v === "MANUAL" ? "수동" : "은행 자동"}</Tag>,
    },
    { title: "등록일", dataIndex: "createdAt" },
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
