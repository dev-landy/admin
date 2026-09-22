"use client";

import { App, Button, Select, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { PagedTable } from "@/components/PagedTable";
import { parseProblemDetail } from "@/lib/api/problem";
import { useRequeueOutbox } from "../hooks";
import type { OutboxEvent, OutboxStatus } from "../types";

const STATUS_COLOR: Record<OutboxStatus, string> = {
  PENDING: "blue",
  SENDING: "processing",
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
};

export function OutboxTable({ data, loading, page, pageSize, total, onPageChange, filters, onFilterChange }: Props) {
  const { notification } = App.useApp();
  const { mutate: requeue, isPending: isRequeueing } = useRequeueOutbox();

  const columns: TableColumnsType<OutboxEvent> = [
    { title: "아웃박스 이벤트 ID", dataIndex: "notificationOutboxEventId", width: 150 },
    { title: "알림 ID", dataIndex: "notificationId", width: 90 },
    { title: "유저 ID", dataIndex: "userId", width: 90 },
    { title: "토큰 (마스킹)", dataIndex: "tokenValue" },
    {
      title: "상태",
      dataIndex: "status",
      width: 100,
      filteredValue: filters.status ? [filters.status] : null,
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
              { label: "SENDING", value: "SENDING" },
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
    { title: "에러 메시지", dataIndex: "lastErrorMessage" },
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
                onSuccess: () => notification.success({
                  title: "재시도 큐에 추가되었습니다.",
                  description: "발송하려면 수동 Dispatch를 실행하세요. 대상일이 지난 예약 알림은 다시 건너뜁니다.",
                }),
                onError: (err) => {
                  const p = parseProblemDetail(err);
                  notification.error({ title: p?.title ?? "Requeue 실패", description: p?.detail });
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
