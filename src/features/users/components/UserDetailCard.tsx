"use client";

import { App, Button, Card, Descriptions, Popconfirm, Select, Space, Switch, Tag, Tooltip } from "antd";
import { useRouter } from "next/navigation";

import { parseProblemDetail } from "@/lib/api/problem";
import {
  useUpdateUserRole,
  useUpdateUserNotifySettings,
  useUpdateUserAlimtalkEnabled,
  useDeleteUser,
} from "../hooks";
import type { UserDetail } from "../types";
import { USER_STATUS_PRESENTATION } from "../userStatus";

export function UserDetailCard({ user }: { user: UserDetail }) {
  const router = useRouter();
  const { notification } = App.useApp();
  const { mutate: updateRole, isPending: isRolePending } = useUpdateUserRole(user.userId);
  const { mutate: updateNotify, isPending: isNotifyPending } = useUpdateUserNotifySettings(user.userId);
  const { mutate: updateAlimtalk, isPending: isAlimtalkPending } = useUpdateUserAlimtalkEnabled(user.userId);
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser();
  const statusPresentation = USER_STATUS_PRESENTATION[user.status];

  function handleRoleChange(role: "USER" | "ADMIN") {
    updateRole(role, {
      onSuccess: () => notification.success({ title: "역할이 변경되었습니다." }),
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ title: p?.title ?? "역할 변경 실패", description: p?.detail });
      },
    });
  }

  function handleAlimtalkChange(enabled: boolean) {
    updateAlimtalk(enabled, {
      onSuccess: () =>
        notification.success({
          title: enabled ? "알림톡 발송을 다시 허용했습니다." : "이 계정의 알림톡 발송을 차단했습니다.",
        }),
      onError: (err) => {
        const p = parseProblemDetail(err);
        notification.error({ title: p?.title ?? "알림톡 설정 변경 실패", description: p?.detail });
      },
    });
  }

  function handleDelete() {
    deleteUser(user.userId, {
      onSuccess: () => router.replace("/users"),
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
        <Descriptions.Item label="알림톡 발송">
          <Tooltip title="세입자에게 나가는 알림톡을 계정 단위로 막는 운영자 스위치입니다. 끄면 임대인이 임차인별로 켜 둔 설정도 무시하고 아무것도 나가지 않습니다.">
            <Space>
              <Switch
                checked={user.alimtalkEnabled}
                loading={isAlimtalkPending}
                checkedChildren="허용"
                unCheckedChildren="차단"
                onChange={handleAlimtalkChange}
              />
              <Tag color={user.alimtalkEnabled ? "green" : "red"}>
                {user.alimtalkEnabled ? "발송 허용" : "발송 차단"}
              </Tag>
            </Space>
          </Tooltip>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
