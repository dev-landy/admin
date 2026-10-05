"use client";

import type { ListSortControl } from "@/lib/navigation/useListSort";

import { useRouter } from "next/navigation";
import { App, Button } from "antd";
import type { TableColumnsType } from "antd";

import { RecordCard } from "@/components/RecordCard";
import { EntityCell } from "@/components/EntityCell";
import { RowActions } from "@/components/RowActions";
import { PagedTable } from "@/components/PagedTable";
import { parseProblemDetail } from "@/lib/api/problem";
import { listDetailPath, relatedListPath } from "@/lib/navigation/listReturn";
import { formatKoreanDate } from "@/lib/format/date";
import { useDeleteUser } from "../hooks";
import type { UserSummary, UserRole, OAuthProvider, UserStatus } from "../types";
import { OAUTH_PROVIDER_LABELS } from "../oauthProvider";
import { UserDevicePlatforms } from "./UserDevicePlatforms";
import { UserAccountStatus } from "./UserAccountStatus";

type Props = {
  sortControl?: ListSortControl;
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

export function UserTable({ sortControl, returnPath = "/users", data, loading, page, pageSize, total, onPageChange }: Props) {
  const router = useRouter();
  const { notification } = App.useApp();
  const { mutateAsync: deleteUser, isPending: isDeleting, variables: deletingId } = useDeleteUser();

  function renderActions(user: UserSummary) {
    if (user.deletedAt != null) return <Button size="small" onClick={() => router.push(listDetailPath("/users", user.userId, returnPath))}>상세</Button>;
    return <RowActions subject={`유저 #${user.userId}`} loading={isDeleting && deletingId === user.userId} disabled={isDeleting}
        primary={<Button size="small" onClick={() => router.push(listDetailPath("/users", user.userId, returnPath))}>상세</Button>}
        items={[
          { key: "payments", label: "납부 내역", href: relatedListPath("/payments", { userId: user.userId }, returnPath) },
          { key: "notifications", label: "알림 내역", href: relatedListPath("/notifications", { userId: user.userId }, returnPath) },
          { type: "divider" },
          {
            key: "delete", label: "사용자 삭제", danger: true,
            confirm: { title: "유저를 삭제하시겠습니까?", description: `유저 #${user.userId} · ${user.email} 계정을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`, okText: "삭제" },
            onClick: () => deleteUser(user.userId, {
              onSuccess: () => notification.success({ title: `유저 #${user.userId}를 삭제했습니다.` }),
              onError: (error) => { const problem = parseProblemDetail(error); notification.error({ title: problem?.title ?? "삭제 실패", description: problem?.detail }); },
            }),
          },
        ]}
      />; }

  const columns: TableColumnsType<UserSummary> = [
    {
      title: "사용자", key: "identity", width: 290,
      render: (_, user) => <EntityCell primary={user.email} secondary={user.phone || "전화번호 없음"} meta={`유저 #${user.userId}`}>
        <UserDevicePlatforms platforms={user.fcmPlatforms} showLabel />
      </EntityCell>,
    },
    {
      title: "상태·권한", key: "account", width: 220,
      render: (_, user) => <EntityCell
        primary={<UserAccountStatus user={user} />}
        secondary={<span>{OAUTH_PROVIDER_LABELS[user.provider] ?? user.provider} · {user.role === "ADMIN" ? "관리자" : "사용자"}</span>}
        meta={<div className="admin-cell-stack"><span>가입일 {formatKoreanDate(user.createdAt)}</span>
          {user.deletedAt != null && <span>탈퇴일 {formatKoreanDate(user.deletedAt)}</span>}
        </div>}
      />,
    },
    { title: "가입일", dataIndex: "createdAt", width: 150, render: formatKoreanDate },
    {
      title: "작업", key: "action", width: 124, fixed: "right",
      render: (_, user) => renderActions(user),
    },
  ];

  const compactColumns: TableColumnsType<UserSummary> = [columns[0], columns[1], columns[3]];
  const wideColumns: TableColumnsType<UserSummary> = [
    { ...columns[0], render: (_, user) => <EntityCell primary={user.email} meta={`유저 #${user.userId}`} /> },
    { title: "전화번호", dataIndex: "phone", width: 160, render: (value: string | null) => value || "미등록" },
    { title: "기기 OS", key: "fcmPlatforms", width: 156, render: (_, user) => <UserDevicePlatforms platforms={user.fcmPlatforms} /> },
    { title: "가입 경로", dataIndex: "provider", width: 110, render: (value: OAuthProvider) => OAUTH_PROVIDER_LABELS[value] ?? value },
    { title: "상태", dataIndex: "status", width: 160, render: (_value, user) => <EntityCell
      primary={<UserAccountStatus user={user} />} meta={user.deletedAt != null ? `탈퇴일 ${formatKoreanDate(user.deletedAt)}` : undefined} /> },
    { title: "역할", dataIndex: "role", width: 100, render: (value: UserRole) => value === "ADMIN" ? "관리자" : "사용자" },
    columns[2], columns[3],
  ];

  return <PagedTable sortControl={sortControl} columns={wideColumns} compactColumns={compactColumns}
    columnSizing={{
      identity: { min: 300, preferred: 580, grow: 2 },
      account: { min: 240, preferred: 360, grow: 1 },
    }}
    renderCard={(user) => <RecordCard ariaLabel={`유저 #${user.userId} ${user.email}`} title={user.email}
      subtitle={user.phone || "전화번호 미등록"} meta={`유저 #${user.userId}`}
      extra={<UserAccountStatus user={user} />}
      fields={[
        { label: "기기 OS", value: <UserDevicePlatforms platforms={user.fcmPlatforms} /> },
        { label: "가입·권한", value: `${OAUTH_PROVIDER_LABELS[user.provider] ?? user.provider} · ${user.role === "ADMIN" ? "관리자" : "사용자"}` },
        { label: "가입일", value: formatKoreanDate(user.createdAt) },
        ...(user.deletedAt != null ? [{ label: "탈퇴일", value: formatKoreanDate(user.deletedAt) }] : []),
      ]}
      actions={renderActions(user)} />}
    dataSource={data} loading={loading} rowKey={(user) => String(user.userId)}
    page={page} pageSize={pageSize} total={total} onPageChange={onPageChange}
    ariaLabel="사용자 목록" emptyText="조건에 맞는 사용자가 없습니다. 필터를 초기화하거나 다른 검색어로 조회해 주세요." />;
}
