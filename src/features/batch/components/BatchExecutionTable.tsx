"use client";

import { useState } from "react";
import { Button, DatePicker, Select, Tag } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";

import { PagedTable } from "@/components/PagedTable";
import { formatSeconds } from "@/lib/format/date";
import { formatDurationMillis } from "../duration";
import {
  BATCH_EXECUTION_STATUS_OPTIONS,
  BATCH_EXIT_CODE_OPTIONS,
  batchExecutionStatusColor,
} from "../executionStatus";
import type { BatchExecutionStatus, BatchExecutionSummary, BatchExitCode } from "../types";
import { BatchExecutionDetailModal } from "./BatchExecutionDetailModal";

const DATE_FORMAT = "YYYY-MM-DD";

type Props = {
  data: BatchExecutionSummary[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, size: number) => void;
  filters: {
    jobName?: string;
    status?: BatchExecutionStatus;
    exitCode?: BatchExitCode;
    targetDateFrom?: string;
    targetDateTo?: string;
  };
  onFilterChange: (key: string, value: string | undefined) => void;
  // 대상 날짜 범위는 targetDateFrom·targetDateTo 두 파라미터를 한 번에 바꿔야 해서
  // 단일 키 핸들러를 두 번 호출하면 나중 호출이 앞 호출을 덮어쓴다. 별도 핸들러를 둔다.
  onTargetDateRangeChange: (from: string | undefined, to: string | undefined) => void;
  jobNames: string[];
};

export function BatchExecutionTable({
  data,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  filters,
  onFilterChange,
  onTargetDateRangeChange,
  jobNames,
}: Props) {
  const [detailExecutionId, setDetailExecutionId] = useState<number | null>(null);

  // 한쪽 끝만 지정된 범위도 필터가 걸린 상태로 표시해야 해서 정의된 값만 모아 쓴다.
  const targetDateFilterValue = [filters.targetDateFrom, filters.targetDateTo].filter(
    (value): value is string => value !== undefined,
  );

  const columns: TableColumnsType<BatchExecutionSummary> = [
    { title: "실행 ID", dataIndex: "executionId", width: 100, align: "center", filteredValue: null },
    {
      title: "Job",
      dataIndex: "jobName",
      width: 220,
      filteredValue: filters.jobName ? [filters.jobName] : null,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            placeholder="전체"
            value={filters.jobName}
            style={{ width: 240 }}
            onChange={(value) => onFilterChange("jobName", value)}
            options={jobNames.map((jobName) => ({ label: jobName, value: jobName }))}
          />
        </div>
      ),
    },
    {
      title: "대상 날짜",
      dataIndex: "targetDate",
      width: 120,
      align: "center",
      filteredValue: targetDateFilterValue.length > 0 ? targetDateFilterValue : null,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <DatePicker.RangePicker
            format={DATE_FORMAT}
            placeholder={["시작일", "종료일"]}
            value={
              targetDateFilterValue.length > 0
                ? [
                    filters.targetDateFrom ? dayjs(filters.targetDateFrom) : null,
                    filters.targetDateTo ? dayjs(filters.targetDateTo) : null,
                  ]
                : null
            }
            // 범위를 비우면 dates가 null로 들어와 두 파라미터를 함께 제거한다.
            onChange={(dates) =>
              onTargetDateRangeChange(
                dates?.[0]?.format(DATE_FORMAT),
                dates?.[1]?.format(DATE_FORMAT),
              )
            }
          />
        </div>
      ),
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "상태",
      dataIndex: "status",
      width: 150,
      filteredValue: filters.status ? [filters.status] : null,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            placeholder="전체"
            value={filters.status}
            style={{ width: 160 }}
            onChange={(value) => onFilterChange("status", value)}
            options={BATCH_EXECUTION_STATUS_OPTIONS}
          />
        </div>
      ),
      render: (value: BatchExecutionStatus, execution) => (
        <>
          <Tag color={batchExecutionStatusColor(value)}>{value}</Tag>
          {execution.stale && <Tag color="warning">지연</Tag>}
        </>
      ),
    },
    {
      title: "종료 코드",
      dataIndex: "exitCode",
      width: 140,
      filteredValue: filters.exitCode ? [filters.exitCode] : null,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            placeholder="전체"
            value={filters.exitCode}
            style={{ width: 320 }}
            onChange={(value) => onFilterChange("exitCode", value)}
            options={BATCH_EXIT_CODE_OPTIONS}
          />
        </div>
      ),
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "시작",
      dataIndex: "startTime",
      width: 180,
      filteredValue: null,
      render: (value: string | null) => formatSeconds(value),
    },
    {
      title: "종료",
      dataIndex: "endTime",
      width: 180,
      filteredValue: null,
      render: (value: string | null) => formatSeconds(value),
    },
    {
      title: "소요 시간",
      dataIndex: "durationMillis",
      width: 120,
      align: "right",
      filteredValue: null,
      render: (value: number | null) => formatDurationMillis(value),
    },
    {
      title: "버전",
      dataIndex: "jobVersion",
      width: 90,
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "액션",
      key: "actions",
      width: 90,
      align: "center",
      filteredValue: null,
      render: (_value, execution) => (
        <Button size="small" onClick={() => setDetailExecutionId(execution.executionId)}>
          상세
        </Button>
      ),
    },
  ];

  return (
    <>
      <PagedTable
        columns={columns}
        dataSource={data}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        rowKey={(execution) => String(execution.executionId)}
      />
      <BatchExecutionDetailModal
        executionId={detailExecutionId}
        onClose={() => setDetailExecutionId(null)}
      />
    </>
  );
}
