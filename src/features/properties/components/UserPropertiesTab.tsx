"use client";

import { useState } from "react";
import { App, Button, Popconfirm, Space, Table } from "antd";
import type { TableColumnsType } from "antd";

import { QueryErrorAlert } from "@/components/QueryErrorAlert";

import { parseProblemDetail } from "@/lib/api/problem";
import { useDeleteProperty, useUserProperties } from "../hooks";
import type { UserPropertySummary } from "../types";
import { PropertyEditModal } from "./PropertyEditModal";
import { PropertyTenantsModal } from "./PropertyTenantsModal";

export function UserPropertiesTab({ userId }: { userId: number }) {
  const { notification } = App.useApp();
  const { data, isLoading, error, isFetching, refetch } = useUserProperties(userId);
  const { mutate: remove, isPending: isDeleting, variables: deletingId } = useDeleteProperty();
  const [editing, setEditing] = useState<UserPropertySummary | null>(null);
  const [tenantProperty, setTenantProperty] = useState<UserPropertySummary | null>(null);

  function handleDelete(propertyId: number) {
    remove(propertyId, {
      onSuccess: () => notification.success({ title: "건물이 삭제되었습니다." }),
      onError: (error) => {
        const problem = parseProblemDetail(error);
        notification.error({ title: problem?.title ?? "삭제 실패", description: problem?.detail });
      },
    });
  }

  const columns: TableColumnsType<UserPropertySummary> = [
    { title: "건물 ID", dataIndex: "propertyId", width: 100 },
    { title: "건물명", dataIndex: "name" },
    { title: "주소", dataIndex: "address", render: (value: string | null) => value ?? "-" },
    { title: "활성 임차인", dataIndex: "activeTenantCount", width: 110, render: (value: number) => `${value}명` },
    {
      title: "액션",
      key: "actions",
      width: 220,
      render: (_value, property) => (
        <Space wrap>
          <Button size="small" onClick={() => setTenantProperty(property)}>임차인</Button>
          <Button size="small" onClick={() => setEditing(property)}>수정</Button>
          <Popconfirm description="마지막 남은 건물이거나 활성 임차인이 있으면 삭제할 수 없습니다." title="건물을 삭제하시겠습니까?" okText="삭제" cancelText="취소" okButtonProps={{ danger: true }} disabled={isDeleting} onConfirm={() => handleDelete(property.propertyId)}>
            <Button size="small" danger loading={isDeleting && deletingId === property.propertyId} disabled={isDeleting}>삭제</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <QueryErrorAlert error={error} title="건물 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {(!error || data) && <Table
        columns={columns}
        dataSource={data?.properties ?? []}
        loading={isLoading}
        rowKey={(property) => String(property.propertyId)}
        locale={{ emptyText: "이 사용자에게 등록된 건물이 없습니다." }}
        pagination={false}
        scroll={{ x: "max-content" }}
      />}
      <PropertyEditModal property={editing} onClose={() => setEditing(null)} />
      <PropertyTenantsModal
        propertyId={tenantProperty?.propertyId ?? null}
        propertyName={tenantProperty?.name}
        onClose={() => setTenantProperty(null)}
      />
    </>
  );
}
