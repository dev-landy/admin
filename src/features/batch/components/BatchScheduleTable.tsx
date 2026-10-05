"use client";

import type { ListSortControl } from "@/lib/navigation/useListSort";

import { PagedTable } from "@/components/PagedTable";
import { RecordCard } from "@/components/RecordCard";
import { EntityCell } from "@/components/EntityCell";
import { RowActions } from "@/components/RowActions";


import { useState } from "react";
import { App, Button, Descriptions, Switch, Typography } from "antd";
import type { TableColumnsType } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { describeCron } from "../cron";
import { formatSeconds } from "@/lib/format/date";
import { useIsBatchScheduleUpdating, useUpdateBatchSchedule } from "../hooks";
import type { BatchSchedule, BatchScheduleKey } from "../types";
import { BatchScheduleEditModal } from "./BatchScheduleEditModal";
import { BatchScheduleToggleModal } from "./BatchScheduleToggleModal";

const { Text } = Typography;

const BATCH_SCHEDULE_COLUMN_SIZING = {
  job: { min: 300, preferred: 560, grow: 2 },
  cronExpression: { min: 240, preferred: 300, grow: 1 },
  next: { min: 240, preferred: 300, grow: 1 },
  enabled: { min: 128 },
  actions: { min: 144 },
} as const;

// 라벨이 받침으로 끝나는지에 따라 을/를이 갈린다. 고정 조사를 쓰면 절반은 어색해진다.
const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const HANGUL_JONGSEONG_COUNT = 28;

function objectParticle(word: string): string {
  const lastCode = word.codePointAt(word.length - 1) ?? 0;
  if (lastCode < HANGUL_SYLLABLE_START || lastCode > HANGUL_SYLLABLE_END) {
    return "을(를)";
  }

  return (lastCode - HANGUL_SYLLABLE_START) % HANGUL_JONGSEONG_COUNT === 0 ? "를" : "을";
}

type ToggleTarget = { schedule: BatchSchedule; enabled: boolean };

type Props = {
  sortControl?: ListSortControl;
  data: BatchSchedule[];
  loading: boolean;
  disabled?: boolean;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number, pageSize: number) => void;
};

