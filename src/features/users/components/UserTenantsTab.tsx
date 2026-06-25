"use client";

import { Table, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { useUserTenants } from "../hooks";
import type { AdminUserTenant } from "../types";

const columns: TableColumnsType<AdminUserTenant> = [
  { title: "ID", dataIndex: "tenantId", width: 80 },
  { title: "이름", dataIndex: "name" },
  { title: "호실", dataIndex: "roomNumber", width: 80 },
  { title: "월세", dataIndex: "rentPrice", render: (v: number) => v.toLocaleString() + "원" },
  { title: "납부일", dataIndex: "paymentDay", width: 80, render: (v: number) => `매월 ${v}일` },
  { title: "시작일", dataIndex: "startDate" },
  { title: "종료일", dataIndex: "endDate", render: (v: string | null) => v ?? "진행중" },
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
