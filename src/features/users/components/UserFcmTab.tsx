"use client";

import { useState } from "react";
import { App, Button, Popconfirm, Space, Switch, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { formatDateTime } from "@/lib/format/date";
import { PagedTable } from "@/components/PagedTable";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";

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
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const { data, isLoading, error, isFetching, refetch } = useUserFcmTokens(userId, page, size);
  const { mutate: deactivate, isPending, variables: deactivatingTokenId } = useDeactivateFcmToken(userId);
  const { mutate: updateSilentWakeup, isPending: isUpdatingSilentWakeup, variables: updatingSubscription } =
    useUpdateFcmTokenSilentWakeupSubscription(userId);
  const { mutate: sendSilentMessage, isPending: isSendingSilent, variables: sendingTokenId } = useSendFcmTokenSilentMessage();
  const [testSendTokenId, setTestSendTokenId] = useState<number | null>(null);

  // 마지막 행을 비활성화한 뒤 서버 총수가 줄면 표시와 다음 조회의 페이지를 함께 보정한다.
  if (data && !error && !isFetching) {
    const lastPage = Math.max(1, Math.ceil(data.totalElements / data.size));
    if (page > lastPage) setPage(lastPage);
  }

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
            aria-label={`토큰 #${record.fcmTokenId} Silent Push 구독`}
            checked={record.silentWakeupSubscribed}
            loading={isUpdatingSilentWakeup && updatingSubscription?.fcmTokenId === record.fcmTokenId}
            disabled={isUpdatingSilentWakeup}
            checkedChildren="구독됨"
            unCheckedChildren="미구독"
            onChange={(subscribed) =>
              updateSilentWakeup(
                { fcmTokenId: record.fcmTokenId, subscribed },
                {
                  onSuccess: () => notification.success({ title: "Silent Push 구독 상태가 변경되었습니다." }),
                  onError: (err) => {
                    const p = parseProblemDetail(err);
                    notification.error({ title: p?.title ?? "구독 상태 변경 실패", description: p?.detail });
                  },
                },
              )
            }
          />
        );
      },
    },
    { title: "토큰 (마스킹)", dataIndex: "value" },
    { title: "생성일", dataIndex: "createdAt", width: 180, render: formatDateTime },
    { title: "수정일", dataIndex: "updatedAt", width: 180, render: formatDateTime },
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
                      title: "Silent 테스트 발송 완료",
                      description: `messageId: ${res.messageId}`,
                    }),
                  onError: (err) => {
                    const p = parseProblemDetail(err);
                    notification.error({ title: p?.title ?? "Silent 테스트 발송 실패", description: p?.detail });
                  },
                })
              }
            >
              <Button size="small" loading={isSendingSilent && sendingTokenId === record.fcmTokenId} disabled={isSendingSilent}>
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
                  notification.error({ title: p?.title ?? "비활성화 실패", description: p?.detail });
                },
              })
            }
          >
            <Button size="small" danger loading={isPending && deactivatingTokenId === record.fcmTokenId} disabled={isPending}>비활성화</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <QueryErrorAlert error={error} title="FCM 토큰 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {(!error || data) && <PagedTable
        columns={columns}
        dataSource={data?.fcmTokens ?? []}
        loading={isLoading}
        ariaLabel="사용자 FCM 토큰 목록"
        emptyText="이 사용자에게 활성 FCM 토큰이 없습니다."
        rowKey={(r) => String(r.fcmTokenId)}
        page={data ? data.page + 1 : page}
        pageSize={data?.size ?? size}
        total={data?.totalElements ?? 0}
        onPageChange={(nextPage, nextSize) => { setPage(nextPage); setSize(nextSize); }}
      />}
      <FcmTestSendModal
        open={testSendTokenId !== null}
        onClose={() => setTestSendTokenId(null)}
        fcmTokenId={testSendTokenId}
      />
    </>
  );
}
