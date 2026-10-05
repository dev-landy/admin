"use client";

import type { ListSortControl } from "@/lib/navigation/useListSort";

import { useState } from "react";
import Link from "next/link";
import { App, Button } from "antd";
import type { TableColumnsType } from "antd";

import { EntityCell } from "@/components/EntityCell";
import { RowActions } from "@/components/RowActions";
import { RecordCard } from "@/components/RecordCard";
import { formatDateTime, formatTechnicalDateTime } from "@/lib/format/date";
import { PagedTable } from "@/components/PagedTable";
import { parseProblemDetail } from "@/lib/api/problem";
import { listDetailPath, relatedListPath } from "@/lib/navigation/listReturn";
import type { ListNavigation } from "@/lib/navigation/useScopedListState";
import { useDeleteProperty } from "../hooks";
import type { PropertySummary } from "../types";
import { DeferredPropertyEditModal, DeferredPropertyTenantsModal } from "./DeferredPropertyModals";
import { PropertyIdentity, PropertyDeletionDescription } from "./PropertyIdentity";

type Props = {
  sortControl?: ListSortControl;
  data: PropertySummary[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  filters: { userId?: number; keyword?: string; propertyId?: number };
  returnPath?: string;
  tenantPropertyId?: number;
  onTenantPropertyChange?: (id: number | undefined) => void;
  navigation?: ListNavigation;
  onPageChange: (page: number, size: number) => void;
  onFilterChange: (key: string, value: boolean | number | string | undefined) => void;
};

export function PropertyTable({ sortControl,
  data,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  returnPath = "/properties",
  tenantPropertyId,
  onTenantPropertyChange,
  navigation,
}: Props) {
  const { notification } = App.useApp();
  const { mutateAsync: remove, isPending: isDeleting, variables: deletingId } = useDeleteProperty();
  const [editing, setEditing] = useState<PropertySummary | null>(null);
  const [localTenantProperty, setTenantProperty] = useState<PropertySummary | null>(null);
  const modalPropertyId = onTenantPropertyChange ? tenantPropertyId : localTenantProperty?.propertyId;
  const tenantProperty = onTenantPropertyChange ? data.find((property) => property.propertyId === modalPropertyId) : localTenantProperty;

  async function handleDelete(property: PropertySummary) {
    try {
      await remove(property.propertyId);
      notification.success({ title: "건물을 삭제했습니다.", description: `${property.name} · #${property.propertyId}` });
    } catch (error) {
      const problem = parseProblemDetail(error);
      notification.error({ title: problem?.title ?? "삭제 실패", description: problem?.detail });
      throw error;
    }
  }

  const owner = (property: PropertySummary) => <Link href={listDetailPath("/users", property.userId, returnPath)}>{property.userEmail || `임대인 #${property.userId}`}</Link>;
  function actions(property: PropertySummary, mobile = false) {
    return <RowActions subject={`건물 #${property.propertyId} ${property.name}`} loading={isDeleting && deletingId === property.propertyId} disabled={isDeleting}
      primary={<Button size={mobile ? "large" : "small"} disabled={isDeleting && deletingId === property.propertyId} onClick={() => onTenantPropertyChange ? onTenantPropertyChange(property.propertyId) : setTenantProperty(property)}>임차인 보기</Button>}
      items={[
        { key: "payments", label: "납부 내역 보기", href: relatedListPath("/payments", { propertyId: property.propertyId }, returnPath) },
        { key: "edit", label: "건물 정보 수정", onClick: () => setEditing(property) },
        { type: "divider" },
        { key: "delete", label: property.activeTenantCount > 0 ? "건물 삭제 · 등록 계약 있음" : "건물 삭제", danger: true, disabled: isDeleting || property.activeTenantCount > 0,
          confirm: { title: "건물을 삭제하시겠습니까?", description: <PropertyDeletionDescription property={property} />, okText: "삭제" }, onClick: () => handleDelete(property) },
      ]} />;
  }
  const recordDetails = (property: PropertySummary) => <dl className="admin-record-fields">
    <div><dt>건물 ID</dt><dd>{property.propertyId}</dd></div>
    <div><dt>유저 ID</dt><dd>{property.userId}</dd></div>
    <div><dt>등록 시각</dt><dd>{formatTechnicalDateTime(property.createdAt)}</dd></div>
    <div><dt>수정 시각</dt><dd>{formatTechnicalDateTime(property.updatedAt)}</dd></div>
  </dl>;

  const columns: TableColumnsType<PropertySummary> = [
    { title: "건물", key: "property", width: 280, render: (_, property) => <PropertyIdentity property={property} /> },
    {
      title: "임대인", key: "owner", width: 210,
      render: (_, property) => <EntityCell primary={owner(property)} meta={`유저 #${property.userId}`} />,
    },
    {
      title: "등록 계약",
      dataIndex: "activeTenantCount",
      width: 100,
      align: "center",
      render: (value: number) => `${value}건`,
    },
    { title: "최근 수정", key: "updatedAt", width: 180, render: (_, property) => <EntityCell primary={formatDateTime(property.updatedAt)} meta={`등록 ${formatDateTime(property.createdAt)}`} /> },
    {
      title: "작업",
      key: "actions",
      width: 152,
      fixed: "right",
      align: "center",
      render: (_value, property) => actions(property),
    },
  ];
  const compactColumns: TableColumnsType<PropertySummary> = [
    { ...columns[0], width: 260 },
    { title: "임대인·계약", key: "owner-summary", width: 250, render: (_, property) => <EntityCell primary={owner(property)} secondary={`등록 계약 ${property.activeTenantCount}건`} meta={`유저 #${property.userId}`} /> },
    columns[4],
  ];

  return (
    <>
      <PagedTable
        sortControl={sortControl}
        columns={columns}
        compactColumns={compactColumns}
        columnSizing={{
          property: { min: 280, preferred: 520, grow: 2 },
          owner: { min: 280, preferred: 440, grow: 2 },
          "owner-summary": { min: 280, preferred: 480, grow: 1 },
          updatedAt: { min: 180, preferred: 220, grow: 0.5 },
        }}
        renderCompactDetails={recordDetails}
        renderCard={(property) => <RecordCard title={property.name} subtitle={property.address || "주소 미등록"} meta={`건물 #${property.propertyId}`} ariaLabel={`건물 #${property.propertyId} ${property.name}`}
          fields={[
            { label: "임대인", value: owner(property) },
            { label: "등록 계약", value: `${property.activeTenantCount}건` },
            { label: "최근 수정", value: formatDateTime(property.updatedAt) },
          ]} details={recordDetails(property)} actions={actions(property, true)} />}
        dataSource={data}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        rowKey={(property) => String(property.propertyId)}
        ariaLabel="건물 목록"
        emptyText="조건에 맞는 건물이 없습니다. 필터를 초기화하거나 이름·주소를 다시 확인해 주세요."
      />
      <DeferredPropertyEditModal property={editing} onClose={() => setEditing(null)} />
      <DeferredPropertyTenantsModal
        propertyId={modalPropertyId ?? null}
        propertyName={tenantProperty?.name}
        propertyAddress={tenantProperty?.address}
        owner={tenantProperty ? { userId: tenantProperty.userId, email: tenantProperty.userEmail } : undefined}
        navigation={navigation}
        onClose={() => onTenantPropertyChange ? onTenantPropertyChange(undefined) : setTenantProperty(null)}
      />
    </>
  );
}
