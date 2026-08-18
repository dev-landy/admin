"use client";

import { useState } from "react";
import { Button, Modal, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { TenantEditDrawerById } from "@/features/tenants/components/TenantEditDrawerById";
import { formatBillingSchedule } from "@/features/tenants/billingTiming";
import { formatManwon } from "@/lib/format/currency";
import { usePropertyTenants } from "../hooks";
import type { PropertyTenant } from "../types";

export function PropertyTenantsModal({
  propertyId,
  propertyName,
  onClose,
}: {
  propertyId: number | null;
  propertyName?: string;
  onClose: () => void;
}) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const { data, isLoading } = usePropertyTenants(propertyId, page, size);

  const columns: TableColumnsType<PropertyTenant> = [
    { title: "임차인 ID", dataIndex: "tenantId", width: 110 },
    { title: "이름", dataIndex: "name" },
    { title: "호실", dataIndex: "roomNumber", width: 80 },
    { title: "전화번호", dataIndex: "phone", width: 140 },
    { title: "월세", dataIndex: "rentPrice", render: (value: number) => formatManwon(value) },
    {
      title: "관리비",
      dataIndex: "maintenanceFee",
      render: (value: number | null | undefined) => formatManwon(value),
    },
    {
      title: "보증금",
      dataIndex: "depositAmount",
      render: (value: number | null | undefined) => formatManwon(value),
    },
    {
      title: "납부 조건",
      key: "billingSchedule",
      width: 140,
      render: (_, record) => formatBillingSchedule(record.billingTiming, record.paymentDay),
    },
    { title: "계약 시작일", dataIndex: "startDate", width: 120 },
    {
      title: "계약 종료일",
      dataIndex: "endDate",
      width: 120,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "알림",
      dataIndex: "notifyEnabled",
      width: 80,
      render: (value: boolean) => (
        <Tag color={value ? "green" : "default"}>{value ? "활성" : "비활성"}</Tag>
      ),
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
    <Modal
      title={`${propertyName ?? "건물"} 소속 임차인`}
      open={propertyId !== null}
      footer={null}
      width={900}
      onCancel={() => {
        setPage(1);
        onClose();
      }}
      destroyOnHidden
    >
      <Table
        columns={columns}
        dataSource={data?.tenants ?? []}
        loading={isLoading}
        rowKey={(tenant) => String(tenant.tenantId)}
        pagination={{
          current: page,
          pageSize: size,
          total: data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [20, 50, 100],
          showTotal: (total) => `총 ${total}건`,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setSize(nextSize);
          },
        }}
        scroll={{ x: "max-content" }}
      />
      {editingTenantId != null && (
        <TenantEditDrawerById tenantId={editingTenantId} onClose={() => setEditingTenantId(null)} />
      )}
    </Modal>
  );
}
