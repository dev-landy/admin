"use client";

import { useRouter } from "next/navigation";
import { listDetailPath } from "@/lib/navigation/listReturn";
import { App, Button, Popconfirm, Select, Space, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { DateFilterDropdown } from "@/components/DateFilterDropdown";
import { IdFilterDropdown } from "@/components/IdFilterDropdown";
import { PagedTable } from "@/components/PagedTable";
import { parseProblemDetail } from "@/lib/api/problem";
import { formatManwon } from "@/lib/format/currency";
import { formatRentSchedule } from "../billingCycle";
import { formatBillingSchedule } from "../billingTiming";
import { useDeleteTenant } from "../hooks";
import type { TenantSummary } from "../types";

type Props = {
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

export function TenantTable({
  returnPath = "/tenants",
  data,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  filters,
  onFilterChange,
}: Props) {
  const router = useRouter();
  const { notification } = App.useApp();
  const { mutate: deleteTenant, isPending: isDeleting, variables: deletingId } = useDeleteTenant();

  const columns: TableColumnsType<TenantSummary> = [
    { title: "임차인 ID", dataIndex: "tenantId", width: 120, align: "center" },
    {
      title: "유저 ID",
      dataIndex: "userId",
      width: 110,
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
    { title: "이름", dataIndex: "name", align: "center" },
    { title: "호실", dataIndex: "roomNumber", width: 80, align: "center" },
    {
      title: "임대료",
      key: "rentSchedule",
      align: "right",
      className: "admin-numeric",
      render: (_: unknown, record: TenantSummary) =>
        formatRentSchedule(record.rentBillingCycle, record.rentPrice),
    },
    {
      title: "관리비",
      dataIndex: "maintenanceFee",
      align: "right",
      className: "admin-numeric",
      render: (v: number | null | undefined) => formatManwon(v),
    },
    {
      title: "보증금",
      dataIndex: "depositAmount",
      align: "right",
      className: "admin-numeric",
      render: (v: number | null | undefined) => formatManwon(v),
    },
    {
      title: "납부 조건",
      key: "billingSchedule",
      width: 140,
      align: "center",
      render: (_: unknown, record: TenantSummary) =>
        formatBillingSchedule(record.billingTiming, record.paymentDay),
    },
    {
      title: "계약 시작일",
      dataIndex: "startDate",
      width: 130,
      align: "center",
      filteredValue: filters.startDate === undefined ? null : [filters.startDate],
      filterDropdown: () => (
        <DateFilterDropdown
          value={filters.startDate}
          onApply={(value) => onFilterChange("startDate", value)}
        />
      ),
    },
    {
      title: "계약 종료일",
      dataIndex: "endDate",
      width: 130,
      align: "center",
      filteredValue: filters.endDate === undefined ? null : [filters.endDate],
      filterDropdown: () => (
        <DateFilterDropdown
          value={filters.endDate}
          onApply={(value) => onFilterChange("endDate", value)}
        />
      ),
      render: (v: string | null) => v ?? "-",
    },
    {
      title: "알림",
      dataIndex: "notifyEnabled",
      width: 90,
      align: "center",
      filteredValue: filters.notifyEnabled === undefined ? null : [filters.notifyEnabled],
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            placeholder="전체"
            value={filters.notifyEnabled}
            style={{ width: 120 }}
            onChange={(v) => onFilterChange("notifyEnabled", v)}
            options={[{ label: "활성", value: true }, { label: "비활성", value: false }]}
          />
        </div>
      ),
      render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "활성" : "비활성"}</Tag>,
    },
    {
      title: "알림톡",
      dataIndex: "dueAlimtalkEnabled",
      width: 90,
      align: "center",
      render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "수신" : "미수신"}</Tag>,
    },
    {
      title: "동작",
      key: "action",
      width: 160,
      align: "center",
      render: (_: unknown, record: TenantSummary) => (
        <Space wrap>
          <Button size="small" onClick={() => router.push(listDetailPath("/tenants", record.tenantId, returnPath))}>상세</Button>
          <Popconfirm
            title="임차인을 삭제하시겠습니까?"
            description={`임차인 #${record.tenantId} · ${record.name} 계약을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`}
            okText="삭제" cancelText="취소" okButtonProps={{ danger: true }} disabled={isDeleting}
            onConfirm={() =>
              deleteTenant(record.tenantId, {
                onSuccess: () => notification.success({ title: `임차인 #${record.tenantId}를 삭제했습니다.` }),
                onError: (err) => {
                  const p = parseProblemDetail(err);
                  notification.error({ title: p?.title ?? "삭제 실패", description: p?.detail });
                },
              })
            }
          >
            <Button size="small" danger loading={isDeleting && deletingId === record.tenantId} disabled={isDeleting}>삭제</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PagedTable
      columns={columns}
      dataSource={data}
      loading={loading}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      rowKey={(r) => String(r.tenantId)}
      ariaLabel="임차인 목록"
      emptyText="조건에 맞는 임차인이 없습니다. 필터를 초기화하거나 다른 조건으로 조회해 주세요."
    />
  );
}
