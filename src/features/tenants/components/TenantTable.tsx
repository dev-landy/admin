"use client";

import { useRouter } from "next/navigation";
import { App, Button, Popconfirm, Select, Space, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { PagedTable } from "@/components/PagedTable";
import { parseProblemDetail } from "@/lib/api/problem";
import { useDeleteTenant } from "../hooks";
import type { TenantSummary } from "../types";

type Props = {
  data: TenantSummary[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number, s: number) => void;
  filters: { notifyEnabled?: boolean };
  onFilterChange: (key: string, value: boolean | undefined) => void;
};

export function TenantTable({ data, loading, page, pageSize, total, onPageChange, filters, onFilterChange }: Props) {
  const router = useRouter();
  const { notification } = App.useApp();
  const { mutate: deleteTenant, isPending: isDeleting } = useDeleteTenant();

  const columns: TableColumnsType<TenantSummary> = [
    { title: "ID", dataIndex: "tenantId", width: 80 },
    { title: "유저 ID", dataIndex: "userId", width: 90 },
    { title: "이름", dataIndex: "name" },
    { title: "호실", dataIndex: "roomNumber", width: 80 },
    { title: "월세", dataIndex: "rentPrice", render: (v: number) => v.toLocaleString() + "원" },
    { title: "납부일", dataIndex: "paymentDay", width: 90, render: (v: number) => `매월 ${v}일` },
    { title: "시작일", dataIndex: "startDate" },
    { title: "종료일", dataIndex: "endDate", render: (v: string | null) => v ?? "진행중" },
    {
      title: "알림",
      dataIndex: "notifyEnabled",
      width: 90,
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
