"use client";

import type { ListSortControl } from "@/lib/navigation/useListSort";

import { useRouter } from "next/navigation";
import { App, Button } from "antd";
import type { TableColumnsType } from "antd";

import { RecordCard } from "@/components/RecordCard";
import { EntityCell } from "@/components/EntityCell";
import { formatManwon } from "@/lib/format/currency";
import { formatRentSchedule } from "../billingCycle";
import { formatBillingSchedule } from "../billingTiming";
import { RowActions } from "@/components/RowActions";
import { PagedTable } from "@/components/PagedTable";
import { parseProblemDetail } from "@/lib/api/problem";
import { listDetailPath, relatedListPath } from "@/lib/navigation/listReturn";
import { useDeleteTenant } from "../hooks";
import type { TenantSummary } from "../types";
import { TenantChargesCell, TenantContractCell, TenantIdentityCell, TenantCompactIdentityCell, TenantReferencesCell, TenantLocationCell, TenantNotificationCell } from "./TenantRecordCells";

type Props = {
  sortControl?: ListSortControl;
  returnPath?: string;
  data: TenantSummary[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number, s: number) => void;
  filters: { userId?: number; notifyEnabled?: boolean; startDate?: string; endDate?: string };
  onFilterChange: (key: string, value: boolean | number | string | undefined) => void;
};

export function TenantTable({ sortControl, returnPath = "/tenants", data, loading, page, pageSize, total, onPageChange }: Props) {
  const router = useRouter();
  const { notification } = App.useApp();
  const { mutateAsync: deleteTenant, isPending: isDeleting, variables: deletingId } = useDeleteTenant();

  function renderActions(tenant: TenantSummary) { return <RowActions subject={`임차인 #${tenant.tenantId}`} loading={isDeleting && deletingId === tenant.tenantId} disabled={isDeleting}
        primary={<Button size="small" onClick={() => router.push(listDetailPath("/tenants", tenant.tenantId, returnPath))}>상세</Button>}
        items={[
          { key: "payments", label: "납부 내역", href: relatedListPath("/payments", { tenantId: tenant.tenantId, userId: tenant.userId }, returnPath) },
          { key: "alimtalk", label: "알림톡 내역", href: relatedListPath("/alimtalk", { tenantId: tenant.tenantId, userId: tenant.userId }, returnPath) },
          { type: "divider" },
          {
            key: "delete", label: "임차인 삭제", danger: true,
            confirm: { title: "임차인을 삭제하시겠습니까?", description: `임차인 #${tenant.tenantId} · ${tenant.name} 계약을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`, okText: "삭제" },
            onClick: () => deleteTenant(tenant.tenantId, {
              onSuccess: () => notification.success({ title: `임차인 #${tenant.tenantId}를 삭제했습니다.` }),
              onError: (error) => { const problem = parseProblemDetail(error); notification.error({ title: problem?.title ?? "삭제 실패", description: problem?.detail }); },
            }),
          },
        ]}
      />; }

  const columns: TableColumnsType<TenantSummary> = [
    { title: "임차인", key: "identity", width: 180, render: (_, tenant) => <TenantIdentityCell tenant={tenant} /> },
    { title: "건물·임대인", key: "location", width: 220, render: (_, tenant) => <TenantLocationCell tenant={tenant} returnPath={returnPath} /> },
    { title: "계약", key: "contract", width: 190, render: (_, tenant) => <TenantContractCell tenant={tenant} /> },
    { title: "청구·금액", key: "charges", width: 210, className: "admin-numeric", render: (_, tenant) => <TenantChargesCell tenant={tenant} /> },
    { title: "알림 설정", key: "notify", width: 165, render: (_, tenant) => <TenantNotificationCell tenant={tenant} /> },
    {
      title: "작업", key: "action", width: 124, fixed: "right",
      render: (_, tenant) => renderActions(tenant),
    },
  ];

  const compactColumns: TableColumnsType<TenantSummary> = [
    { title: "임차인·공간", key: "identity", width: 290, render: (_, tenant) => <TenantCompactIdentityCell tenant={tenant} returnPath={returnPath} /> },
    { title: "계약·청구", key: "terms", width: 260, render: (_, tenant) => <EntityCell primary={formatRentSchedule(tenant.rentBillingCycle, tenant.rentPrice)} secondary={`${tenant.startDate} → ${tenant.endDate ?? "종료일 없음"}`} meta={formatBillingSchedule(tenant.billingTiming, tenant.paymentDay)} /> },
    columns[5],
  ];
  const wideColumns: TableColumnsType<TenantSummary> = [columns[0], columns[1], columns[2],
    { title: "임대료", key: "rent", width: 160, className: "admin-numeric", render: (_, tenant) => formatRentSchedule(tenant.rentBillingCycle, tenant.rentPrice) },
    { title: "관리비", dataIndex: "maintenanceFee", width: 110, className: "admin-numeric", render: formatManwon },
    { title: "보증금", dataIndex: "depositAmount", width: 130, className: "admin-numeric", render: formatManwon },
    { title: "납부 조건", key: "billing", width: 140, render: (_, tenant) => formatBillingSchedule(tenant.billingTiming, tenant.paymentDay) },
    columns[4], columns[5],
  ];
  function renderDetails(tenant: TenantSummary) { return <div className="admin-detail-grid"><TenantReferencesCell tenant={tenant} returnPath={returnPath} /><TenantContractCell tenant={tenant} /><TenantChargesCell tenant={tenant} /><TenantNotificationCell tenant={tenant} /></div>; }

  return <PagedTable sortControl={sortControl} columns={wideColumns} compactColumns={compactColumns} renderCompactDetails={renderDetails}
    columnSizing={{
      identity: { preferred: 420, grow: 1 },
      location: { min: 280, preferred: 440, grow: 2 },
      contract: { min: 220, preferred: 240, grow: 0.5 },
      terms: { min: 260, preferred: 360, grow: 1 },
      notify: { min: 190 },
    }}
    renderCard={(tenant) => <RecordCard ariaLabel={`임차인 #${tenant.tenantId} ${tenant.name}`} title={tenant.name}
      subtitle={tenant.phone || "전화번호 미등록"} meta={`임차인 #${tenant.tenantId}`}
      fields={[{ label: "건물·호실", value: <TenantLocationCell tenant={tenant} returnPath={returnPath} showIds={false} /> },
        { label: "계약", value: <TenantContractCell tenant={tenant} /> },
        { label: "청구·금액", value: <TenantChargesCell tenant={tenant} /> }]}
      details={<div className="admin-detail-grid"><TenantReferencesCell tenant={tenant} returnPath={returnPath} /><TenantNotificationCell tenant={tenant} /></div>} actions={renderActions(tenant)} />}
    dataSource={data} loading={loading} rowKey={(tenant) => String(tenant.tenantId)}
    page={page} pageSize={pageSize} total={total} onPageChange={onPageChange}
    ariaLabel="임차인 목록" emptyText="조건에 맞는 임차인이 없습니다. 필터를 초기화하거나 다른 검색어로 조회해 주세요." />;
}
