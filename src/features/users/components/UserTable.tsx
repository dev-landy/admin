"use client";

import { useRouter } from "next/navigation";
import { listDetailPath } from "@/lib/navigation/listReturn";
import { App, Button, Popconfirm, Select, Space, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { PagedTable } from "@/components/PagedTable";
import { parseProblemDetail } from "@/lib/api/problem";
import { formatKoreanDate } from "@/lib/format/date";
import { useDeleteUser } from "../hooks";
import type { UserSummary, UserRole, OAuthProvider, UserStatus } from "../types";
import { USER_STATUS_OPTIONS, USER_STATUS_PRESENTATION } from "../userStatus";
import { OAUTH_PROVIDER_LABELS, OAUTH_PROVIDER_OPTIONS } from "../oauthProvider";

type Props = {
  returnPath?: string;
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
  returnPath = "/users",
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
  const { mutate: deleteUser, isPending: isDeleting, variables: deletingId } = useDeleteUser();

  const columns: TableColumnsType<UserSummary> = [
    { title: "유저 ID", dataIndex: "userId", width: 90 },
    { title: "이메일", dataIndex: "email", width: 220 },
    { title: "전화번호", dataIndex: "phone", width: 140, render: (v: string | null) => v ?? "-" },
    {
      title: "제공자",
      dataIndex: "provider",
      filteredValue: filters.provider ? [filters.provider] : null,
      width: 100,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            aria-label="가입 경로 필터"
            placeholder="전체"
            value={filters.provider}
            style={{ width: 120 }}
            onChange={(v) => onFilterChange("provider", v)}
            options={OAUTH_PROVIDER_OPTIONS}
          />
        </div>
      ),
      render: (v: OAuthProvider) => <Tag>{OAUTH_PROVIDER_LABELS[v] ?? v}</Tag>,
    },
    {
      title: "역할",
      dataIndex: "role",
      filteredValue: filters.role ? [filters.role] : null,
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
              { label: "사용자", value: "USER" },
              { label: "관리자", value: "ADMIN" },
            ]}
          />
        </div>
      ),
      render: (v: UserRole) => (
        <Tag color={v === "ADMIN" ? "gold" : "default"}>{v === "ADMIN" ? "관리자" : "사용자"}</Tag>
      ),
    },
    {
      title: "상태",
      dataIndex: "status",
      filteredValue: filters.status ? [filters.status] : null,
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
      title: "동작",
      key: "action",
      width: 160,
      render: (_: unknown, record: UserSummary) => (
        <Space wrap>
          <Button size="small" onClick={() => router.push(listDetailPath("/users", record.userId, returnPath))}>
            상세
          </Button>
          <Popconfirm
            title="유저를 삭제하시겠습니까?"
            description={`유저 #${record.userId} · ${record.email} 계정을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`}
            okText="삭제" cancelText="취소" okButtonProps={{ danger: true }} disabled={isDeleting}
            onConfirm={() =>
              deleteUser(record.userId, {
                onSuccess: () => notification.success({ title: `유저 #${record.userId}를 삭제했습니다.` }),
                onError: (err) => {
                  const p = parseProblemDetail(err);
                  notification.error({
                    title: p?.title ?? "삭제 실패",
                    description: p?.detail,
                  });
                },
              })
            }
          >
            <Button size="small" danger loading={isDeleting && deletingId === record.userId} disabled={isDeleting}>
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
      ariaLabel="사용자 목록"
      emptyText="조건에 맞는 사용자가 없습니다. 필터를 초기화하거나 다른 조건으로 조회해 주세요."
    />
  );
}
