"use client";

import { useState } from "react";
import { App, Button, Input, Popconfirm, Select, Space, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { IdFilterDropdown } from "@/components/IdFilterDropdown";
import { PagedTable } from "@/components/PagedTable";
import { parseProblemDetail } from "@/lib/api/problem";
import { useDeleteProperty } from "../hooks";
import type { PropertySummary } from "../types";
import { PropertyEditModal } from "./PropertyEditModal";
import { PropertyTenantsModal } from "./PropertyTenantsModal";

type Props = {
  data: PropertySummary[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  filters: { userId?: number; isDefault?: boolean; keyword?: string };
  onPageChange: (page: number, size: number) => void;
  onFilterChange: (key: string, value: boolean | number | string | undefined) => void;
};

export function PropertyTable({
  data,
  loading,
  page,
  pageSize,
  total,
  filters,
  onPageChange,
  onFilterChange,
}: Props) {
  const { notification } = App.useApp();
  const { mutate: remove, isPending: isDeleting } = useDeleteProperty();
  const [editing, setEditing] = useState<PropertySummary | null>(null);
  const [tenantProperty, setTenantProperty] = useState<PropertySummary | null>(null);

  function handleDelete(property: PropertySummary) {
    remove(property.propertyId, {
      onSuccess: () => notification.success({ message: "건물이 삭제되었습니다." }),
      onError: (error) => {
        const problem = parseProblemDetail(error);
        notification.error({ message: problem?.title ?? "삭제 실패", description: problem?.detail });
      },
    });
  }

  const columns: TableColumnsType<PropertySummary> = [
    { title: "건물 ID", dataIndex: "propertyId", width: 100, align: "center", filteredValue: null },
    {
      title: "유저 ID",
      dataIndex: "userId",
      width: 100,
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
    { title: "유저 이메일", dataIndex: "userEmail", width: 180, filteredValue: null },
    {
      title: "건물명",
      dataIndex: "name",
      width: 160,
      filteredValue: filters.keyword ? [filters.keyword] : null,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Input.Search
            allowClear
            defaultValue={filters.keyword}
            placeholder="건물명 또는 주소"
            onSearch={(value) => onFilterChange("keyword", value.trim() || undefined)}
            style={{ width: 220 }}
          />
        </div>
      ),
    },
    {
      title: "주소",
      dataIndex: "address",
      width: 220,
      filteredValue: null,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "구분",
      dataIndex: "isDefault",
      width: 100,
      align: "center",
      filteredValue: filters.isDefault === undefined ? null : [filters.isDefault],
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            placeholder="전체"
            value={filters.isDefault}
            onChange={(value) => onFilterChange("isDefault", value)}
            options={[{ label: "기본", value: true }, { label: "일반", value: false }]}
            style={{ width: 120 }}
          />
        </div>
      ),
      render: (value: boolean) => <Tag color={value ? "blue" : "default"}>{value ? "기본" : "일반"}</Tag>,
    },
    {
      title: "활성 임차인",
      dataIndex: "activeTenantCount",
      width: 110,
      align: "center",
      filteredValue: null,
      render: (value: number) => `${value}명`,
    },
    { title: "생성일", dataIndex: "createdAt", width: 180, filteredValue: null },
    {
      title: "액션",
      key: "actions",
      width: 220,
      align: "center",
      filteredValue: null,
      render: (_value, property) => (
        <Space>
          <Button size="small" onClick={() => setTenantProperty(property)}>임차인</Button>
          <Button size="small" onClick={() => setEditing(property)}>수정</Button>
          <Popconfirm
            title="건물을 삭제하시겠습니까?"
            description="기본 건물이거나 활성 임차인이 있으면 삭제할 수 없습니다."
            onConfirm={() => handleDelete(property)}
          >
            <Button size="small" danger loading={isDeleting}>삭제</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <PagedTable
        columns={columns}
        dataSource={data}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        rowKey={(property) => String(property.propertyId)}
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