export function BatchScheduleTable({ sortControl, data, loading, disabled = false, page: controlledPage, pageSize: controlledPageSize, onPageChange }: Props) {
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(20);
  const page = controlledPage ?? localPage;
  const pageSize = controlledPageSize ?? localPageSize;
  const [editing, setEditing] = useState<BatchSchedule | null>(null);
  // 스위치를 눌러도 바로 반영하지 않는다. 비활성화는 운영 중인 배치 트리거를 멈추는 일이라
  // 확인 모달을 한 번 거치고, 확인 전까지 스위치는 서버 값 그대로 남는다.
  const [toggleTarget, setToggleTarget] = useState<ToggleTarget | null>(null);
  // mutation은 테이블 전체가 공유해서 isPending만으로는 어느 행을 바꾸는 중인지 알 수 없다.
  const [togglingKey, setTogglingKey] = useState<BatchScheduleKey | null>(null);
  const { notification } = App.useApp();
  const { mutate: update, isPending } = useUpdateBatchSchedule();
  const sharedPending = useIsBatchScheduleUpdating();
  const isUpdating = sharedPending || isPending || togglingKey !== null;

  // PATCH는 크론 식도 함께 요구하므로 행의 현재 값을 그대로 돌려보낸다.
  // 낙관적 갱신은 하지 않아 실패하면 스위치가 서버 값에 남는다.
  function confirmToggle({ schedule, enabled }: ToggleTarget) {
    if (isUpdating || disabled) return;
    setTogglingKey(schedule.key);
    update(
      {
        key: schedule.key,
        body: { cronExpression: schedule.cronExpression, enabled },
      },
      {
        onSuccess: () => {
          notification.success({
            title: `${schedule.label}${objectParticle(schedule.label)} ${
              enabled ? "활성화" : "비활성화"
            }했습니다.`,
          });
          setToggleTarget(null);
        },
        onError: (error) => {
          const problem = parseProblemDetail(error);
          notification.error({
            title: problem?.title ?? "활성 상태 변경 실패",
            description: problem?.detail,
          });
        },
        onSettled: () => setTogglingKey(null),
      },
    );
  }

  const renderActions = (schedule: BatchSchedule) => <RowActions subject={schedule.label} disabled={isUpdating || disabled || toggleTarget !== null || editing !== null}
    primary={<Button size="small" disabled={isUpdating || disabled || toggleTarget !== null} onClick={() => { if (!isUpdating && !disabled) setEditing(schedule); }}>수정</Button>}
    items={[{ key: "history", label: "실행 이력", href: `/batch?jobName=${encodeURIComponent(schedule.jobName)}` }]} />;
  const renderToggle = (schedule: BatchSchedule) => <Switch aria-label={`${schedule.label} 활성 상태`} checked={schedule.enabled}
    loading={togglingKey === schedule.key} disabled={isUpdating || disabled || editing !== null} checkedChildren="활성" unCheckedChildren="비활성"
    onChange={(checked) => { if (!isUpdating && !disabled) setToggleTarget({ schedule, enabled: checked }); }} />;
  const renderDetails = (record: BatchSchedule) => <Descriptions column={1} size="small" layout="vertical" items={[
    { key: "key", label: "작업 키", children: record.key },
    { key: "job", label: "Job", children: record.jobName },
    { key: "cron", label: "정확한 크론 식", children: <Text code>{record.cronExpression}</Text> },
    { key: "updated", label: "마지막 수정", children: formatSeconds(record.updatedAt) },
  ]} />;
  const columns: TableColumnsType<BatchSchedule> = [
    { title: "반복 작업", key: "job", width: 300, render: (_, record) => <EntityCell primary={record.label} secondary={<Text code>{record.jobName}</Text>} /> },
    {
      title: "실행 시각",
      dataIndex: "cronExpression",
      width: 240,
      // 설명만 두면 정확한 식을 확인할 수 없어 원문 크론 식을 함께 보여준다.
      // 해석하지 못한 식은 설명 자리에 원문이 그대로 나오므로 같은 값을 두 번 찍지 않는다.
      render: (value: string) => {
        const description = describeCron(value);
        return (
          <>
            <div>{description}</div>
            {description !== value && (
              <Text code type="secondary">
                {value}
              </Text>
            )}
          </>
        );
      },
    },
    {
      title: "다음 실행 예정", key: "next", width: 240,
      render: (_, record) => <EntityCell primary={formatSeconds(record.nextExecutionAt)} secondary={`수정 ${formatSeconds(record.updatedAt)}`} />,
    },
    {
      title: "활성",
      dataIndex: "enabled",
      width: 128,
      align: "center",
      render: (_value: boolean, schedule) => renderToggle(schedule),
    },
    {
      title: "작업",
      key: "actions",
      width: 144,
      fixed: "right",
      render: (_value, schedule) => renderActions(schedule),
    },
  ];

  const compactColumns: TableColumnsType<BatchSchedule> = [
    { title: "반복 작업", key: "job", width: 300, render: (_, record) => <EntityCell primary={record.label} secondary={describeCron(record.cronExpression)} meta={`다음 실행 ${formatSeconds(record.nextExecutionAt)}`} /> },
    { title: "예약 상태", key: "enabled", width: 128, align: "center", render: (_, record) => renderToggle(record) },
    { title: "작업", key: "actions", width: 144, render: (_, record) => renderActions(record) },
  ];
  const currentPage = Math.min(page, Math.max(1, Math.ceil(data.length / pageSize)));

  return (
    <>
      <PagedTable sortControl={sortControl} columns={columns} compactColumns={compactColumns} columnSizing={BATCH_SCHEDULE_COLUMN_SIZING} renderCompactDetails={renderDetails}
        renderCard={(record) => <RecordCard title={record.label} subtitle={record.jobName} meta={renderToggle(record)}
          ariaLabel={`배치 일정 ${record.label}`} fields={[
            { label: "한국 시간 예약", value: describeCron(record.cronExpression) },
            { label: "다음 실행 예정", value: formatSeconds(record.nextExecutionAt) },
          ]} actions={renderActions(record)} details={renderDetails(record)} />}
        dataSource={data.slice((currentPage - 1) * pageSize, currentPage * pageSize)} loading={loading} page={currentPage} pageSize={pageSize} total={data.length}
        onPageChange={(nextPage, nextSize) => { if (onPageChange) onPageChange(nextPage, nextSize); else { setLocalPage(nextPage); setLocalPageSize(nextSize); } }} rowKey={(record) => record.key}
        emptyText="등록된 배치 스케줄이 없습니다." ariaLabel="배치 일정 목록" />
      <BatchScheduleToggleModal
        schedule={toggleTarget?.schedule ?? null}
        enabled={toggleTarget?.enabled ?? false}
        loading={isUpdating}
        disabled={disabled}
        onCancel={() => { if (!isUpdating) setToggleTarget(null); }}
        onConfirm={() => toggleTarget && confirmToggle(toggleTarget)}
      />
      <BatchScheduleEditModal schedule={editing} disabled={disabled} onClose={() => setEditing(null)} />
    </>
  );
}
