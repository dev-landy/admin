"use client";

import type { ListSortControl } from "@/lib/navigation/useListSort";

import Link from "next/link";
import { Tag } from "antd";
import type { TableColumnsType } from "antd";

import { ClientLinkButton } from "@/components/ClientLinkButton";
import { EntityCell } from "@/components/EntityCell";
import { PagedTable } from "@/components/PagedTable";
import { RowActions } from "@/components/RowActions";
import { RecordCard } from "@/components/RecordCard";
import { formatYearMonth } from "@/lib/format/date";
import { listDetailPath, relatedListPath } from "@/lib/navigation/listReturn";
import type { DuplicateGroup } from "../types";

type Props = {
  sortControl?: ListSortControl;
  returnPath?: string;
  data: DuplicateGroup[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, size: number) => void;
};

export function DuplicateTable({ sortControl, data, loading, page, pageSize, total, onPageChange, returnPath = "/payments/duplicates" }: Props) {
  const tenant = (group: DuplicateGroup) => <Link href={listDetailPath("/tenants", group.tenantId, returnPath)}>{group.tenantName || `임차인 #${group.tenantId}`}</Link>;
  const building = (group: DuplicateGroup) => <span>{group.propertyId ? <Link href={relatedListPath("/properties", { propertyId: group.propertyId, propertyTenantsId: group.propertyId }, returnPath)}>{group.propertyName || `건물 #${group.propertyId}`}</Link> : "건물 정보 없음"}{group.roomNumber != null && ` · 호실 ${group.roomNumber}`}</span>;
  const owner = (group: DuplicateGroup) => group.userId ? <Link href={listDetailPath("/users", group.userId, returnPath)}>{group.userEmail || `임대인 #${group.userId}`}</Link> : "임대인 정보 없음";
  function actions(group: DuplicateGroup, mobile = false) {
    return <RowActions subject={`임차인 #${group.tenantId} ${formatYearMonth(group.billingMonth)} 중복 납부`}
      primary={<ClientLinkButton size={mobile ? "large" : "small"} href={relatedListPath("/payments", { tenantId: group.tenantId, from: group.billingMonth, to: group.billingMonth }, returnPath)}>납부 비교</ClientLinkButton>}
      items={[
        { key: "tenant", label: "임차인 상세 보기", href: listDetailPath("/tenants", group.tenantId, returnPath) },
        { type: "divider" },
        ...group.paymentIds.map((paymentId) => ({ key: `payment-${paymentId}`, label: `납부 #${paymentId} 보기`, href: relatedListPath("/payments", { paymentId }, returnPath) })),
      ]} />;
  }
  const recordDetails = (group: DuplicateGroup) => <dl className="admin-record-fields">
    <div><dt>모든 납부 내역</dt><dd className="admin-cell-stack">{group.paymentIds.map((paymentId) => <Link key={paymentId} href={relatedListPath("/payments", { paymentId }, returnPath)}>납부 #{paymentId}</Link>)}</dd></div>
    <div><dt>임차인 ID</dt><dd>{group.tenantId}</dd></div>
    <div><dt>건물 ID</dt><dd>{group.propertyId ?? "정보 없음"}</dd></div>
    <div><dt>유저 ID</dt><dd>{group.userId ?? "정보 없음"}</dd></div>
  </dl>;
  const columns: TableColumnsType<DuplicateGroup> = [
    { title: "중복 대상", key: "tenant", width: 260, render: (_, group) => <EntityCell
      primary={tenant(group)}
      secondary={building(group)}
      meta={`임차인 #${group.tenantId}`} /> },
    { title: "임대인", key: "owner", width: 180, render: (_, group) => <EntityCell
      primary={owner(group)}
      meta={group.userId ? `유저 #${group.userId}` : undefined} /> },
    { title: "청구월", dataIndex: "billingMonth", width: 140, render: formatYearMonth },
    {
      title: "중복 내역", key: "duplicates", width: 220,
      render: (_, group) => <EntityCell primary={<Tag color="red">{group.count}건</Tag>}
        secondary={`납부 ${group.paymentIds.slice(0, 2).map((id) => `#${id}`).join(" · ")}${group.paymentIds.length > 2 ? ` 외 ${group.paymentIds.length - 2}건` : ""}`} />,
    },
    {
      title: "작업", key: "actions", width: 152, fixed: "right", align: "center",
      render: (_, group) => actions(group),
    },
  ];
  const compactColumns: TableColumnsType<DuplicateGroup> = [
    { title: "중복 대상·임대인", key: "target-summary", width: 280, render: (_, group) => <EntityCell primary={tenant(group)} secondary={building(group)} meta={group.userId ? <span>임대인 {owner(group)}</span> : owner(group)} /> },
    { title: "청구월·중복", key: "duplicate-summary", width: 170, render: (_, group) => <EntityCell primary={formatYearMonth(group.billingMonth)} secondary={<Tag color="red">중복 {group.count}건</Tag>} /> },
    columns[4],
  ];
  return <PagedTable sortControl={sortControl} columns={columns} compactColumns={compactColumns} renderCompactDetails={recordDetails}
    columnSizing={{
      tenant: { min: 300, preferred: 520, grow: 2 },
      owner: { min: 260, preferred: 420, grow: 2 },
      "target-summary": { min: 320, preferred: 580, grow: 2 },
      "duplicate-summary": { min: 180 },
    }}
    renderCard={(group) => <RecordCard title={tenant(group)} subtitle={building(group)} meta={`임차인 #${group.tenantId}`} ariaLabel={`임차인 #${group.tenantId} ${formatYearMonth(group.billingMonth)} 중복 납부`}
      extra={<Tag color="red">중복 {group.count}건</Tag>} fields={[
        { label: "청구월", value: formatYearMonth(group.billingMonth) },
        { label: "임대인", value: owner(group) },
      ]} details={recordDetails(group)} actions={actions(group, true)} />}
    dataSource={data} loading={loading} page={page} pageSize={pageSize} total={total}
    onPageChange={onPageChange} rowKey={(group) => `${group.tenantId}-${group.billingMonth}`} ariaLabel="중복 납부 목록"
    emptyText="중복으로 감지된 납부가 없습니다." />;
}
