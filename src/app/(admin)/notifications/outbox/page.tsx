"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { App, Button, Card, InputNumber, Popconfirm, Space, Spin, Typography } from "antd";

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
  const { data, isLoading } = useOutbox(queryParams);
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
          <InputNumber
            min={1}
            max={100}
            value={dispatchSize}
            onChange={(v) => setDispatchSize(v ?? 50)}
            addonBefore="최대"
            addonAfter="건"
            style={{ width: 160 }}
          />
          <Popconfirm
            title={`최대 ${dispatchSize}건의 대기 발송을 즉시 처리하시겠습니까? 자동 발송 시간대(09:00~10:00)를 피해 사용하세요.`}
            onConfirm={() =>
              dispatch(dispatchSize, {
                onSuccess: (res) => notification.success({ message: `${res.processed}건 처리되었습니다.` }),
                onError: (err) => {
                  const p = parseProblemDetail(err);
                  notification.error({ message: p?.title ?? "Dispatch 실패", description: p?.detail });
                },
              })
            }
          >
            <Button type="primary" loading={isDispatching}>수동 Dispatch</Button>
          </Popconfirm>
        </Space>
      }
    >
      <OutboxTable
        data={data?.outbox ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
        filters={{ status }}
        onFilterChange={handleFilterChange}
        queryParams={queryParams}
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
