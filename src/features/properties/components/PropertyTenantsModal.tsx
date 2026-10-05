"use client";

import { useListSort } from "@/lib/navigation/useListSort";

import { ClientLinkButton } from "@/components/ClientLinkButton";
import { EntityCell } from "@/components/EntityCell";
import { RowActions } from "@/components/RowActions";
import { PagedTable } from "@/components/PagedTable";
import { RecordCard } from "@/components/RecordCard";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Form, Modal, Space, Tag } from "antd";
import type { ModalProps, TableColumnsType } from "antd";

import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { FilterSummary } from "@/components/FilterSummary";
import { FilterSection } from "@/components/FilterSection";
import { FilterActions } from "@/components/FilterActions";
import { listDetailPath, relatedListPath } from "@/lib/navigation/listReturn";
import { useScopedListState, type ListNavigation } from "@/lib/navigation/useScopedListState";
import { TenantSearchFields } from "@/features/tenants/components/TenantSearchFields";
import { CONTRACT_TYPE_OPTIONS, CONTRACT_STATUS_OPTIONS, readTenantFilters, TENANT_FILTER_KEYS } from "@/features/tenants/listFilters";

import { TenantEditDrawerById } from "@/features/tenants/components/TenantEditDrawerById";
import { TenantChargesCell, TenantContractCell, TenantNotificationCell } from "@/features/tenants/components/TenantRecordCells";
import { formatRentSchedule } from "@/features/tenants/billingCycle";
import { formatBillingSchedule } from "@/features/tenants/billingTiming";
import { formatManwon } from "@/lib/format/currency";
import { usePropertyTenants } from "../hooks";
import type { PropertyTenant } from "../types";

