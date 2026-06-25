"use client";

import { useRouter } from "next/navigation";
import { App, Button, Popconfirm, Select, Space, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { PagedTable } from "@/components/PagedTable";
import { parseProblemDetail } from "@/lib/api/problem";
import { useDeleteUser } from "../hooks";
import type { UserSummary, UserRole, OAuthProvider } from "../types";

type Props = {
  data: UserSummary[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, size: number) => void;
  filters: { provider?: OAuthProvider; role?: UserRole; onboarded?: boolean };
  onFilterChange: (key: string, value: string | boolean | undefined) => void;
};

export function UserTable({
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
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();

  const columns: TableColumnsType<UserSummary> = [
    { title: "ID", dataIndex: "userId", width: 80 },
    {
      title: "제공자",
      dataIndex: "provider",
      width: 100,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            placeholder="전체"
            value={filters.provider}
            style={{ width: 120 }}
            onChange={(v) => onFilterChange("provider", v)}
            options={[
              { label: "카카오", value: "KAKAO" },
              { label: "구글", value: "GOOGLE" },
            ]}
          />
        </div>
      ),
      render: (v: OAuthProvider) => <Tag>{v}</Tag>,
    },
    {
      title: "역할",
      dataIndex: "role",
      width: 100,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            placeholder="전체"
            value={filters.role}
            style={{ width: 120 }}
            onChange={(v) => onFilterChange("role", v)}
            options={[
              { label: "USER", value: "USER" },
              { label: "ADMIN", value: "ADMIN" },
            ]}
          />
        </div>
      ),
      render: (v: UserRole) => (
        <Tag color={v === "ADMIN" ? "gold" : "default"}>{v}</Tag>
      ),
    },
    {
      title: "온보딩",
      dataIndex: "onboarded",
      width: 90,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            placeholder="전체"
            value={filters.onboarded}
            style={{ width: 120 }}
            onChange={(v) => onFilterChange("onboarded", v)}
            options={[
              { label: "완료", value: true },
              { label: "미완료", value: false },
            ]}
          />
        </div>
      ),
      render: (v: boolean) => <Tag color={v ? "green" : "default"}>{v ? "완료" : "미완료"}</Tag>,
    },
    { title: "가입일", dataIndex: "createdAt", width: 180 },
    {
      title: "액션",
      key: "action",
      width: 160,
      render: (_: unknown, record: UserSummary) => (
        <Space>
          <Button size="small" onClick={() => router.push(`/users/${record.userId}`)}>
            상세
          </Button>
          <Popconfirm
            title="유저를 삭제하시겠습니까?"
            onConfirm={() =>
              deleteUser(record.userId, {
                onError: (err) => {
                  const p = parseProblemDetail(err);
                  notification.error({
                    message: p?.title ?? "삭제 실패",
                    description: p?.detail,
                  });
                },
              })
            }
          >
            <Button size="small" danger loading={isDeleting}>
              삭제
            </Button>
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
      rowKey={(r) => String(r.userId)}
    />
  );
}
