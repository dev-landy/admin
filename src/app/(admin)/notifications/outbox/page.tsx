"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, App, Button, Card, InputNumber, Popconfirm, Space, Spin, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

import { useOutbox, useDispatchNotifications } from "@/features/notifications/hooks";
import { OutboxTable } from "@/features/notifications/components/OutboxTable";
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
  const status = (searchParams.get("status") as OutboxStatus) || undefined;

  const queryParams = { page, size, status };
  const { data, isLoading, isFetching, refetch } = useOutbox(queryParams);
  const { mutate: dispatch, isPending: isDispatching } = useDispatchNotifications();

  function handlePageChange(p: number, s: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    params.set("size", String(s));
    router.push(`?${params.toString()}`);
  }

  function handleFilterChange(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (value === undefined) params.delete(key);
    else params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>알림 Outbox</Title>}
      extra={
        <Space>
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
                onSuccess: (res) => notification.success({ title: `${res.processed}건 처리되었습니다.` }),
                onError: (err) => {
                  const p = parseProblemDetail(err);
                  notification.error({ title: p?.title ?? "Dispatch 실패", description: p?.detail });
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
        description="주기적인 자동 발송기가 없어 재큐잉만으로 즉시 발송되지 않습니다. 납부일·미납·계약 만료 예정 알림은 대상일이 지나면 SKIPPED로 처리됩니다. SENDING은 발송 중이며 재큐잉할 수 없습니다."
        style={{ marginBottom: 16 }}
      />
      <OutboxTable
        data={data?.outbox ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
        filters={{ status }}
        onFilterChange={handleFilterChange}
      />
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