export function PropertyTenantsModal({
  propertyId,
  propertyName,
  propertyAddress,
  owner,
  onClose,
  afterClose,
  focusable,
  navigation,
}: {
  propertyId: number | null;
  propertyName?: string;
  propertyAddress?: string | null;
  owner?: { userId: number; email?: string };
  onClose: () => void;
  afterClose?: () => void;
  focusable?: ModalProps["focusable"];
  navigation?: ListNavigation;
}) {
  const [filterForm] = Form.useForm();
  const { params, page, size, update } = useScopedListState(navigation, "propertyTenant");
  const { keyword, tenantId, contractType, contractStatus, notifyEnabled } = readTenantFilters(params);
  const sort = useListSort({ fields: [{ value: "tenantId", label: "임차인 ID" }, { value: "createdAt", label: "등록 시각" }], defaultField: "tenantId", defaultDirection: "desc", navigation: { query: params.toString(), update } });
  const filters = Object.fromEntries(Object.entries({ keyword, tenantId, contractType, contractStatus, notifyEnabled }).filter(([, value]) => value !== undefined));
  const returnPath = navigation?.returnPath ?? `/properties?propertyTenantsId=${propertyId}`;
  useEffect(() => { if (propertyId !== null) filterForm.setFieldsValue({ keyword, tenantId, contractType, contractStatus, notifyEnabled }); }, [filterForm, propertyId, keyword, tenantId, contractType, contractStatus, notifyEnabled]);
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const { data, isLoading, error, isFetching, refetch } = usePropertyTenants(propertyId, page, size, { ...filters, ...sort.requestParams });

  useEffect(() => { if (propertyId !== null && data && !error && !isFetching) {
    const lastPage = Math.max(1, Math.ceil(data.totalElements / size));
    if (page > lastPage) update({ page: String(lastPage) }, true);
  } }, [propertyId, data, error, isFetching, page, size, update]);
  const filterKeys = TENANT_FILTER_KEYS.filter((key) => key !== "propertyId");
  function applyFilters(values: Record<string, string | number | boolean | undefined>) { update({ page: "1", ...Object.fromEntries(filterKeys.map((key) => [key, values[key] == null || values[key] === "" ? undefined : String(values[key]).trim() || undefined])) }); }
  function removeFilter(label: string) { const key = ({"검색": "keyword", "임차인 ID": "tenantId", "계약 유형": "contractType", "계약 상태": "contractStatus", "알림": "notifyEnabled"} as Record<string, string>)[label]; filterForm.setFieldValue(key, undefined); update({ page: "1", [key]: undefined }); }
  function resetFilters() { filterForm.setFieldsValue(Object.fromEntries(filterKeys.map((key) => [key, undefined]))); applyFilters({}); }

  function actions(tenant: PropertyTenant, mobile = false) {
    return <RowActions subject={`임차인 #${tenant.tenantId} ${tenant.name}`} primary={<ClientLinkButton size={mobile ? "large" : "small"} href={listDetailPath("/tenants", tenant.tenantId, returnPath)}>상세 보기</ClientLinkButton>}
      items={[
        { key: "edit", label: "임차인 정보 수정", onClick: () => setEditingTenantId(tenant.tenantId) },
        { key: "payments", label: "납부 내역 보기", href: relatedListPath("/payments", { tenantId: tenant.tenantId }, returnPath) },
        { key: "alimtalk", label: "알림톡 이력 보기", href: relatedListPath("/alimtalk", { userId: tenant.userId, tenantId: tenant.tenantId }, returnPath) },
      ]} />;
  }
  const recordDetails = (tenant: PropertyTenant) => <dl className="admin-record-fields">
    <div><dt>계약</dt><dd><TenantContractCell tenant={tenant} /></dd></div>
    <div><dt>관리비</dt><dd>{formatManwon(tenant.maintenanceFee)}</dd></div>
    <div><dt>보증금</dt><dd>{formatManwon(tenant.depositAmount)}</dd></div>
    <div><dt>알림 설정</dt><dd><TenantNotificationCell tenant={tenant} /></dd></div>
    <div><dt>임차인 ID</dt><dd>{tenant.tenantId}</dd></div>
    <div><dt>임대인</dt><dd><Link href={listDetailPath("/users", tenant.userId, returnPath)}>{tenant.userEmail || `유저 #${tenant.userId}`}</Link></dd></div>
    <div><dt>건물 ID</dt><dd>{tenant.propertyId}</dd></div>
  </dl>;
  const columns: TableColumnsType<PropertyTenant> = [
    { title: "임차인", key: "tenant", width: 240, render: (_, tenant) => <EntityCell primary={tenant.name} secondary={`호실 ${tenant.roomNumber} · 임차인 전화 ${tenant.phone || "없음"}`} meta={`임차인 #${tenant.tenantId}`} /> },
    { title: "임대료·납부 조건", key: "charges", width: 200, align: "right", className: "admin-numeric", render: (_, tenant) => <TenantChargesCell tenant={tenant} /> },
    { title: "계약", key: "contract", width: 220, render: (_, tenant) => <TenantContractCell tenant={tenant} /> },
    { title: "알림 설정", key: "notifications", width: 150, render: (_, tenant) => <TenantNotificationCell tenant={tenant} /> },
    {
      title: "작업",
      key: "action",
      width: 152,
      fixed: "right",
      align: "center",
      render: (_, tenant) => actions(tenant),
    },
  ];
  const compactColumns: TableColumnsType<PropertyTenant> = [
    { ...columns[0], width: 210 },
    { title: "임대료·납부 조건", key: "rent-summary", width: 200, align: "right", className: "admin-numeric", render: (_, tenant) => <EntityCell primary={formatRentSchedule(tenant.rentBillingCycle, tenant.rentPrice)} secondary={formatBillingSchedule(tenant.billingTiming, tenant.paymentDay)} /> },
    columns[4],
  ];

  return (
    <Modal
      title="임차인 보기"
      open={propertyId !== null}
      footer={null}
      width={1040}
      afterClose={afterClose}
      focusable={focusable}
      onCancel={() => {
        if (!navigation) update({ page: "1", ...Object.fromEntries(filterKeys.map((key) => [key, undefined])) });
        setEditingTenantId(null);
        onClose();
      }}
      destroyOnHidden
    >
      <div className="admin-context-panel" style={{ marginBottom: 20 }}>
        <EntityCell primary={propertyName || data?.tenants[0]?.propertyName || `건물 #${propertyId}`}
          secondary={propertyAddress === undefined ? "건물 주소 정보 없음" : propertyAddress || "주소 미등록"}
          meta={<span>건물 #{propertyId}{owner && <> · 임대인 <Link href={listDetailPath("/users", owner.userId, returnPath)}>{owner.email || `#${owner.userId}`}</Link></>}</span>} />
      </div>
      <FilterSection><Form form={filterForm} name={`property-${propertyId}-tenants-filters`} layout="vertical" className="admin-filter-bar" onFinish={applyFilters}>
        <TenantSearchFields showProperty={false} actions={<FilterActions><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={resetFilters}>필터 초기화</Button></Space></FilterActions>} />
      </Form></FilterSection>
      <FilterSummary filters={[
        ...(keyword ? [{ label: "검색", value: keyword }] : []), ...(tenantId ? [{ label: "임차인 ID", value: tenantId }] : []),
        ...(contractType ? [{ label: "계약 유형", value: CONTRACT_TYPE_OPTIONS.find((item) => item.value === contractType)?.label }] : []), ...(contractStatus ? [{ label: "계약 상태", value: CONTRACT_STATUS_OPTIONS.find((item) => item.value === contractStatus)?.label }] : []),
        ...(notifyEnabled !== undefined ? [{ label: "알림", value: notifyEnabled ? "활성" : "비활성" }] : []),
      ].map((filter) => ({ ...filter, onRemove: () => removeFilter(filter.label) }))} onReset={resetFilters} />
      <QueryErrorAlert error={error} title="건물 소속 임차인 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {(!error || data) && <PagedTable sortControl={sort.control}
        columns={columns}
        compactColumns={compactColumns}
        columnSizing={{
          tenant: { min: 300, preferred: 480, grow: 2 },
          charges: { min: 220 },
          "rent-summary": { min: 220 },
          contract: { min: 220, preferred: 260, grow: 0.5 },
          notifications: { min: 190 },
        }}
        renderCompactDetails={recordDetails}
        renderCard={(tenant) => <RecordCard title={tenant.name} subtitle={`호실 ${tenant.roomNumber} · 임차인 전화 ${tenant.phone || "없음"}`} meta={`임차인 #${tenant.tenantId}`} ariaLabel={`임차인 #${tenant.tenantId} ${tenant.name}`}
          extra={<Tag>{CONTRACT_TYPE_OPTIONS.find((option) => option.value === tenant.contractType)?.label ?? "임대 계약"}</Tag>}
          fields={[
            { label: "임대료", value: formatRentSchedule(tenant.rentBillingCycle, tenant.rentPrice) },
            { label: "납부 조건", value: formatBillingSchedule(tenant.billingTiming, tenant.paymentDay) },
            { label: "계약 기간", value: `${tenant.startDate} → ${tenant.endDate ?? "종료일 없음"}` },
          ]} details={recordDetails(tenant)} actions={actions(tenant, true)} />}
        dataSource={data?.tenants ?? []}
        loading={isLoading}
        rowKey={(tenant) => String(tenant.tenantId)} ariaLabel="건물 소속 임차인 목록"
        page={page} pageSize={size} total={data?.totalElements ?? 0}
        onPageChange={(nextPage, nextSize) => update({ page: String(nextSize === size ? nextPage : 1), size: String(nextSize) })}
        emptyText="조건에 맞는 임차인이 없습니다. 필터를 초기화해 주세요."
      />}
      {editingTenantId != null && (
        <TenantEditDrawerById tenantId={editingTenantId} onClose={() => setEditingTenantId(null)} />
      )}
    </Modal>
  );
}
