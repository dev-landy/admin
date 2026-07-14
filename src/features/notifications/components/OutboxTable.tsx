"use client";

import { App, Button, Select, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { PagedTable } from "@/components/PagedTable";
import { parseProblemDetail } from "@/lib/api/problem";
import { useRequeueOutbox } from "../hooks";
import type { OutboxEvent, OutboxStatus, OutboxListParams } from "../types";

const STATUS_COLOR: Record<OutboxStatus, string> = {
  PENDING: "blue",
  SENT: "green",
  FAILED: "red",
  SKIPPED: "orange",
};

type Props = {
  data: OutboxEvent[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number, s: number) => void;
  filters: { status?: OutboxStatus };
  onFilterChange: (key: string, value: string | undefined) => void;
  queryParams: OutboxListParams;
};

export function OutboxTable({ data, loading, page, pageSize, total, onPageChange, filters, onFilterChange, queryParams }: Props) {
  const { notification } = App.useApp();
  const { mutate: requeue, isPending: isRequeueing } = useRequeueOutbox(queryParams);

  const columns: TableColumnsType<OutboxEvent> = [
    { title: "아웃박스 이벤트 ID", dataIndex: "notificationOutboxEventId", width: 150 },
    { title: "알림 ID", dataIndex: "notificationId", width: 90 },
    { title: "유저 ID", dataIndex: "userId", width: 90 },
    { title: "토큰 (마스킹)", dataIndex: "tokenValue" },
    {
      title: "상태",
      dataIndex: "status",
      width: 100,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            placeholder="전체"
            value={filters.status}
            style={{ width: 130 }}
            onChange={(v) => onFilterChange("status", v)}
            options={[
              { label: "PENDING", value: "PENDING" },
              { label: "SENT", value: "SENT" },
              { label: "FAILED", value: "FAILED" },
              { label: "SKIPPED", value: "SKIPPED" },
            ]}
          />
        </div>
      ),
      render: (v: OutboxStatus) => <Tag color={STATUS_COLOR[v]}>{v}</Tag>,
    },
    { title: "시도 횟수", dataIndex: "attempts", width: 90 },
    { title: "마지막 시도", dataIndex: "lastAttemptedAt", width: 180 },
    { title: "에러 코드", dataIndex: "lastErrorCode" },
    {
      title: "액션",
      key: "action",
      width: 100,
      render: (_: unknown, record: OutboxEvent) => {
        const canRequeue = record.status === "FAILED" || record.status === "SKIPPED";
        return (
          <Button
            size="small"
            disabled={!canRequeue}
            loading={isRequeueing}
            onClick={() =>
              requeue(record.notificationOutboxEventId, {
                onSuccess: () => notification.success({ message: "재시도 큐에 추가되었습니다." }),
                onError: (err) => {
                  const p = parseProblemDetail(err);
                  notification.error({ message: p?.title ?? "Requeue 실패", description: p?.detail });
                },
              })
            }
          >
            Requeue
          </Button>
        );
      },
    },
  ];

  return (
    <PagedTable
      columns={columns}
      dataSource={data}
      loading={loading}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      rowKey={(r) => String(r.notificationOutboxEventId)}
    />
  );
}
