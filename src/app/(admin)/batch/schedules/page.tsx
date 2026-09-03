"use client";

import { Button, Card, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

import { BatchScheduleTable } from "@/features/batch/components/BatchScheduleTable";
import { useBatchSchedules } from "@/features/batch/hooks";

const { Title } = Typography;

export default function BatchSchedulesPage() {
  const { data, isLoading, isFetching, refetch } = useBatchSchedules();

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>배치 설정</Title>}
      extra={
        <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
          새로고침
        </Button>
      }
    >
      <BatchScheduleTable data={data?.schedules ?? []} loading={isLoading} />
    </Card>
  );
}
