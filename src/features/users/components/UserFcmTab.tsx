"use client";

import { App, Button, Popconfirm, Switch, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { useUserFcmTokens, useDeactivateFcmToken, useUpdateFcmTokenSilentWakeupSubscription } from "../hooks";
import type { FcmToken } from "../types";

export function UserFcmTab({ userId }: { userId: number }) {
  const { notification } = App.useApp();
  const { data, isLoading } = useUserFcmTokens(userId);
  const { mutate: deactivate, isPending } = useDeactivateFcmToken(userId);
  const { mutate: updateSilentWakeup, isPending: isUpdatingSilentWakeup } =
    useUpdateFcmTokenSilentWakeupSubscription(userId);

  const columns: TableColumnsType<FcmToken> = [
    { title: "ID", dataIndex: "fcmTokenId", width: 80 },
    { title: "플랫폼", dataIndex: "platform", width: 100, render: (v: string) => <Tag>{v}</Tag> },
    {
      title: "Silent Push",
      dataIndex: "silentWakeupSubscribed",
      width: 130,
      render: (_: boolean, record: FcmToken) => {
        if (record.platform !== "ANDROID") {
          return <Tag>대상 아님</Tag>;
        }
        return (
          <Switch
            size="small"
            checked={record.silentWakeupSubscribed}
            loading={isUpdatingSilentWakeup}
            checkedChildren="구독됨"
            unCheckedChildren="미구독"
            onChange={(subscribed) =>
              updateSilentWakeup(
                { fcmTokenId: record.fcmTokenId, subscribed },
                {
                  onSuccess: () => notification.success({ message: "Silent Push 구독 상태가 변경되었습니다." }),
                  onError: (err) => {
                    const p = parseProblemDetail(err);
                    notification.error({ message: p?.title ?? "구독 상태 변경 실패", description: p?.detail });
                  },
                },
              )
            }
          />
        );
      },
    },
    { title: "토큰 (마스킹)", dataIndex: "value" },
    { title: "생성일", dataIndex: "createdAt" },
    { title: "수정일", dataIndex: "updatedAt" },
    {
      title: "액션",
      key: "action",
      width: 120,
      render: (_: unknown, record: FcmToken) => (
        <Popconfirm
          title="토큰을 비활성화하시겠습니까?"
          onConfirm={() =>
            deactivate(record.fcmTokenId, {
              onError: (err) => {
                const p = parseProblemDetail(err);
                notification.error({ message: p?.title ?? "비활성화 실패", description: p?.detail });
              },
            })
          }
        >
          <Button size="small" danger loading={isPending}>비활성화</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data?.fcmTokens ?? []}
      loading={isLoading}
      rowKey={(r) => String(r.fcmTokenId)}
      pagination={false}
    />
  );
}
