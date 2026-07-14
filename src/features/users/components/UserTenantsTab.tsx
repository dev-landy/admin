"use client";

import { Table, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { formatManwon } from "@/lib/format/currency";
import { useUserTenants } from "../hooks";
import type { AdminUserTenant } from "../types";

const columns: TableColumnsType<AdminUserTenant> = [
  { title: "임차인 ID", dataIndex: "tenantId", width: 120 },
  { title: "이름", dataIndex: "name" },
  { title: "호실", dataIndex: "roomNumber", width: 80 },
  { title: "월세", dataIndex: "rentPrice", render: (v: number) => formatManwon(v) },
  { title: "보증금", dataIndex: "depositAmount", render: (v: number | null | undefined) => formatManwon(v) },
  { title: "납부일", dataIndex: "paymentDay", width: 80, render: (v: number) => `매월 ${v}일` },
  { title: "계약 시작일", dataIndex: "startDate", width: 120 },
  { title: "계약 종료일", dataIndex: "endDate", width: 120, render: (v: string | null) => v ?? "-" },
  {
    title: "알림",
    dataIndex: "notifyEnabled",
    render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "활성" : "비활성"}</Tag>,
  },
];

export function UserTenantsTab({ userId }: { userId: number }) {
  const { data, isLoading } = useUserTenants(userId);
  return (
    <Table
      columns={columns}
      dataSource={data?.tenants ?? []}
      loading={isLoading}
      rowKey={(r) => String(r.tenantId)}
      pagination={false}
    />
  );
}
