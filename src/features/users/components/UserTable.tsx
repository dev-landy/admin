"use client";

import { useRouter } from "next/navigation";
import { App, Button, Popconfirm, Select, Space, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { PagedTable } from "@/components/PagedTable";
import { parseProblemDetail } from "@/lib/api/problem";
import { formatKoreanDate } from "@/lib/format/date";
import { useDeleteUser } from "../hooks";
import type { UserSummary, UserRole, OAuthProvider, UserStatus } from "../types";
import { USER_STATUS_OPTIONS, USER_STATUS_PRESENTATION } from "../userStatus";

type Props = {
  data: UserSummary[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, size: number) => void;
  filters: { provider?: OAuthProvider; role?: UserRole; status?: UserStatus };
  onFilterChange: (key: string, value: string | undefined) => void;
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
    { title: "유저 ID", dataIndex: "userId", width: 90 },
    { title: "이메일", dataIndex: "email", width: 220 },
    { title: "전화번호", dataIndex: "phone", width: 140, render: (v: string | null) => v ?? "-" },
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
      title: "상태",
      dataIndex: "status",
      width: 140,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            placeholder="전체"
            value={filters.status}
            style={{ width: 140 }}
            onChange={(v) => onFilterChange("status", v)}
            options={USER_STATUS_OPTIONS}
          />
        </div>
      ),
      render: (v: UserStatus) => {
        const presentation = USER_STATUS_PRESENTATION[v];
        return <Tag color={presentation.color}>{presentation.label}</Tag>;
      },
    },
    { title: "가입일", dataIndex: "createdAt", width: 140, render: (v: string) => formatKoreanDate(v) },
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
