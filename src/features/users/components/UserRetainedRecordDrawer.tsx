"use client";

import { Descriptions, Drawer, Typography } from "antd";
import { useAdminViewport } from "@/components/useAdminViewport";
import { formatTechnicalDateTime } from "@/lib/format/date";
import { formatManwon } from "@/lib/format/currency";
import { formatRentSchedule } from "@/features/tenants/billingCycle";
import { formatBillingSchedule } from "@/features/tenants/billingTiming";
import { CONTRACT_TYPE_OPTIONS } from "@/features/tenants/listFilters";
import type { UserPropertySummary } from "@/features/properties/types";
import type { AdminUserTenant } from "../types";

export function UserRetainedTenantDetails({ tenant }: { tenant: AdminUserTenant }) {
  const viewport = useAdminViewport();
  const room = tenant.roomNumber != null && tenant.roomNumber !== "" ? String(tenant.roomNumber) : "호실 정보 없음";
  return <Descriptions bordered column={1} size="small" layout={viewport === "mobile" ? "vertical" : "horizontal"} items={[
    { key: "name", label: "임차인", children: tenant.name },
    { key: "phone", label: "연락처", children: tenant.phone || "전화번호 없음" },
    { key: "tenantId", label: "임차인 ID", children: tenant.tenantId },
    { key: "userId", label: "사용자 ID", children: tenant.userId },
    { key: "property", label: "건물", children: tenant.propertyName || "건물명 정보 없음" },
    { key: "propertyId", label: "건물 ID", children: tenant.propertyId ?? "정보 없음" },
    { key: "room", label: "호실", children: room },
    { key: "type", label: "계약 유형", children: CONTRACT_TYPE_OPTIONS.find((option) => option.value === tenant.contractType)?.label ?? "정보 없음" },
    { key: "start", label: "계약 시작", children: tenant.startDate },
    { key: "end", label: "계약 종료", children: tenant.endDate ?? "종료일 없음" },
    { key: "rent", label: "임대료", children: formatRentSchedule(tenant.rentBillingCycle, tenant.rentPrice) },
    { key: "maintenance", label: "관리비", children: formatManwon(tenant.maintenanceFee) },
    { key: "deposit", label: "보증금", children: formatManwon(tenant.depositAmount) },
    { key: "billing", label: "납부 조건", children: formatBillingSchedule(tenant.billingTiming, tenant.paymentDay) },
    { key: "notify", label: "저장된 임대인 알림 설정", children: tenant.notifyEnabled ? "켜짐" : "꺼짐" },
    { key: "created", label: "등록 시각", children: formatTechnicalDateTime(tenant.createdAt) },
    { key: "deleted", label: "삭제 시각", children: tenant.deletedAt == null ? "삭제되지 않음" : formatTechnicalDateTime(tenant.deletedAt) },
  ]} />;
}

export function UserRetainedTenantDrawer({ tenant, onClose }: { tenant: AdminUserTenant | null; onClose: () => void }) {
  return <Drawer title={tenant ? `보관 임차인 #${tenant.tenantId}` : "보관 임차인"} open={tenant !== null} onClose={onClose} size="min(620px, 100vw)" destroyOnHidden>
    {tenant && <><Typography.Paragraph type="secondary">현재 보관된 값만 표시합니다. 수정하거나 알림을 발송할 수 없습니다.</Typography.Paragraph><UserRetainedTenantDetails tenant={tenant} /></>}
  </Drawer>;
}

export function UserRetainedPropertyDrawer({ property, onClose }: { property: UserPropertySummary | null; onClose: () => void }) {
  const viewport = useAdminViewport();
  return <Drawer title={property ? `보관 건물 #${property.propertyId}` : "보관 건물"} open={property !== null} onClose={onClose} size="min(560px, 100vw)" destroyOnHidden>
    {property && <Descriptions bordered column={1} size="small" layout={viewport === "mobile" ? "vertical" : "horizontal"} items={[
      { key: "name", label: "건물명", children: property.name },
      { key: "address", label: "주소", children: property.address || "주소 정보 없음" },
      { key: "id", label: "건물 ID", children: property.propertyId },
      { key: "retained", label: "보관 임차인", children: property.retainedTenantCount == null ? "정보 없음" : `${property.retainedTenantCount}건` },
      { key: "active", label: "현재 활성 계약", children: `${property.activeTenantCount}건` },
      { key: "created", label: "등록 시각", children: formatTechnicalDateTime(property.createdAt) },
      { key: "updated", label: "수정 시각", children: formatTechnicalDateTime(property.updatedAt) },
      { key: "deleted", label: "삭제 시각", children: property.deletedAt == null ? "삭제되지 않음" : formatTechnicalDateTime(property.deletedAt) },
    ]} />}
  </Drawer>;
}
