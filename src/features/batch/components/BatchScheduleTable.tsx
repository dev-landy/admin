"use client";

import { useState } from "react";
import { App, Button, Switch, Table, Typography } from "antd";
import type { TableColumnsType } from "antd";

import { parseProblemDetail } from "@/lib/api/problem";
import { describeCron } from "../cron";
import { formatSeconds } from "../dateTime";
import { useUpdateBatchSchedule } from "../hooks";
import type { BatchSchedule, BatchScheduleKey } from "../types";
import { BatchScheduleEditModal } from "./BatchScheduleEditModal";
import { BatchScheduleToggleModal } from "./BatchScheduleToggleModal";

const { Text } = Typography;

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
  data: BatchSchedule[];
  loading: boolean;
};

export function BatchScheduleTable({ data, loading }: Props) {
  const [editing, setEditing] = useState<BatchSchedule | null>(null);
  // 스위치를 눌러도 바로 반영하지 않는다. 비활성화는 운영 중인 배치 트리거를 멈추는 일이라
  // 확인 모달을 한 번 거치고, 확인 전까지 스위치는 서버 값 그대로 남는다.
  const [toggleTarget, setToggleTarget] = useState<ToggleTarget | null>(null);
  // mutation은 테이블 전체가 공유해서 isPending만으로는 어느 행을 바꾸는 중인지 알 수 없다.
  const [togglingKey, setTogglingKey] = useState<BatchScheduleKey | null>(null);
  const { notification } = App.useApp();
  const { mutate: update, isPending } = useUpdateBatchSchedule();

  // PATCH는 크론 식도 함께 요구하므로 행의 현재 값을 그대로 돌려보낸다.
  // 낙관적 갱신은 하지 않아 실패하면 스위치가 서버 값에 남는다.
  function confirmToggle({ schedule, enabled }: ToggleTarget) {
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

  const columns: TableColumnsType<BatchSchedule> = [
    { title: "Job", dataIndex: "jobName", width: 220 },
    { title: "작업", dataIndex: "label", width: 220 },
    {
      title: "실행 시각",
      dataIndex: "cronExpression",
      width: 260,
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
      title: "다음 실행 예정",
      dataIndex: "nextExecutionAt",
      width: 200,
      render: (value: string | null) => formatSeconds(value),
    },
    {
      title: "수정일",
      dataIndex: "updatedAt",
      width: 200,
      render: (value: string) => formatSeconds(value),
    },
    {
      title: "활성",
      dataIndex: "enabled",
      width: 100,
      align: "center",
      render: (value: boolean, schedule) => (
        <Switch
          checked={value}
          loading={togglingKey === schedule.key}
          checkedChildren="활성"
          unCheckedChildren="비활성"
          onChange={(checked) => setToggleTarget({ schedule, enabled: checked })}
        />
      ),
    },
    {
      title: "액션",
      key: "actions",
      width: 100,
      align: "center",
      render: (_value, schedule) => (
        <Button size="small" onClick={() => setEditing(schedule)}>
          수정
        </Button>
      ),
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey={(schedule) => schedule.key}
        pagination={false}
        scroll={{ x: "max-content" }}
      />
      <BatchScheduleToggleModal
        schedule={toggleTarget?.schedule ?? null}
        enabled={toggleTarget?.enabled ?? false}
        loading={isPending}
        onCancel={() => setToggleTarget(null)}
        onConfirm={() => toggleTarget && confirmToggle(toggleTarget)}
      />
      <BatchScheduleEditModal schedule={editing} onClose={() => setEditing(null)} />
    </>
  );
}
