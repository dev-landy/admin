"use client";

import Link from "next/link";
import { Tag } from "antd";

import { EntityCell } from "@/components/EntityCell";
import { formatManwon } from "@/lib/format/currency";
import { listDetailPath, relatedListPath } from "@/lib/navigation/listReturn";
import { CONTRACT_TYPE_OPTIONS } from "../listFilters";
import { formatRentSchedule } from "../billingCycle";
import { formatBillingSchedule } from "../billingTiming";
import type { TenantSummary } from "../types";

type TenantRecord = Omit<Pick<TenantSummary,
  "tenantId" | "userId" | "name" | "roomNumber" | "rentPrice" | "paymentDay" |
  "billingTiming" | "rentBillingCycle" | "startDate" | "endDate" | "notifyEnabled"
>, "roomNumber"> & { roomNumber: number | string | null } & Partial<Pick<TenantSummary,
  "phone" | "propertyId" | "propertyName" | "userEmail" | "maintenanceFee" |
  "depositAmount" | "contractType" | "dueAlimtalkEnabled" | "parkingEnabled" | "vehicleNumber"
>>;

type Props = { tenant: TenantRecord; returnPath: string };

export function TenantIdentityCell({ tenant }: { tenant: TenantRecord }) {
  return <EntityCell primary={tenant.name} secondary={tenant.phone || "전화번호 없음"} meta={`임차인 #${tenant.tenantId}`} />;
}

export function TenantLocationCell({ tenant, returnPath, showOwner = true, showIds = true }: Props & { showOwner?: boolean; showIds?: boolean }) {
  return <EntityCell
    primary={tenant.propertyId ? <Link href={relatedListPath("/properties", {
      propertyId: tenant.propertyId, propertyTenantsId: tenant.propertyId,
    }, returnPath)}>{tenant.propertyName ?? `건물 #${tenant.propertyId}`}</Link> : "건물 정보 없음"}
    secondary={tenant.roomNumber != null && tenant.roomNumber !== "" ? `호실 ${tenant.roomNumber}` : "호실 정보 없음"}
    meta={showOwner ? <div className="admin-cell-stack"><Link href={listDetailPath("/users", tenant.userId, returnPath)}>
      임대인 {tenant.userEmail || `#${tenant.userId}`}
    </Link>{showIds && <span>유저 #{tenant.userId}{tenant.propertyId ? ` · 건물 #${tenant.propertyId}` : ""}</span>}</div> : showIds && tenant.propertyId ? `건물 #${tenant.propertyId}` : undefined}
  />;
}

/** Compact rows keep four task-identifying lines; exact IDs remain in expanded details. */
export function TenantCompactIdentityCell({ tenant, returnPath, showOwner = true }: Props & { showOwner?: boolean }) {
  return <EntityCell primary={tenant.name} secondary={tenant.phone || "전화번호 없음"} meta={<div className="admin-cell-stack">
    {tenant.propertyId ? <Link href={relatedListPath("/properties", { propertyId: tenant.propertyId, propertyTenantsId: tenant.propertyId }, returnPath)}>
      {tenant.propertyName ?? `건물 #${tenant.propertyId}`} · {tenant.roomNumber != null && tenant.roomNumber !== "" ? `호실 ${tenant.roomNumber}` : "호실 정보 없음"}
    </Link> : <span>건물 정보 없음 · {tenant.roomNumber != null && tenant.roomNumber !== "" ? `호실 ${tenant.roomNumber}` : "호실 정보 없음"}</span>}
    {showOwner && <Link href={listDetailPath("/users", tenant.userId, returnPath)}>임대인 {tenant.userEmail || `#${tenant.userId}`}</Link>}
  </div>} />;
}

export function TenantReferencesCell({ tenant, returnPath }: Props) {
  return <EntityCell primary={<Link href={listDetailPath("/tenants", tenant.tenantId, returnPath)}>임차인 #{tenant.tenantId}</Link>}
    secondary={tenant.propertyId ? <Link href={relatedListPath("/properties", { propertyId: tenant.propertyId, propertyTenantsId: tenant.propertyId }, returnPath)}>건물 #{tenant.propertyId}</Link> : "건물 정보 없음"}
    meta={<Link href={listDetailPath("/users", tenant.userId, returnPath)}>유저 #{tenant.userId}</Link>} />;
}

export function TenantContractCell({ tenant }: { tenant: TenantRecord }) {
  return <EntityCell
    primary={CONTRACT_TYPE_OPTIONS.find((option) => option.value === tenant.contractType)?.label ?? "임대 계약"}
    secondary={<span>{tenant.startDate} → {tenant.endDate ?? "종료일 없음"}</span>}
    meta={tenant.vehicleNumber ? `차량 ${tenant.vehicleNumber}` : tenant.parkingEnabled ? "주차 포함" : undefined}
  />;
}

export function TenantChargesCell({ tenant }: { tenant: TenantRecord }) {
  return <EntityCell
    primary={formatRentSchedule(tenant.rentBillingCycle, tenant.rentPrice)}
    secondary={<div className="admin-cell-stack">
      <span>관리비 {formatManwon(tenant.maintenanceFee)}</span>
      <span>보증금 {formatManwon(tenant.depositAmount)}</span>
    </div>}
    meta={formatBillingSchedule(tenant.billingTiming, tenant.paymentDay)}
  />;
}

export function TenantNotificationCell({ tenant }: { tenant: TenantRecord }) {
  return <div className="admin-cell-stack">
    <span>임대인 알림 <Tag color={tenant.notifyEnabled ? "green" : "default"}>{tenant.notifyEnabled ? "켜짐" : "꺼짐"}</Tag></span>
    {tenant.dueAlimtalkEnabled !== undefined && <span>세입자 알림톡 <Tag color={tenant.dueAlimtalkEnabled ? "green" : "default"}>
      {tenant.dueAlimtalkEnabled ? "수신" : "미수신"}
    </Tag></span>}
  </div>;
}
