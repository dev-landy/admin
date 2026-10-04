"use client";

import { App, Button, Card, Descriptions, Grid, Popconfirm, Select, Space, Switch, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";

import { useEffect, useRef } from "react";
import { formatDateTime } from "@/lib/format/date";
import { parseProblemDetail } from "@/lib/api/problem";
import {
  useUpdateUserRole,
  useUpdateUserNotifySettings,
  useUpdateUserAlimtalkEnabled,
  useDeleteUser,
} from "../hooks";
import type { UserDetail } from "../types";
import { USER_STATUS_PRESENTATION } from "../userStatus";
import { OAUTH_PROVIDER_LABELS } from "../oauthProvider";

export function UserDetailCard({ user, returnPath = "/users" }: { user: UserDetail; returnPath?: string }) {
  const router = useRouter();
  const { notification, modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const { mutate: updateRole, isPending: isRolePending } = useUpdateUserRole(user.userId);
  const { mutate: updateNotify, isPending: isNotifyPending } = useUpdateUserNotifySettings(user.userId);
  const { mutate: updateAlimtalk, isPending: isAlimtalkPending } = useUpdateUserAlimtalkEnabled(user.userId);
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  const statusPresentation = USER_STATUS_PRESENTATION[user.status];

  function updateRoleConfirmed(role: "USER" | "ADMIN") {
    updateRole(role, {
      onSuccess: () => notification.success({ title: "역할이 변경되었습니다." }),
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ title: p?.title ?? "역할 변경 실패", description: p?.detail });
      },
    });
  }

  const roleConfirmation = useRef<{ destroy: () => void } | null>(null);
  useEffect(() => () => { roleConfirmation.current?.destroy(); }, [user.userId]);

  function handleRoleChange(role: "USER" | "ADMIN") {
    if (role === user.role || isRolePending) return;
    roleConfirmation.current?.destroy();
    roleConfirmation.current = modal.confirm({
      title: `${role === "ADMIN" ? "관리자" : "사용자"} 역할로 변경할까요?`,
      content: `유저 #${user.userId} · ${user.email}의 관리자 접근 권한이 ${role === "ADMIN" ? "허용" : "해제"}됩니다.`,
      okText: "역할 변경", cancelText: "취소", onOk: () => updateRoleConfirmed(role),
    });
  }

  function handleNotifyChange(field: "notifyDue" | "notifyOverdue", enabled: boolean) {
    updateNotify({ [field]: enabled }, {
      onSuccess: () => notification.success({ title: `${field === "notifyDue" ? "납부일" : "연체"} 알림을 ${enabled ? "켰습니다" : "껐습니다"}.` }),
      onError: (err) => {
        const problem = parseProblemDetail(err);
        notification.error({ title: problem?.title ?? "알림 설정 변경 실패", description: problem?.detail });
      },
    });
  }

  function handleAlimtalkChange(enabled: boolean) {
    updateAlimtalk(enabled, {
      onSuccess: () =>
        notification.success({
          title: enabled
            ? "세입자 알림톡을 켰습니다. 임차인별 설정을 켜야 실제로 나갑니다."
            : "세입자 알림톡을 껐습니다. 임차인별 설정과 무관하게 전부 멈춥니다.",
        }),
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ title: p?.title ?? "알림톡 설정 변경 실패", description: p?.detail });
      },
    });
  }

  function handleDelete() {
    deleteUser(user.userId, {
      onSuccess: () => { notification.success({ title: `유저 #${user.userId}를 삭제했습니다.` }); router.replace(returnPath); },
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ title: p?.title ?? "삭제 실패", description: p?.detail });
      },
    });
  }

  return (
    <Card
      title={`유저 #${user.userId}`}
      extra={
        <Popconfirm title="이 유저를 삭제하시겠습니까?" description={`유저 #${user.userId} · ${user.email} 계정을 삭제합니다. 삭제 후에는 되돌릴 수 없습니다.`} okText="삭제" cancelText="취소" okButtonProps={{ danger: true }} disabled={isDeleting} onConfirm={handleDelete}>
          <Button danger loading={isDeleting} disabled={isDeleting}>삭제</Button>
        </Popconfirm>
      }
    >
      <Descriptions
        layout={screens.sm === false ? "vertical" : "horizontal"}
        column={{ xs: 1, sm: 2 }} bordered size="small"
        items={[
          { key: "provider", label: "가입 경로", children: OAUTH_PROVIDER_LABELS[user.provider] ?? user.provider },
          { key: "status", label: "상태", children: <Tag color={statusPresentation.color}>{statusPresentation.label}</Tag> },
          { key: "email", label: "이메일", children: user.email },
          { key: "phone", label: "전화번호", children: user.phone ?? "-" },
          { key: "createdAt", label: "가입일", children: formatDateTime(user.createdAt) },
          { key: "updatedAt", label: "수정일", children: formatDateTime(user.updatedAt) },
          {
            key: "role", label: "역할", children: (
              <Select
                value={user.role} onChange={handleRoleChange}
                loading={isRolePending} disabled={isRolePending} aria-label="사용자 역할"
                options={[{ label: "사용자", value: "USER" }, { label: "관리자", value: "ADMIN" }]}
                style={{ width: 120 }}
              />
            ),
          },
          {
            key: "notifyDue", label: "납부일 알림", children: (
              <Switch
                checked={user.notifyDue} loading={isNotifyPending} aria-label="납부일 알림"
                checkedChildren="활성" unCheckedChildren="비활성"
                onChange={(enabled) => handleNotifyChange("notifyDue", enabled)}
              />
            ),
          },
          {
            key: "notifyOverdue", label: "연체 알림", children: (
              <Switch
                checked={user.notifyOverdue} loading={isNotifyPending} aria-label="연체 알림"
                checkedChildren="활성" unCheckedChildren="비활성"
                onChange={(enabled) => handleNotifyChange("notifyOverdue", enabled)}
              />
            ),
          },
          {
            key: "alimtalk", label: "세입자 알림톡", children: (
              <Space orientation="vertical" size={8}>
                <Space wrap>
                  <Switch
                    aria-label="세입자 알림톡" checked={user.alimtalkEnabled} loading={isAlimtalkPending}
                    checkedChildren="사용" unCheckedChildren="중지" onChange={handleAlimtalkChange}
                  />
                  <Tag color={user.alimtalkEnabled ? "green" : "default"}>
                    {user.alimtalkEnabled ? "세입자 발송 사용" : "세입자 발송 중지"}
                  </Tag>
                </Space>
                <Typography.Text type="secondary">
                  켜져 있어도 임차인별 알림톡 설정이 켜져 있어야 발송됩니다. 끄면 이 사용자의 세입자 발송이 모두 중지됩니다.
                </Typography.Text>
              </Space>
            ),
          },
        ]}
      />
    </Card>
  );
}
