"use client";

import { useListSort } from "@/lib/navigation/useListSort";
import { sortRecords } from "@/lib/table/sort-records";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { App, Button, Form, Input, InputNumber, Space } from "antd";
import type { TableColumnsType } from "antd";

import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { FilterSummary } from "@/components/FilterSummary";
import { EntityCell } from "@/components/EntityCell";
import { RowActions } from "@/components/RowActions";
import { PagedTable } from "@/components/PagedTable";
import { RecordCard } from "@/components/RecordCard";
import { FilterMore } from "@/components/FilterMore";
import { FilterSection } from "@/components/FilterSection";
import { FilterActions } from "@/components/FilterActions";
import { optionalPositiveInteger } from "@/lib/navigation/listParams";
import { relatedListPath } from "@/lib/navigation/listReturn";
import { useScopedListState, type ListNavigation } from "@/lib/navigation/useScopedListState";

import { parseProblemDetail } from "@/lib/api/problem";
import { formatDateTime, formatTechnicalDateTime } from "@/lib/format/date";
import { useDeleteProperty, useUserProperties } from "../hooks";
import type { UserPropertySummary } from "../types";
import { DeferredPropertyEditModal, DeferredPropertyTenantsModal } from "./DeferredPropertyModals";
import { PropertyIdentity, PropertyDeletionDescription } from "./PropertyIdentity";
import { UserRetainedPropertyDrawer } from "@/features/users/components/UserRetainedRecordDrawer";
import { TENANT_FILTER_KEYS } from "@/features/tenants/listFilters";

function clearTenantFilters(prefix: string) {
  return Object.fromEntries(TENANT_FILTER_KEYS.filter((key) => key !== "propertyId").map((key) => [`${prefix}${key[0].toUpperCase()}${key.slice(1)}`, undefined]));
}

