"use client";

import type { ListSortControl } from "@/lib/navigation/useListSort";

import Link from "next/link";
import { Tag } from "antd";
import type { TableColumnsType } from "antd";

import { EntityCell } from "@/components/EntityCell";
import { PagedTable } from "@/components/PagedTable";
import { RecordCard } from "@/components/RecordCard";
import { RowActions } from "@/components/RowActions";
import { ClientLinkButton } from "@/components/ClientLinkButton";
import { formatDateTime, formatKoreanDate, formatTechnicalDateTime, formatYearMonth } from "@/lib/format/date";
import { listDetailPath, relatedListPath } from "@/lib/navigation/listReturn";
import { PAYMENT_SOURCE_PRESENTATION } from "../paymentSource";
import type { Payment, PaymentSource } from "../types";

type Props = {
  sortControl?: ListSortControl;
  returnPath?: string;
  data: Payment[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, size: number) => void;
  filters: { source?: PaymentSource; userId?: number; tenantId?: number };
  onFilterChange: (key: string, value: string | number | undefined) => void;
};

export function PaymentTable({ sortControl, data, loading, page, pageSize, total, onPageChange, returnPath = "/payments" }: Props) {
  const tenant = (payment: Payment) => <Link href={listDetailPath("/tenants", payment.tenantId, returnPath)}>{payment.tenantName || `임차인 #${payment.tenantId}`}</Link>;
  const building = (payment: Payment) => <span>{payment.propertyId ? <Link href={relatedListPath("/properties", { propertyId: payment.propertyId, propertyTenantsId: payment.propertyId }, returnPath)}>{payment.propertyName || `건물 #${payment.propertyId}`}</Link> : "건물 정보 없음"}{payment.roomNumber != null && ` · 호실 ${payment.roomNumber}`}</span>;
  const owner = (payment: Payment) => <Link href={listDetailPath("/users", payment.userId, returnPath)}>{payment.userEmail || `임대인 #${payment.userId}`}</Link>;
  const sourceTag = (payment: Payment) => <Tag color={PAYMENT_SOURCE_PRESENTATION[payment.paymentSource].color}>{PAYMENT_SOURCE_PRESENTATION[payment.paymentSource].label}</Tag>;
  const recordDetails = (payment: Payment, showOwner = true) => <dl className="admin-record-fields">
    {showOwner && <div><dt>임대인</dt><dd>{owner(payment)}</dd></div>}
    <div><dt>납부 ID</dt><dd>{payment.paymentId}</dd></div>
    <div><dt>임차인 ID</dt><dd>{payment.tenantId}</dd></div>
    <div><dt>건물 ID</dt><dd>{payment.propertyId ?? "정보 없음"}</dd></div>
    <div><dt>유저 ID</dt><dd>{payment.userId}</dd></div>
    <div><dt>실제 납부일</dt><dd>{payment.paidAt}</dd></div>
    <div><dt>수정 시각</dt><dd>{formatTechnicalDateTime(payment.updatedAt)}</dd></div>
  </dl>;
  const columns: TableColumnsType<Payment> = [
    {
      title: "청구월", key: "billingMonth", width: 140,
      render: (_, payment) => <EntityCell primary={formatYearMonth(payment.billingMonth)} meta={`납부 #${payment.paymentId}`} />,
    },
    {
      title: "납부 대상", key: "target", width: 280,
      render: (_, payment) => <EntityCell
        primary={tenant(payment)}
        secondary={building(payment)}
        meta={`임차인 #${payment.tenantId}${payment.propertyId ? ` · 건물 #${payment.propertyId}` : ""}`} />,
    },
    {
      title: "임대인", key: "owner", width: 190,
      render: (_, payment) => <EntityCell primary={owner(payment)} meta={`유저 #${payment.userId}`} />,
    },
    {
      title: "납부 금액", key: "amount", width: 156, align: "right", className: "admin-numeric",
      render: (_, payment) => <EntityCell primary={`${payment.amount.toLocaleString("ko-KR")}원`} secondary={sourceTag(payment)} />,
    },
    {
      title: "실제 납부일", key: "paidAt", width: 174,
      render: (_, payment) => <EntityCell primary={formatKoreanDate(payment.paidAt)} meta={`수정 ${formatDateTime(payment.updatedAt)}`} />,
    },
  ];
  const compactColumns: TableColumnsType<Payment> = [
    { ...columns[1], width: 260 },
    columns[0],
    { title: "금액·실제 납부일", key: "paid-summary", width: 220, align: "right", className: "admin-numeric", render: (_, payment) => <EntityCell primary={`${payment.amount.toLocaleString("ko-KR")}원`} secondary={sourceTag(payment)} meta={formatKoreanDate(payment.paidAt)} /> },
  ];

  return <PagedTable sortControl={sortControl} columns={columns} compactColumns={compactColumns} renderCompactDetails={(payment) => recordDetails(payment)}
    columnSizing={{
      target: { min: 300, preferred: 560, grow: 2 },
      owner: { min: 260, preferred: 420, grow: 1 },
      amount: { min: 180 },
      paidAt: { min: 180, preferred: 220, grow: 0.5 },
      "paid-summary": { min: 240 },
    }}
    renderCard={(payment) => <RecordCard title={tenant(payment)} subtitle={building(payment)} meta={`납부 #${payment.paymentId}`} ariaLabel={`납부 #${payment.paymentId} ${payment.tenantName || `임차인 #${payment.tenantId}`}`}
      extra={sourceTag(payment)} fields={[
        { label: "청구월", value: formatYearMonth(payment.billingMonth) },
        { label: "납부 금액", value: `${payment.amount.toLocaleString("ko-KR")}원` },
        { label: "실제 납부일", value: formatKoreanDate(payment.paidAt) },
        { label: "임대인", value: owner(payment) },
      ]} details={recordDetails(payment, false)} actions={<RowActions subject={`납부 #${payment.paymentId}`}
        primary={<ClientLinkButton size="large" href={listDetailPath("/tenants", payment.tenantId, returnPath)}>임차인 보기</ClientLinkButton>}
        items={[
          { key: "owner", label: "임대인 상세 보기", href: listDetailPath("/users", payment.userId, returnPath) },
          ...(payment.propertyId ? [{ key: "property", label: "건물의 임차인 보기", href: relatedListPath("/properties", { propertyId: payment.propertyId, propertyTenantsId: payment.propertyId }, returnPath) }] : []),
        ]} />} />}
    dataSource={data} loading={loading} page={page} pageSize={pageSize} total={total}
    onPageChange={onPageChange} rowKey={(payment) => String(payment.paymentId)} ariaLabel="납부 목록"
    emptyText="조건에 맞는 납부 내역이 없습니다. 필터를 초기화하거나 청구월을 확인해 주세요." />;
}
