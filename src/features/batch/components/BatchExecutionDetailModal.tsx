"use client";

import type { CSSProperties } from "react";
import { Descriptions, Modal, Spin, Table, Tag, Typography } from "antd";
import type { DescriptionsProps, TableColumnsType } from "antd";

import { formatDurationMillis } from "../duration";
import { batchExecutionStatusColor } from "../executionStatus";
import { useBatchExecution } from "../hooks";
import type { BatchStepExecution, BatchStepKind } from "../types";

const { Text } = Typography;

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
  background: "#fafafa",
  border: "1px solid #f0f0f0",
  borderRadius: 6,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  fontSize: 12,
  lineHeight: 1.6,
};

const stepColumns: TableColumnsType<BatchStepExecution> = [
  { title: "스텝 ID", dataIndex: "stepExecutionId", width: 100 },
  { title: "스텝명", dataIndex: "stepName" },
  {
    title: "유형",
    dataIndex: "kind",
    width: 100,
    render: (value: BatchStepKind) => <Tag color={STEP_KIND_COLOR[value] ?? "default"}>{value}</Tag>,
  },
  {
    title: "상태",
    dataIndex: "status",
    width: 120,
    render: (value: BatchStepExecution["status"]) => (
      <Tag color={batchExecutionStatusColor(value)}>{value}</Tag>
    ),
  },
  {
    title: "종료 코드",
    dataIndex: "exitCode",
    width: 120,
    render: (value: string | null) => value ?? "-",
  },
  { title: "읽음", dataIndex: "readCount", width: 80, render: renderItemCount },
  { title: "씀", dataIndex: "writeCount", width: 80, render: renderItemCount },
  { title: "커밋", dataIndex: "commitCount", width: 80 },
  { title: "롤백", dataIndex: "rollbackCount", width: 80 },
  {
    title: "시작",
    dataIndex: "startTime",
    width: 180,
    render: (value: string | null) => value ?? "-",
  },
  {
    title: "종료",
    dataIndex: "endTime",
    width: 180,
    render: (value: string | null) => value ?? "-",
  },
];

export function BatchExecutionDetailModal({
  executionId,
  onClose,
}: {
  executionId: number | null;
  onClose: () => void;
}) {
  const { data, isLoading } = useBatchExecution(executionId);

  const items: DescriptionsProps["items"] = data
    ? [
        { key: "executionId", label: "실행 ID", children: data.executionId },
        { key: "jobInstanceId", label: "Job 인스턴스 ID", children: data.jobInstanceId },
        { key: "jobName", label: "Job", children: data.jobName },
        { key: "targetDate", label: "대상 날짜", children: data.targetDate ?? "-" },
        {
          key: "status",
          label: "상태",
          children: (
            <>
              <Tag color={batchExecutionStatusColor(data.status)}>{data.status}</Tag>
              {data.stale && <Tag color="warning">지연</Tag>}
            </>
          ),
        },
        { key: "exitCode", label: "종료 코드", children: data.exitCode ?? "-" },
        { key: "createTime", label: "생성", children: data.createTime },
        { key: "startTime", label: "시작", children: data.startTime ?? "-" },
        { key: "endTime", label: "종료", children: data.endTime ?? "-" },
        {
          key: "durationMillis",
          label: "소요 시간",
          children: formatDurationMillis(data.durationMillis),
        },
        {
          key: "retryable",
          label: "재시도 가능",
          children: (
            <Tag color={data.retryable ? "blue" : "default"}>{data.retryable ? "가능" : "불가"}</Tag>
          ),
        },
      ]
    : [];

  return (
    <Modal
      title={executionId === null ? "배치 실행 상세" : `배치 실행 #${executionId}`}
      open={executionId !== null}
      footer={null}
      width={1000}
      onCancel={onClose}
      destroyOnHidden
    >
      {isLoading || !data ? (
        <Spin size="large" style={{ display: "block", textAlign: "center", margin: "48px 0" }} />
      ) : (
        <>
          <Descriptions bordered column={2} size="small" items={items} />

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            스텝
          </Typography.Title>
          <Table
            columns={stepColumns}
            dataSource={data.steps}
            rowKey={(step) => String(step.stepExecutionId)}
            pagination={false}
            size="small"
            scroll={{ x: "max-content" }}
          />

          <Typography.Title level={5} style={{ marginTop: 24 }}>
            종료 메시지
          </Typography.Title>
          {data.exitMessage ? (
            <pre style={EXIT_MESSAGE_STYLE}>{data.exitMessage}</pre>
          ) : (
            <Text type="secondary">종료 메시지가 없습니다.</Text>
          )}
        </>
      )}
    </Modal>
  );
}
