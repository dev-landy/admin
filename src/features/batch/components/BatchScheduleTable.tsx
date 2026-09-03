"use client";

import { useState } from "react";
import { Button, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";

import type { BatchSchedule } from "../types";
import { BatchScheduleEditModal } from "./BatchScheduleEditModal";

const { Text } = Typography;

type Props = {
  data: BatchSchedule[];
  loading: boolean;
};

export function BatchScheduleTable({ data, loading }: Props) {
  const [editing, setEditing] = useState<BatchSchedule | null>(null);

  const columns: TableColumnsType<BatchSchedule> = [
    { title: "작업", dataIndex: "label", width: 220 },
    { title: "Job", dataIndex: "jobName", width: 220 },
    {
      title: "크론 식",
      dataIndex: "cronExpression",
      width: 160,
      render: (value: string) => <Text code>{value}</Text>,
    },
    { title: "타임존", dataIndex: "zoneId", width: 140 },
    {
      title: "활성",
      dataIndex: "enabled",
      width: 100,
      align: "center",
      render: (value: boolean) => (
        <Tag color={value ? "green" : "default"}>{value ? "활성" : "비활성"}</Tag>
      ),
    },
    {
      title: "다음 실행 예정",
      dataIndex: "nextExecutionAt",
      width: 200,
      render: (value: string | null) => value ?? "-",
    },
    { title: "수정일", dataIndex: "updatedAt", width: 200 },
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
      <BatchScheduleEditModal schedule={editing} onClose={() => setEditing(null)} />
    </>
  );
}