export function UserPropertiesTab({ userId, navigation, readOnly = false }: { userId: number; navigation?: ListNavigation; readOnly?: boolean }) {
  const operationScope = useRef({ userId, readOnly });
  useLayoutEffect(() => {
    operationScope.current = { userId, readOnly };
    return () => { operationScope.current = { userId, readOnly: true }; };
  }, [userId, readOnly]);
  const { notification } = App.useApp();
  const { data, isLoading, error, isFetching, refetch } = useUserProperties(userId);
  const { mutateAsync: remove, isPending: isDeleting, variables: deletingId } = useDeleteProperty();
  const [editing, setEditing] = useState<UserPropertySummary | null>(null);
  const [retainedProperty, setRetainedProperty] = useState<UserPropertySummary | null>(null);
  const [filterForm] = Form.useForm();
  const { params, page, size, update } = useScopedListState(navigation, "property");
  const keyword = params.get("keyword")?.trim() || undefined;
  const propertyId = optionalPositiveInteger(params.get("propertyId"));
  const tenantPropertyId = optionalPositiveInteger(params.get("tenantsId"));
  const tenantProperty = data?.properties.find((property) => property.propertyId === tenantPropertyId);
  const returnPath = navigation?.returnPath ?? `/users/${userId}?tab=properties`;
  const sort = useListSort({ fields: [{ value: "propertyId", label: "건물 ID" }, { value: "name", label: "건물명" }, { value: "createdAt", label: "등록 시각" }, { value: "updatedAt", label: "수정 시각" }], defaultField: "name", defaultDirection: "asc", navigation: { query: params.toString(), update } });
  const filteredProperties = (data?.properties ?? []).filter((property) => (!propertyId || property.propertyId === propertyId) && (!keyword || [property.name, property.address ?? ""].some((text) => text.toLocaleLowerCase().includes(keyword.toLocaleLowerCase()))));
  const properties = sort.requestParams.sort ? sortRecords(filteredProperties, sort.field, sort.direction, "propertyId") : filteredProperties;
  const pageProperties = properties.slice((page - 1) * size, page * size);
  useEffect(() => { filterForm.setFieldsValue({ keyword, propertyId }); }, [filterForm, keyword, propertyId]);
  useEffect(() => { if (data && !error && !isFetching) { const lastPage = Math.max(1, Math.ceil(properties.length / size)); if (page > lastPage) update({ page: String(lastPage) }, true); } }, [data, error, isFetching, page, properties.length, size, update]);
  function applyFilters(values: { keyword?: string; propertyId?: number }) { update({ page: "1", keyword: values.keyword?.trim() || undefined, propertyId: values.propertyId ? String(values.propertyId) : undefined }); }
  function removeFilter(label: string) { const key = ({"건물명·주소": "keyword", "건물 ID": "propertyId"} as Record<string, string>)[label]; filterForm.setFieldValue(key, undefined); update({ page: "1", [key]: undefined }); }
  function resetFilters() { filterForm.setFieldsValue({ keyword: undefined, propertyId: undefined }); applyFilters({}); }
  function openTenants(id: number) {
    if (readOnly) {
      if (navigation) navigation.update({ ...clearTenantFilters("tenant"), tab: "tenants", tenantPropertyId: String(id), tenantPage: "1" });
      else setRetainedProperty(data?.properties.find((property) => property.propertyId === id) ?? null);
      return;
    }
    if (navigation) navigation.update({ ...clearTenantFilters("propertyTenant"), propertyTenantsId: String(id), propertyTenantPage: "1" });
    else update({ tenantsId: String(id) });
  }

  async function handleDelete(property: UserPropertySummary) {
    if (operationScope.current.readOnly || operationScope.current.userId !== userId) return;
    try {
      await remove(property.propertyId);
      notification.success({ title: "건물을 삭제했습니다.", description: `${property.name} · #${property.propertyId}` });
    } catch (error) {
      const problem = parseProblemDetail(error);
      notification.error({ title: problem?.title ?? "삭제 실패", description: problem?.detail });
      throw error;
    }
  }

  function actions(property: UserPropertySummary, mobile = false) {
    if (readOnly) return <Button size={mobile ? "large" : "small"} onClick={() => openTenants(property.propertyId)}>{navigation ? "보관 임차인 보기" : "건물 정보"}</Button>;
    return <RowActions subject={`건물 #${property.propertyId} ${property.name}`} loading={isDeleting && deletingId === property.propertyId} disabled={isDeleting}
      primary={<Button size={mobile ? "large" : "small"} disabled={isDeleting && deletingId === property.propertyId} onClick={() => openTenants(property.propertyId)}>임차인 보기</Button>}
      items={[
        { key: "payments", label: "납부 내역 보기", href: relatedListPath("/payments", { userId, propertyId: property.propertyId }, returnPath) },
        { key: "edit", label: "건물 정보 수정", onClick: () => setEditing(property) },
        { type: "divider" },
        { key: "delete", label: property.activeTenantCount > 0 ? "건물 삭제 · 등록 계약 있음" : data?.properties.length === 1 ? "건물 삭제 · 마지막 건물" : "건물 삭제",
          danger: true, disabled: isDeleting || property.activeTenantCount > 0 || data?.properties.length === 1,
          confirm: { title: "건물을 삭제하시겠습니까?", description: <PropertyDeletionDescription property={property} />, okText: "삭제" }, onClick: () => handleDelete(property) },
      ]} />;
  }
  const recordDetails = (property: UserPropertySummary) => <dl className="admin-record-fields">
    <div><dt>건물 ID</dt><dd>{property.propertyId}</dd></div>
    <div><dt>등록 시각</dt><dd>{formatTechnicalDateTime(property.createdAt)}</dd></div>
    <div><dt>수정 시각</dt><dd>{formatTechnicalDateTime(property.updatedAt)}</dd></div>
    {readOnly && <div><dt>삭제 시각</dt><dd>{property.deletedAt == null ? "삭제되지 않음" : formatTechnicalDateTime(property.deletedAt)}</dd></div>}
  </dl>;
  const columns: TableColumnsType<UserPropertySummary> = [
    { title: "건물", key: "property", width: 300, render: (_, property) => <PropertyIdentity property={property} /> },
    { title: readOnly ? "보관 임차인" : "등록 계약", key: "activeTenantCount", width: 110, align: "center", render: (_, property) => readOnly ? property.retainedTenantCount == null ? "정보 없음" : `${property.retainedTenantCount}건` : `${property.activeTenantCount}건` },
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
  const compactColumns: TableColumnsType<UserPropertySummary> = [
    { ...columns[0], width: 280 }, columns[1], columns[3],
  ];

  return (
    <>
      <FilterSection><Form form={filterForm} name={`user-${userId}-properties-filters`} layout="vertical" className="admin-filter-bar" onFinish={applyFilters}>
        <Form.Item name="keyword" label="건물명 또는 주소" className="admin-filter-keyword admin-filter-field"><Input allowClear placeholder="이 사용자의 모든 건물에서 검색" /></Form.Item>
        <FilterActions><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={resetFilters}>필터 초기화</Button></Space></FilterActions>
        <FilterMore><Form.Item name="propertyId" label="건물 ID" className="admin-id-input"><InputNumber min={1} precision={0} placeholder="정확한 ID" style={{ width: "100%" }} /></Form.Item></FilterMore>
      </Form></FilterSection>
      <FilterSummary filters={[...(keyword ? [{ label: "건물명·주소", value: keyword }] : []), ...(propertyId ? [{ label: "건물 ID", value: propertyId }] : [])].map((filter) => ({ ...filter, onRemove: () => removeFilter(filter.label) }))} onReset={resetFilters} />
      <QueryErrorAlert error={error} title="건물 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {data && properties.length !== data.properties.length && <div role="status" className="admin-result-summary" aria-label="사용자 등록 건물 전체">등록 건물 전체 {data.properties.length}건</div>}
      {(!error || data) && <PagedTable key={readOnly ? "retained" : "active"} sortControl={sort.control}
        columns={columns}
        compactColumns={compactColumns}
        columnSizing={{
          property: { min: 300, preferred: 560, grow: 2 },
          updatedAt: { min: 180, preferred: 220, grow: 0.5 },
        }}
        renderCompactDetails={recordDetails}
        renderCard={(property) => <RecordCard title={property.name} subtitle={property.address || "주소 미등록"} meta={`건물 #${property.propertyId}`} ariaLabel={`건물 #${property.propertyId} ${property.name}`}
          fields={[{ label: readOnly ? "보관 임차인" : "등록 계약", value: readOnly ? property.retainedTenantCount == null ? "정보 없음" : `${property.retainedTenantCount}건` : `${property.activeTenantCount}건` }, { label: "최근 수정", value: formatDateTime(property.updatedAt) }]}
          details={recordDetails(property)} actions={actions(property, true)} />}
        dataSource={pageProperties}
        loading={isLoading}
        rowKey={(property) => String(property.propertyId)}
        page={page} pageSize={size} total={properties.length} ariaLabel="사용자 건물 목록"
        onPageChange={(nextPage, nextSize) => update({ page: String(nextSize === size ? nextPage : 1), size: String(nextSize) })}
        emptyText={keyword || propertyId ? "조건에 맞는 건물이 없습니다. 필터를 초기화해 주세요." : "이 사용자에게 등록된 건물이 없습니다."}
      />}
      {!readOnly && <DeferredPropertyEditModal property={editing} onClose={() => setEditing(null)} />}
      {!readOnly && <DeferredPropertyTenantsModal
        propertyId={tenantPropertyId ?? null}
        propertyName={tenantProperty?.name}
        propertyAddress={tenantProperty?.address}
        owner={{ userId }}
        navigation={navigation}
        onClose={() => update({ tenantsId: undefined })}
      />}
      {readOnly && <UserRetainedPropertyDrawer property={retainedProperty} onClose={() => setRetainedProperty(null)} />}
    </>
  );
}
