"use client";

import { App, Button, Card, Descriptions, Popconfirm, Select, Space, Switch, Tag } from "antd";
import { useRouter } from "next/navigation";

import { parseProblemDetail } from "@/lib/api/problem";
import { useUpdateUserRole, useUpdateUserNotifySettings, useDeleteUser } from "../hooks";
import type { UserDetail } from "../types";
import { USER_STATUS_PRESENTATION } from "../userStatus";

export function UserDetailCard({ user }: { user: UserDetail }) {
  const router = useRouter();
  const { notification } = App.useApp();
  const { mutate: updateRole, isPending: isRolePending } = useUpdateUserRole(user.userId);
  const { mutate: updateNotify, isPending: isNotifyPending } = useUpdateUserNotifySettings(user.userId);
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  const statusPresentation = USER_STATUS_PRESENTATION[user.status];

  function handleRoleChange(role: "USER" | "ADMIN") {
    updateRole(role, {
      onSuccess: () => notification.success({ message: "역할이 변경되었습니다." }),
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ message: p?.title ?? "역할 변경 실패", description: p?.detail });
      },
    });
  }

  function handleDelete() {
    deleteUser(user.userId, {
      onSuccess: () => router.replace("/users"),
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ message: p?.title ?? "삭제 실패", description: p?.detail });
      },
    });
  }

  return (
    <Card
      title={`유저 #${user.userId}`}
      extra={
        <Popconfirm title="이 유저를 삭제하시겠습니까?" onConfirm={handleDelete}>
          <Button danger loading={isDeleting}>삭제</Button>
        </Popconfirm>
      }
    >
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="제공자">{user.provider}</Descriptions.Item>
        <Descriptions.Item label="상태">
          <Tag color={statusPresentation.color}>{statusPresentation.label}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="이메일">{user.email}</Descriptions.Item>
        <Descriptions.Item label="전화번호">{user.phone ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="가입일">{user.createdAt}</Descriptions.Item>
        <Descriptions.Item label="수정일">{user.updatedAt}</Descriptions.Item>
        <Descriptions.Item label="역할">
          <Space>
            <Select
              value={user.role}
              onChange={handleRoleChange}
              loading={isRolePending}
              options={[
                { label: "USER", value: "USER" },
                { label: "ADMIN", value: "ADMIN" },
              ]}
              style={{ width: 100 }}
            />
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="납부일 알림">
          <Switch
            checked={user.notifyDue}
            loading={isNotifyPending}
            onChange={(v) => updateNotify({ notifyDue: v })}
          />
        </Descriptions.Item>
        <Descriptions.Item label="연체 알림">
          <Switch
            checked={user.notifyOverdue}
            loading={isNotifyPending}
            onChange={(v) => updateNotify({ notifyOverdue: v })}
          />
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
