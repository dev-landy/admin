"use client";

import { useState } from "react";
import { Button, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { TenantEditDrawerById } from "@/features/tenants/components/TenantEditDrawerById";
import { formatManwon } from "@/lib/format/currency";
import { useUserTenants } from "../hooks";
import type { AdminUserTenant } from "../types";

export function UserTenantsTab({ userId }: { userId: number }) {
  const { data, isLoading } = useUserTenants(userId);
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);

  const columns: TableColumnsType<AdminUserTenant> = [
    { title: "임차인 ID", dataIndex: "tenantId", width: 120 },
    { title: "이름", dataIndex: "name" },
    { title: "호실", dataIndex: "roomNumber", width: 80 },
    { title: "월세", dataIndex: "rentPrice", render: (v: number) => formatManwon(v) },
    {
      title: "관리비",
      dataIndex: "maintenanceFee",
      render: (v: number | null | undefined) => formatManwon(v),
    },
    {
      title: "보증금",
      dataIndex: "depositAmount",
      render: (v: number | null | undefined) => formatManwon(v),
    },
    { title: "납부일", dataIndex: "paymentDay", width: 80, render: (v: number) => `매월 ${v}일` },
    { title: "계약 시작일", dataIndex: "startDate", width: 120 },
    { title: "계약 종료일", dataIndex: "endDate", width: 120, render: (v: string | null) => v ?? "-" },
    {
      title: "알림",
      dataIndex: "notifyEnabled",
      render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "활성" : "비활성"}</Tag>,
    },
    {
      title: "동작",
      key: "action",
      width: 90,
      align: "center",
      render: (_, record) => (
        <Button onClick={() => setEditingTenantId(record.tenantId)}>수정</Button>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={data?.tenants ?? []}
        loading={isLoading}
        rowKey={(r) => String(r.tenantId)}
        pagination={false}
      />
      {editingTenantId != null && (
        <TenantEditDrawerById tenantId={editingTenantId} onClose={() => setEditingTenantId(null)} />
      )}
    </>
  );
}
