"use client";

import { useListSort } from "@/lib/navigation/useListSort";

import { ClientLinkButton } from "@/components/ClientLinkButton";

import { useEffect, useState } from "react";
import { Button, Form, Input, InputNumber, Select, Space, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { PagedTable } from "@/components/PagedTable";
import { RecordCard } from "@/components/RecordCard";
import { EntityCell } from "@/components/EntityCell";
import { formatManwon } from "@/lib/format/currency";
import { formatRentSchedule } from "@/features/tenants/billingCycle";
import { formatBillingSchedule } from "@/features/tenants/billingTiming";
import { RowActions } from "@/components/RowActions";
import { TenantIdentityCell, TenantCompactIdentityCell, TenantReferencesCell, TenantLocationCell, TenantContractCell, TenantChargesCell, TenantNotificationCell } from "@/features/tenants/components/TenantRecordCells";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { FilterSection } from "@/components/FilterSection";
import { FilterActions } from "@/components/FilterActions";
import { FilterMore } from "@/components/FilterMore";
import { FilterSummary } from "@/components/FilterSummary";
import { listDetailPath, relatedListPath } from "@/lib/navigation/listReturn";
import { useScopedListState, type ListNavigation } from "@/lib/navigation/useScopedListState";
import { TenantSearchFields } from "@/features/tenants/components/TenantSearchFields";
import { CONTRACT_TYPE_OPTIONS, CONTRACT_STATUS_OPTIONS, readTenantFilters, TENANT_FILTER_KEYS } from "@/features/tenants/listFilters";

import { TenantEditDrawerById } from "@/features/tenants/components/TenantEditDrawerById";
import { useUserTenants } from "../hooks";
import type { AdminUserTenant } from "../types";
import { UserRetainedTenantDetails, UserRetainedTenantDrawer } from "./UserRetainedRecordDrawer";

export function UserTenantsTab({ userId, navigation, readOnly = false }: { userId: number; navigation?: ListNavigation; readOnly?: boolean }) {
  const [filterForm] = Form.useForm();
  const { params, page, size, update } = useScopedListState(navigation, "tenant");
  const { keyword, tenantId, propertyId, contractType, contractStatus, notifyEnabled } = readTenantFilters(params);
  const sort = useListSort({ fields: [{ value: "tenantId", label: "임차인 ID" }, { value: "createdAt", label: "등록 시각" }], defaultField: "tenantId", defaultDirection: "desc", navigation: { query: params.toString(), update } });
  const filters = Object.fromEntries(Object.entries({ keyword, tenantId, propertyId, contractType, contractStatus, notifyEnabled }).filter(([, value]) => value !== undefined));
  const { data, isLoading, error, isFetching, refetch } = useUserTenants(userId, page, size, { ...filters, ...sort.requestParams });
  const returnPath = navigation?.returnPath ?? `/users/${userId}?tab=tenants`;
  useEffect(() => { filterForm.setFieldsValue({ keyword, tenantId, propertyId, contractType, contractStatus, notifyEnabled }); }, [filterForm, keyword, tenantId, propertyId, contractType, contractStatus, notifyEnabled]);
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [retainedTenant, setRetainedTenant] = useState<AdminUserTenant | null>(null);

  // 재조회로 마지막 페이지가 사라지면 요청 페이지도 유효 범위로 돌린다.
  useEffect(() => { if (data && !error && !isFetching) {
    const lastPage = Math.max(1, Math.ceil(data.totalElements / data.size));
    if (page > lastPage) update({ page: String(lastPage) }, true);
  } }, [data, error, isFetching, page, update]);
  function applyFilters(values: Record<string, string | number | boolean | undefined>) {
    update({ page: "1", ...Object.fromEntries(TENANT_FILTER_KEYS.map((key) => [key, values[key] == null || values[key] === "" ? undefined : String(values[key]).trim() || undefined])) });
  }
  function removeFilter(label: string) { const key = ({"검색": "keyword", "임차인 ID": "tenantId", "건물 ID": "propertyId", "계약 유형": "contractType", "계약 상태": "contractStatus", "알림": "notifyEnabled"} as Record<string, string>)[label]; filterForm.setFieldValue(key, undefined); update({ page: "1", [key]: undefined }); }
  function resetFilters() { filterForm.setFieldsValue(Object.fromEntries(TENANT_FILTER_KEYS.map((key) => [key, undefined]))); applyFilters({}); }

  const retainedLocation = (tenant: AdminUserTenant) => <EntityCell primary={tenant.propertyName || "건물명 정보 없음"}
    secondary={tenant.roomNumber != null && tenant.roomNumber !== "" ? `호실 ${tenant.roomNumber}` : "호실 정보 없음"} meta={`건물 #${tenant.propertyId ?? "정보 없음"}`} />;
  const retainedIdentity = (tenant: AdminUserTenant) => <EntityCell primary={tenant.name} secondary={tenant.phone || "전화번호 없음"}
    meta={<>{tenant.propertyName || "건물명 정보 없음"} · {tenant.roomNumber != null && tenant.roomNumber !== "" ? `호실 ${tenant.roomNumber}` : "호실 정보 없음"}{tenant.deletedAt != null && <div><Tag>삭제됨</Tag></div>}</>} />;
  function renderActions(tenant: AdminUserTenant) {
    if (readOnly) return <Button size="small" onClick={() => setRetainedTenant(tenant)}>상세</Button>;
    return <RowActions subject={`임차인 #${tenant.tenantId}`}
        primary={<ClientLinkButton size="small" href={listDetailPath("/tenants", tenant.tenantId, returnPath)}>상세</ClientLinkButton>}
        items={[
          { key: "edit", label: "임차인 수정", onClick: () => setEditingTenantId(tenant.tenantId) },
          { key: "payments", label: "납부 내역", href: relatedListPath("/payments", { userId, tenantId: tenant.tenantId }, returnPath) },
          { key: "alimtalk", label: "알림톡 내역", href: relatedListPath("/alimtalk", { userId, tenantId: tenant.tenantId }, returnPath) },
        ]}
      />; }

  const columns: TableColumnsType<AdminUserTenant> = [
    { title: "임차인", key: "identity", width: 180, render: (_, tenant) => readOnly ? <EntityCell primary={tenant.name} secondary={tenant.phone || "전화번호 없음"} meta={`임차인 #${tenant.tenantId}`}>{tenant.deletedAt != null && <Tag>삭제됨</Tag>}</EntityCell> : <TenantIdentityCell tenant={tenant} /> },
    { title: "건물·호실", key: "location", width: 200, render: (_, tenant) => readOnly ? retainedLocation(tenant) : <TenantLocationCell tenant={tenant} returnPath={returnPath} showOwner={false} /> },
    { title: "계약", key: "contract", width: 190, render: (_, tenant) => <TenantContractCell tenant={tenant} /> },
    { title: "청구·금액", key: "charges", width: 210, className: "admin-numeric", render: (_, tenant) => <TenantChargesCell tenant={tenant} /> },
    { title: "알림", key: "notify", width: 130, render: (_, tenant) => <TenantNotificationCell tenant={tenant} /> },
    {
      title: "작업", key: "action", width: 124, fixed: "right",
      render: (_, tenant) => renderActions(tenant),
    },
  ];

  const compactColumns: TableColumnsType<AdminUserTenant> = [
    { title: "임차인·공간", key: "identity", width: 290, render: (_, tenant) => readOnly ? retainedIdentity(tenant) : <TenantCompactIdentityCell tenant={tenant} returnPath={returnPath} showOwner={false} /> },
    { title: "계약·청구", key: "terms", width: 260, render: (_, tenant) => <EntityCell primary={formatRentSchedule(tenant.rentBillingCycle, tenant.rentPrice)} secondary={`${tenant.startDate} → ${tenant.endDate ?? "종료일 없음"}`} meta={formatBillingSchedule(tenant.billingTiming, tenant.paymentDay)} /> },
    columns[5],
  ];
  const wideColumns: TableColumnsType<AdminUserTenant> = [columns[0], columns[1], columns[2],
    { title: "임대료", key: "rent", width: 160, className: "admin-numeric", render: (_, tenant) => formatRentSchedule(tenant.rentBillingCycle, tenant.rentPrice) },
    { title: "관리비", dataIndex: "maintenanceFee", width: 110, className: "admin-numeric", render: formatManwon },
    { title: "보증금", dataIndex: "depositAmount", width: 130, className: "admin-numeric", render: formatManwon },
    { title: "납부 조건", key: "billing", width: 140, render: (_, tenant) => formatBillingSchedule(tenant.billingTiming, tenant.paymentDay) },
    columns[4], columns[5],
  ];
  function renderDetails(tenant: AdminUserTenant) {
    if (readOnly) return <UserRetainedTenantDetails tenant={tenant} />;
    return <div className="admin-detail-grid"><TenantReferencesCell tenant={tenant} returnPath={returnPath} /><TenantContractCell tenant={tenant} /><TenantChargesCell tenant={tenant} /><TenantNotificationCell tenant={tenant} /></div>;
  }

  return (
    <>
      <FilterSection>
      <Form form={filterForm} name={`user-${userId}-tenants-filters`} layout="vertical" className="admin-filter-bar" onFinish={applyFilters}>
        {readOnly ? <>
          <Form.Item name="keyword" label="임차인명·연락처·호실" className="admin-filter-keyword"><Input allowClear /></Form.Item>
          <Form.Item name="propertyId" label="건물 ID"><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="tenantId" label="임차인 ID"><InputNumber min={1} precision={0} style={{ width: "100%" }} /></Form.Item>
          <FilterActions><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={resetFilters}>필터 초기화</Button></Space></FilterActions>
          <FilterMore>
            <Form.Item name="contractType" label="계약 유형"><Select allowClear options={CONTRACT_TYPE_OPTIONS} /></Form.Item>
            <Form.Item name="contractStatus" label="계약 상태"><Select allowClear options={CONTRACT_STATUS_OPTIONS} /></Form.Item>
            <Form.Item name="notifyEnabled" label="저장된 알림 설정"><Select allowClear options={[{ value: true, label: "켜짐" }, { value: false, label: "꺼짐" }]} /></Form.Item>
          </FilterMore>
        </> : <TenantSearchFields userId={userId} actions={<FilterActions><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={resetFilters}>필터 초기화</Button></Space></FilterActions>} />}
      </Form>
      </FilterSection>
      <FilterSummary filters={[
        ...(keyword ? [{ label: "검색", value: keyword }] : []), ...(tenantId ? [{ label: "임차인 ID", value: tenantId }] : []), ...(propertyId ? [{ label: "건물 ID", value: propertyId }] : []),
        ...(contractType ? [{ label: "계약 유형", value: CONTRACT_TYPE_OPTIONS.find((item) => item.value === contractType)?.label }] : []), ...(contractStatus ? [{ label: "계약 상태", value: CONTRACT_STATUS_OPTIONS.find((item) => item.value === contractStatus)?.label }] : []),
        ...(notifyEnabled !== undefined ? [{ label: "알림", value: notifyEnabled ? "활성" : "비활성" }] : []),
      ].map((filter) => ({ ...filter, onRemove: () => removeFilter(filter.label) }))} onReset={resetFilters} />
      <QueryErrorAlert error={error} title="임차인 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {(!error || data) && <PagedTable key={readOnly ? "retained" : "active"} sortControl={sort.control}
        columns={wideColumns}
        compactColumns={compactColumns}
        columnSizing={{
          identity: { preferred: 420, grow: 1 },
          location: { min: 240, preferred: 400, grow: 1 },
          contract: { min: 220, preferred: 240, grow: 0.5 },
          terms: { min: 260, preferred: 360, grow: 1 },
          notify: { min: 190 },
        }}
        renderCompactDetails={renderDetails}
        renderCard={(tenant) => <RecordCard ariaLabel={`임차인 #${tenant.tenantId} ${tenant.name}`} title={tenant.name}
          subtitle={tenant.phone || "전화번호 미등록"} meta={`임차인 #${tenant.tenantId}`}
          fields={[{ label: "건물·호실", value: readOnly ? retainedLocation(tenant) : <TenantLocationCell tenant={tenant} returnPath={returnPath} showOwner={false} showIds={false} /> },
            { label: "계약", value: <TenantContractCell tenant={tenant} /> }, { label: "청구·금액", value: <TenantChargesCell tenant={tenant} /> }]}
          details={readOnly ? <UserRetainedTenantDetails tenant={tenant} /> : <div className="admin-detail-grid"><TenantReferencesCell tenant={tenant} returnPath={returnPath} /><TenantNotificationCell tenant={tenant} /></div>} actions={renderActions(tenant)} /> }
        dataSource={data?.tenants ?? []}
        loading={isLoading}
        ariaLabel="사용자 임차인 목록"
        emptyText="조건에 맞는 임차인이 없습니다. 필터를 초기화하거나 다른 검색어로 조회해 주세요."
        rowKey={(r) => String(r.tenantId)}
        page={data ? data.page + 1 : page}
        pageSize={data?.size ?? size}
        total={data?.totalElements ?? 0}
        onPageChange={(nextPage, nextSize) => update({ page: String(nextSize === size ? nextPage : 1), size: String(nextSize) })}
      />}
      {!readOnly && editingTenantId != null && <TenantEditDrawerById tenantId={editingTenantId} onClose={() => setEditingTenantId(null)} />}
      {readOnly && <UserRetainedTenantDrawer tenant={retainedTenant} onClose={() => setRetainedTenant(null)} />}
    </>
  );
}
