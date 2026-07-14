"use client";

import { useRouter } from "next/navigation";
import { App, Button, Popconfirm, Select, Space, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { DateFilterDropdown } from "@/components/DateFilterDropdown";
import { IdFilterDropdown } from "@/components/IdFilterDropdown";
import { PagedTable } from "@/components/PagedTable";
import { parseProblemDetail } from "@/lib/api/problem";
import { formatManwon } from "@/lib/format/currency";
import { useDeleteTenant } from "../hooks";
import type { TenantSummary } from "../types";

type Props = {
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
  const { mutate: deleteTenant, isPending: isDeleting } = useDeleteTenant();

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
    { title: "월세", dataIndex: "rentPrice", align: "center", render: (v: number) => formatManwon(v) },
    {
      title: "보증금",
      dataIndex: "depositAmount",
      align: "center",
      render: (v: number | null | undefined) => formatManwon(v),
    },
    {
      title: "납부일",
      dataIndex: "paymentDay",
      width: 90,
      align: "center",
      render: (v: number) => `매월 ${v}일`,
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
      title: "액션",
      key: "action",
      width: 160,
      align: "center",
      render: (_: unknown, record: TenantSummary) => (
        <Space>
          <Button size="small" onClick={() => router.push(`/tenants/${record.tenantId}`)}>상세</Button>
          <Popconfirm
            title="임차인을 삭제하시겠습니까?"
            onConfirm={() =>
              deleteTenant(record.tenantId, {
                onError: (err) => {
                  const p = parseProblemDetail(err);
                  notification.error({ message: p?.title ?? "삭제 실패", description: p?.detail });
                },
              })
            }
          >
            <Button size="small" danger loading={isDeleting}>삭제</Button>
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
    />
  );
}
