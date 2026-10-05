"use client";

import { useListSort } from "@/lib/navigation/useListSort";
import { sortRecords } from "@/lib/table/sort-records";

import { useState, type CSSProperties } from "react";
import { Alert, Descriptions, Modal, Spin, Tag, Typography } from "antd";
import type { DescriptionsProps, TableColumnsType } from "antd";

import { PagedTable } from "@/components/PagedTable";
import { RecordCard } from "@/components/RecordCard";
import { EntityCell } from "@/components/EntityCell";
import { useAdminViewport } from "@/components/useAdminViewport";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";

import { formatMillis } from "@/lib/format/date";
import { formatDurationMillis } from "../duration";
import { batchExecutionStatusColor, batchExecutionStatusLabel } from "../executionStatus";
import { useBatchExecution } from "../hooks";
import type { BatchStepExecution, BatchStepKind } from "../types";

const { Text } = Typography;

const BATCH_STEP_COLUMN_SIZING = {
  stepExecutionId: { min: 100 },
  stepName: { min: 240, preferred: 500, grow: 2 },
  kind: { min: 100 },
  status: { min: 260 },
  exitCode: { min: 240, preferred: 300, grow: 1 },
  readCount: { min: 80 },
  writeCount: { min: 80 },
  commitCount: { min: 80 },
  rollbackCount: { min: 80 },
  startTime: { min: 220, preferred: 260, grow: 0.5 },
  endTime: { min: 220, preferred: 260, grow: 0.5 },
  step: { min: 280, preferred: 480, grow: 2 },
  result: { min: 240, preferred: 360, grow: 1 },
  counts: { min: 220, preferred: 360, grow: 1 },
} as const;

const STEP_KIND_COLOR: Record<BatchStepKind, string> = {
  CHUNK: "blue",
  TASKLET: "purple",
  UNKNOWN: "default",
};

// tasklet 스텝에는 ItemReader·ItemWriter가 없어 읽음·씀 카운터가 구조적으로 항상 0이다.
// 0을 그대로 보여주면 "아무것도 처리하지 않았다"로 오독되므로 - 로 표시한다.
// 반면 커밋·롤백은 tasklet에서도 트랜잭션 단위를 의미하므로 숫자 그대로 둔다.
function renderItemCount(value: number, step: BatchStepExecution) {
  return step.kind === "TASKLET" ? "-" : value;
}

const EXIT_MESSAGE_STYLE: CSSProperties = {
  margin: 0,
  maxHeight: 240,
  overflow: "auto",
  padding: 12,
  background: "var(--admin-code-bg)",
  border: "1px solid var(--admin-border)",
  borderRadius: 6,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  fontSize: 12,
  lineHeight: 1.6,
};

const stepColumns: TableColumnsType<BatchStepExecution> = [
  { title: "스텝 ID", dataIndex: "stepExecutionId", width: 100 },
  { title: "스텝명", dataIndex: "stepName", width: 240 },
  {
    title: "유형",
    dataIndex: "kind",
    width: 100,
    render: (value: BatchStepKind) => <Tag color={STEP_KIND_COLOR[value] ?? "default"}>{value}</Tag>,
  },
  {
    title: "상태",
    dataIndex: "status",
    width: 260,
    render: (value: BatchStepExecution["status"]) => (
      <Tag color={batchExecutionStatusColor(value)}>{batchExecutionStatusLabel(value)}</Tag>
    ),
  },
  {
    title: "종료 코드",
    dataIndex: "exitCode",
    width: 240,
    render: (value: string | null) => value ?? "-",
  },
  { title: "읽음", dataIndex: "readCount", width: 80, align: "right", className: "admin-numeric", render: renderItemCount },
  { title: "씀", dataIndex: "writeCount", width: 80, align: "right", className: "admin-numeric", render: renderItemCount },
  { title: "커밋", dataIndex: "commitCount", width: 80, align: "right", className: "admin-numeric" },
  { title: "롤백", dataIndex: "rollbackCount", width: 80, align: "right", className: "admin-numeric" },
  {
    title: "시작",
    dataIndex: "startTime",
    width: 220,
    render: (value: string | null) => formatMillis(value),
  },
  {
    title: "종료",
    dataIndex: "endTime",
    width: 220,
    render: (value: string | null) => formatMillis(value),
  },
];

