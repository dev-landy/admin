"use client";

import { Tag } from "antd";
import type { TableColumnsType } from "antd";

import { PagedTable } from "@/components/PagedTable";
import type { DuplicateGroup } from "../types";

const columns: TableColumnsType<DuplicateGroup> = [
  { title: "임차인 ID", dataIndex: "tenantId", width: 100 },
  { title: "청구월", dataIndex: "billingMonth", width: 120 },
  { title: "중복 수", dataIndex: "count", width: 90, render: (v: number) => <Tag color="red">{v}건</Tag> },
  {
    title: "납부 ID 목록",
    dataIndex: "paymentIds",
    render: (ids: number[]) => ids.join(", "),
  },
];

type Props = {
  data: DuplicateGroup[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number, s: number) => void;
};

export function DuplicateTable({ data, loading, page, pageSize, total, onPageChange }: Props) {
  return (
    <PagedTable
      columns={columns}
      dataSource={data}
      loading={loading}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      rowKey={(r) => `${r.tenantId}-${r.billingMonth}`}
    />
  );
}
