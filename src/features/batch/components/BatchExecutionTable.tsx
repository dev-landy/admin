"use client";

import type { ListSortControl } from "@/lib/navigation/useListSort";

import { useState } from "react";
import { Button, DatePicker, Descriptions, Select, Tag } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";

import { RecordCard } from "@/components/RecordCard";
import { EntityCell } from "@/components/EntityCell";
import { RowActions } from "@/components/RowActions";
import { PagedTable } from "@/components/PagedTable";
import { formatSeconds } from "@/lib/format/date";
import { formatDurationMillis } from "../duration";
import {
  BATCH_EXECUTION_STATUS_OPTIONS,
  BATCH_EXIT_CODE_OPTIONS,
  batchExecutionStatusColor, batchExecutionStatusLabel,
} from "../executionStatus";
import type { BatchExecutionStatus, BatchExecutionSummary, BatchExitCode } from "../types";
import { BatchExecutionDetailModal } from "./BatchExecutionDetailModal";

const BATCH_EXECUTION_COLUMN_SIZING = {
  jobName: { min: 300, preferred: 520, grow: 2 },
  targetDate: { min: 170 },
  status: { min: 260 },
  exitCode: { min: 240, preferred: 300, grow: 1 },
  times: { min: 240, preferred: 280, grow: 0.5 },
  actions: { min: 144 },
  job: { min: 340, preferred: 620, grow: 2 },
  state: { min: 260, preferred: 400, grow: 1 },
} as const;

const DATE_FORMAT = "YYYY-MM-DD";

type Props = {
  sortControl?: ListSortControl;
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
    executionId?: number;
    startedFrom?: string;
    startedTo?: string;
  };
  onFilterChange: (key: string, value: string | undefined) => void;
  // 대상 날짜 범위는 targetDateFrom·targetDateTo 두 파라미터를 한 번에 바꿔야 해서
  // 단일 키 핸들러를 두 번 호출하면 나중 호출이 앞 호출을 덮어쓴다. 별도 핸들러를 둔다.
  onTargetDateRangeChange: (from: string | undefined, to: string | undefined) => void;
  jobNames: string[];
};