export function BatchExecutionDetailModal({
  executionId,
  onClose,
}: {
  executionId: number | null;
  onClose: () => void;
}) {
  const viewport = useAdminViewport();
  const [stepPage, setStepPage] = useState(1);
  const [stepPageSize, setStepPageSize] = useState(20);
  const { data, isLoading, error, isFetching, refetch } = useBatchExecution(executionId);
  const sort = useListSort({ fields: [{ value: "stepExecutionId", label: "스텝 ID" }, { value: "startTime", label: "시작 시각" }], defaultField: "stepExecutionId", defaultDirection: "asc", navigation: undefined });
  const steps = sort.requestParams.sort ? sortRecords(data?.steps ?? [], sort.field, sort.direction, "stepExecutionId") : data?.steps ?? [];
  const sortControl = { ...sort.control, onChange: (field: string, direction: "asc" | "desc") => { sort.control.onChange(field, direction); setStepPage(1); } };

  const items: DescriptionsProps["items"] = data
    ? [
        { key: "executionId", label: "실행 ID", children: data.executionId },
        { key: "jobInstanceId", label: "Job 인스턴스 ID", children: data.jobInstanceId },
        { key: "jobName", label: "Job", children: data.jobName },
        { key: "jobVersion", label: "Job 버전", children: data.jobVersion ?? "-" },
        { key: "targetDate", label: "대상 날짜", children: data.targetDate ?? "-" },
        {
          key: "status",
          label: "상태",
          children: (
            <>
              <Tag color={batchExecutionStatusColor(data.status)}>{batchExecutionStatusLabel(data.status)}</Tag>
              {data.stale && <Tag color="warning">지연</Tag>}
            </>
          ),
        },
        { key: "exitCode", label: "종료 코드", children: data.exitCode ?? "-" },
        { key: "createTime", label: "생성", children: formatMillis(data.createTime) },
        { key: "startTime", label: "시작", children: formatMillis(data.startTime) },
        { key: "endTime", label: "종료", children: formatMillis(data.endTime) },
        {
          key: "durationMillis",
          label: "소요 시간",
          children: formatDurationMillis(data.durationMillis),
        },
      ]
    : [];

  const renderStepDetails = (step: BatchStepExecution) => <Descriptions column={1} size="small" layout="vertical" items={[
    { key: "id", label: "스텝 ID", children: step.stepExecutionId },
    { key: "kind", label: "유형", children: step.kind },
    { key: "exit", label: "종료 코드", children: step.exitCode ?? "-" },
    { key: "read", label: "읽음", children: renderItemCount(step.readCount, step) },
    { key: "write", label: "씀", children: renderItemCount(step.writeCount, step) },
    { key: "commit", label: "커밋", children: step.commitCount },
    { key: "rollback", label: "롤백", children: step.rollbackCount },
    { key: "start", label: "시작", children: formatMillis(step.startTime) },
    { key: "end", label: "종료", children: formatMillis(step.endTime) },
    { key: "message", label: "스텝 종료 메시지", children: step.exitMessage ? <pre style={EXIT_MESSAGE_STYLE}>{step.exitMessage}</pre> : "없음" },
  ]} />;
  const compactStepColumns: TableColumnsType<BatchStepExecution> = [
    { title: "스텝", key: "step", width: 280, render: (_, step) => <EntityCell primary={step.stepName} secondary={step.kind} meta={`스텝 #${step.stepExecutionId}`} /> },
    { title: "결과", key: "result", width: 240, render: (_, step) => <EntityCell primary={<Tag color={batchExecutionStatusColor(step.status)}>{batchExecutionStatusLabel(step.status)}</Tag>} secondary={step.exitCode ?? "-"} /> },
    { title: "처리량", key: "counts", width: 220, render: (_, step) => <EntityCell primary={`읽음 ${renderItemCount(step.readCount, step)} · 씀 ${renderItemCount(step.writeCount, step)}`} secondary={`커밋 ${step.commitCount} · 롤백 ${step.rollbackCount}`} /> },
  ];
  const currentStepPage = Math.min(stepPage, Math.max(1, Math.ceil((data?.steps.length ?? 0) / stepPageSize)));

  return (
    <Modal
      title={executionId === null ? "배치 실행 상세" : `배치 실행 #${executionId}`}
      open={executionId !== null}
      footer={null}
      width={1000}
      onCancel={onClose}
      destroyOnHidden
    >
      <QueryErrorAlert error={error} title="배치 실행 상세를 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {isLoading ? (
        <Spin size="large" style={{ display: "block", textAlign: "center", margin: "48px 0" }} />
      ) : data ? (
        <>
          {data.jobName === "dailyDispatchAuditJob" && (
            <Alert
              type="info"
              showIcon
              title="일일 발송 점검은 미해결 건을 보고합니다"
              description="잔여 건이 있으면 FAILED로 기록됩니다. 종료 메시지를 확인한 뒤 알림 Outbox에서 재처리하거나 알림톡 발송 이력에서 미결 건을 종결하세요."
              style={{ marginBottom: 16 }}
            />
          )}
          <Descriptions bordered layout={viewport === "mobile" ? "vertical" : "horizontal"} column={{ xs: 1, md: 2 }} size="small" items={items} />

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            스텝
          </Typography.Title>
          <PagedTable sortControl={sortControl} columns={stepColumns} compactColumns={compactStepColumns} columnSizing={BATCH_STEP_COLUMN_SIZING} renderCompactDetails={renderStepDetails}
            renderCard={(step) => <RecordCard title={step.stepName} subtitle={`${step.kind} · 스텝 #${step.stepExecutionId}`}
              meta={<Tag color={batchExecutionStatusColor(step.status)}>{batchExecutionStatusLabel(step.status)}</Tag>} ariaLabel={`배치 스텝 #${step.stepExecutionId}`}
              fields={[{ label: "종료 코드", value: step.exitCode ?? "-" }, { label: "읽음 · 씀", value: `${renderItemCount(step.readCount, step)} · ${renderItemCount(step.writeCount, step)}` }, { label: "커밋 · 롤백", value: `${step.commitCount} · ${step.rollbackCount}` }, { label: "시작", value: formatMillis(step.startTime) }, { label: "종료", value: formatMillis(step.endTime) }]}
              details={renderStepDetails(step)} />}
            dataSource={steps.slice((currentStepPage - 1) * stepPageSize, currentStepPage * stepPageSize)} loading={false}
            rowKey={(step) => String(step.stepExecutionId)} page={currentStepPage} pageSize={stepPageSize} total={data.steps.length}
            onPageChange={(page, size) => { setStepPage(page); setStepPageSize(size); }} ariaLabel="배치 스텝 목록" emptyText="실행된 스텝이 없습니다." />

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            종료 메시지
          </Typography.Title>
          {data.exitMessage ? (
            <pre tabIndex={0} aria-label="배치 종료 메시지" style={EXIT_MESSAGE_STYLE}>{data.exitMessage}</pre>
          ) : (
            <Text type="secondary">종료 메시지가 없습니다.</Text>
          )}
        </>
      ) : null}
    </Modal>
  );
}
