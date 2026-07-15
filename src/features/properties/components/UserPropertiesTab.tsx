"use client";

import { useState } from "react";
import { App, Button, Popconfirm, Space, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { useDeleteProperty, useUserProperties } from "../hooks";
import type { UserPropertySummary } from "../types";
import { PropertyEditModal } from "./PropertyEditModal";
import { PropertyTenantsModal } from "./PropertyTenantsModal";

export function UserPropertiesTab({ userId }: { userId: number }) {
  const { notification } = App.useApp();
  const { data, isLoading } = useUserProperties(userId);
  const { mutate: remove, isPending: isDeleting } = useDeleteProperty();
  const [editing, setEditing] = useState<UserPropertySummary | null>(null);
  const [tenantProperty, setTenantProperty] = useState<UserPropertySummary | null>(null);

  function handleDelete(propertyId: number) {
    remove(propertyId, {
      onSuccess: () => notification.success({ message: "건물이 삭제되었습니다." }),
      onError: (error) => {
        const problem = parseProblemDetail(error);
        notification.error({ message: problem?.title ?? "삭제 실패", description: problem?.detail });
      },
    });
  }

  const columns: TableColumnsType<UserPropertySummary> = [
    { title: "건물 ID", dataIndex: "propertyId", width: 100 },
    { title: "건물명", dataIndex: "name" },
    { title: "주소", dataIndex: "address", render: (value: string | null) => value ?? "-" },
    {
      title: "구분",
      dataIndex: "isDefault",
      width: 90,
      render: (value: boolean) => <Tag color={value ? "blue" : "default"}>{value ? "기본" : "일반"}</Tag>,
    },
    { title: "활성 임차인", dataIndex: "activeTenantCount", width: 110, render: (value: number) => `${value}명` },
    {
      title: "액션",
      key: "actions",
      width: 220,
      render: (_value, property) => (
        <Space>
          <Button size="small" onClick={() => setTenantProperty(property)}>임차인</Button>
          <Button size="small" onClick={() => setEditing(property)}>수정</Button>
          <Popconfirm title="건물을 삭제하시겠습니까?" onConfirm={() => handleDelete(property.propertyId)}>
            <Button size="small" danger loading={isDeleting}>삭제</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={data?.properties ?? []}
        loading={isLoading}
        rowKey={(property) => String(property.propertyId)}
        pagination={false}
        scroll={{ x: "max-content" }}
      />
      <PropertyEditModal property={editing} onClose={() => setEditing(null)} />
      <PropertyTenantsModal
        propertyId={tenantProperty?.propertyId ?? null}
        propertyName={tenantProperty?.name}
        onClose={() => setTenantProperty(null)}
      />
    </>
  );
}
