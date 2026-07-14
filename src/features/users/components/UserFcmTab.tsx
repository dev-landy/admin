"use client";

import { useState } from "react";
import { App, Button, Popconfirm, Space, Switch, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import {
  useUserFcmTokens,
  useDeactivateFcmToken,
  useUpdateFcmTokenSilentWakeupSubscription,
  useSendFcmTokenSilentMessage,
} from "../hooks";
import type { FcmToken } from "../types";
import { FcmTestSendModal } from "./FcmTestSendModal";

export function UserFcmTab({ userId }: { userId: number }) {
  const { notification } = App.useApp();
  const { data, isLoading } = useUserFcmTokens(userId);
  const { mutate: deactivate, isPending } = useDeactivateFcmToken(userId);
  const { mutate: updateSilentWakeup, isPending: isUpdatingSilentWakeup } =
    useUpdateFcmTokenSilentWakeupSubscription(userId);
  const { mutate: sendSilentMessage, isPending: isSendingSilent } = useSendFcmTokenSilentMessage();
  const [testSendTokenId, setTestSendTokenId] = useState<number | null>(null);

  const columns: TableColumnsType<FcmToken> = [
    { title: "FCM 토큰 ID", dataIndex: "fcmTokenId", width: 130 },
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
    { title: "생성일", dataIndex: "createdAt", width: 180, ellipsis: true },
    { title: "수정일", dataIndex: "updatedAt", width: 180, ellipsis: true },
    {
      title: "액션",
      key: "action",
      width: 280,
      render: (_: unknown, record: FcmToken) => (
        <Space wrap>
          <Button size="small" onClick={() => setTestSendTokenId(record.fcmTokenId)}>
            테스트 발송
          </Button>
          {record.platform === "ANDROID" && (
            <Popconfirm
              title="이 토큰으로 silent 메시지를 발송하시겠습니까?"
              onConfirm={() =>
                sendSilentMessage(record.fcmTokenId, {
                  onSuccess: (res) =>
                    notification.success({
                      message: "Silent 테스트 발송 완료",
                      description: `messageId: ${res.messageId}`,
                    }),
                  onError: (err) => {
                    const p = parseProblemDetail(err);
                    notification.error({ message: p?.title ?? "Silent 테스트 발송 실패", description: p?.detail });
                  },
                })
              }
            >
              <Button size="small" loading={isSendingSilent}>
                Silent 테스트
              </Button>
            </Popconfirm>
          )}
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
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={data?.fcmTokens ?? []}
        loading={isLoading}
        rowKey={(r) => String(r.fcmTokenId)}
        pagination={false}
      />
      <FcmTestSendModal
        open={testSendTokenId !== null}
        onClose={() => setTestSendTokenId(null)}
        fcmTokenId={testSendTokenId}
      />
    </>
  );
}