export function BatchExecutionTable({ sortControl,
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

  const renderActions = (record: BatchExecutionSummary) => <RowActions subject={`배치 실행 #${record.executionId}`}
    primary={<Button size="small" onClick={() => setDetailExecutionId(record.executionId)}>상세</Button>} items={[]} />;
  const renderDetails = (record: BatchExecutionSummary) => <Descriptions column={1} size="small" layout="vertical" items={[
    { key: "ids", label: "실행 · 인스턴스", children: `#${record.executionId} · #${record.jobInstanceId}` },
    { key: "version", label: "작업 버전", children: record.jobVersion ?? "-" },
    { key: "exit", label: "종료 코드", children: record.exitCode ?? "-" },
    { key: "created", label: "생성 시각", children: formatSeconds(record.createTime) },
    { key: "duration", label: "소요 시간", children: formatDurationMillis(record.durationMillis) },
    { key: "message", label: "종료 메시지", children: <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{record.exitMessage ?? "-"}</div> },
  ]} />;
  const columns: TableColumnsType<BatchExecutionSummary> = [
    {
      title: "Job",
      dataIndex: "jobName",
      width: 300,
      filteredValue: filters.jobName ? [filters.jobName] : null,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            aria-label="배치 작업 필터"
            placeholder="전체"
            value={filters.jobName}
            style={{ width: 240 }}
            onChange={(value) => onFilterChange("jobName", value)}
            options={jobNames.map((jobName) => ({ label: jobName, value: jobName }))}
          />
        </div>
      ),
      render: (_, record) => <EntityCell primary={record.jobName} secondary={`실행 #${record.executionId}`}
        meta={`인스턴스 #${record.jobInstanceId}${record.jobVersion ? ` · ${record.jobVersion}` : ""}`} />,
    },
    {
      title: "대상 날짜",
      dataIndex: "targetDate",
      width: 170,
      align: "left",
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
      render: (value: string | null, record) => <EntityCell primary={value ?? "대상일 미지정"} secondary={`소요 ${formatDurationMillis(record.durationMillis)}`} />,
    },
    {
      title: "상태",
      dataIndex: "status",
      width: 260,
      align: "center",
      filteredValue: filters.status ? [filters.status] : null,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            aria-label="실행 상태 필터"
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
          <Tag color={batchExecutionStatusColor(value)}>{batchExecutionStatusLabel(value)}</Tag>
          {execution.stale && <Tag color="warning">지연</Tag>}
        </>
      ),
    },
    {
      title: "종료 코드",
      dataIndex: "exitCode",
      width: 240,
      filteredValue: filters.exitCode ? [filters.exitCode] : null,
      filterDropdown: () => (
        <div style={{ padding: 8 }}>
          <Select
            allowClear
            aria-label="종료 코드 필터"
            placeholder="전체"
            value={filters.exitCode}
            style={{ width: 280, maxWidth: "100%" }}
            popupMatchSelectWidth={false}
            onChange={(value) => onFilterChange("exitCode", value)}
            options={BATCH_EXIT_CODE_OPTIONS}
          />
        </div>
      ),
      render: (value: string | null) => value ?? "-",
    },
    {
      title: "실행 시각", key: "times", width: 240,
      render: (_, record) => <EntityCell
        primary={<><span>시작 </span><span>{formatSeconds(record.startTime)}</span></>}
        secondary={<><span>종료 </span><span>{formatSeconds(record.endTime)}</span></>} />,
    },
    {
      title: "작업",
      key: "actions",
      width: 144,
      fixed: "right",
      filteredValue: null,
      render: (_value, execution) => renderActions(execution),
    },
  ];

  const compactColumns: TableColumnsType<BatchExecutionSummary> = [
    { title: "작업 · 업무일", key: "job", width: 340, render: (_, record) => <EntityCell primary={record.jobName}
      secondary={`대상일 ${record.targetDate ?? "미지정"}`} meta={`실행 #${record.executionId}`} /> },
    { title: "결과 · 실제 실행", key: "state", width: 260, render: (_, record) => <EntityCell primary={<><Tag color={batchExecutionStatusColor(record.status)}>{batchExecutionStatusLabel(record.status)}</Tag>{record.stale && <Tag color="warning">지연</Tag>}</>}
      secondary={`시작 ${formatSeconds(record.startTime)}`} meta={`종료 ${formatSeconds(record.endTime)}`} /> },
    { title: "작업", key: "actions", width: 144, render: (_, record) => renderActions(record) },
  ];

  return (
    <>
      <PagedTable sortControl={sortControl}
        columns={columns} compactColumns={compactColumns} columnSizing={BATCH_EXECUTION_COLUMN_SIZING} renderCompactDetails={renderDetails}
        renderCard={(record) => <RecordCard title={record.jobName} subtitle={`실행 #${record.executionId}`}
          meta={<><Tag color={batchExecutionStatusColor(record.status)}>{batchExecutionStatusLabel(record.status)}</Tag>{record.stale && <Tag color="warning">지연</Tag>}</>}
          ariaLabel={`배치 실행 #${record.executionId}`} fields={[
            { label: "업무 대상일", value: record.targetDate ?? "미지정" },
            { label: "실제 시작 시각", value: formatSeconds(record.startTime) },
            { label: "실제 종료 시각", value: formatSeconds(record.endTime) },
            { label: "소요 시간", value: formatDurationMillis(record.durationMillis) },
            { label: "종료 코드", value: record.exitCode ?? "-" },
          ]} actions={renderActions(record)} details={renderDetails(record)} />}
        dataSource={data}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        emptyText={Object.values(filters).some((value) => value !== undefined) ? "조건에 맞는 배치 실행 이력이 없습니다. 필터를 초기화해 전체 이력을 확인하세요." : "기록된 배치 실행 이력이 없습니다."}
        ariaLabel="배치 실행 이력"
        rowKey={(execution) => String(execution.executionId)}
      />
      <BatchExecutionDetailModal
        executionId={detailExecutionId}
        onClose={() => setDetailExecutionId(null)}
      />
    </>
  );
}
