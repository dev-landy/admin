"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, App, Button, Card, InputNumber, Popconfirm, Space, Spin, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

import { useOutbox, useDispatchNotifications } from "@/features/notifications/hooks";
import { OutboxTable } from "@/features/notifications/components/OutboxTable";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { parseNotificationUserId } from "@/features/notifications/filters";
import { parseProblemDetail } from "@/lib/api/problem";
import type { OutboxStatus } from "@/features/notifications/types";

const { Title } = Typography;

function OutboxPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { notification } = App.useApp();
  const [dispatchSize, setDispatchSize] = useState<number>(50);

  const page = Number(searchParams.get("page") ?? "1");
  const size = Number(searchParams.get("size") ?? "20");
  const userId = parseNotificationUserId(searchParams.get("userId"));
  const errorCode = searchParams.get("errorCode")?.trim() || undefined;
  const status = (searchParams.get("status") as OutboxStatus) || undefined;

  const queryParams = { page, size, userId, status, errorCode };
  const { data, isLoading, isFetching, error, refetch } = useOutbox(queryParams);
  const { mutate: dispatch, isPending: isDispatching } = useDispatchNotifications();

  function handlePageChange(p: number, s: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    params.set("size", String(s));
    router.push(`?${params.toString()}`);
  }

  function handleFilterChange(key: string, value: string | number | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (value === undefined) params.delete(key);
    else params.set(key, String(value));
    router.push(`?${params.toString()}`);
  }

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>알림 Outbox</Title>}
      extra={
        <Space wrap>
          <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
            새로고침
          </Button>
          <Space.Compact>
            <Space.Addon>최대</Space.Addon>
            <InputNumber
              aria-label="최대 처리 건수"
              min={1}
              max={100}
              precision={0}
              value={dispatchSize}
              onChange={(v) => setDispatchSize(v ?? 50)}
              style={{ width: 80 }}
            />
            <Space.Addon>건</Space.Addon>
          </Space.Compact>
          <Popconfirm
            title={`최대 ${dispatchSize}건의 대기 발송을 즉시 처리하시겠습니까?`}
            description="목록 필터와 관계없이 발송 가능한 전체 대기 건에서 처리합니다."
            onConfirm={() =>
              dispatch(dispatchSize, {
                onSuccess: (res) => {
                  if (!res) {
                    notification.info({ title: "수동 발송 요청이 완료되었습니다.",
                      description: "서버가 처리 통계를 제공하지 않았습니다. 목록을 새로 조회해 결과를 확인해 주세요." });
                    return;
                  }
                  const summary = {
                    title: `${res.processed}건 처리 · 발송 성공 ${res.sent}건`,
                    description: `실패 ${res.failed}건 · 건너뜀 ${res.skipped}건 · 다른 경로에서 발송 중 ${res.alreadyClaimed}건`,
                  };
                  if (res.failed > 0) notification.warning(summary);
                  else notification.success(summary);
                },
                onError: (err) => {
                  const p = parseProblemDetail(err);
                  notification.error({ title: p?.title ?? "발송 결과를 확인하지 못했습니다.",
                    description: `${p?.detail ?? "일부 발송은 처리되었을 수 있습니다."} 목록을 다시 조회해 상태를 확인해 주세요.` });
                },
              })
            }
          >
            <Button type="primary" loading={isDispatching}>수동 Dispatch</Button>
          </Popconfirm>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        title="재큐잉 후에는 수동 Dispatch로 발송하세요"
        description="재큐잉은 발송 대기 상태로 되돌립니다. 즉시 발송하려면 수동 Dispatch를 실행하세요. 납부일·미납·계약 만료 예정 알림은 대상일이 지나면 SKIPPED로 처리됩니다. SENDING은 발송 중이며 재큐잉할 수 없습니다."
        style={{ marginBottom: 16 }}
      />
      <QueryErrorAlert error={error} onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined}
        title="발송 대기열을 불러오지 못했습니다." />
      {(!error || data !== undefined) && <OutboxTable
        data={data?.outboxes ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
        filters={{ userId, status, errorCode }}
        onFilterChange={handleFilterChange}
      />}
    </Card>
  );
}

export default function OutboxPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}>
      <OutboxPageContent />
    </Suspense>
  );
}
