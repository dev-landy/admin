"use client";

import { useRouter } from "next/navigation";
import { Button, Card, Space, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

import { BatchScheduleTable } from "@/features/batch/components/BatchScheduleTable";
import { useBatchSchedules } from "@/features/batch/hooks";

const { Title } = Typography;

export default function BatchSchedulesPage() {
  const router = useRouter();
  const { data, isLoading, isFetching, refetch } = useBatchSchedules();

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>배치 실행 시간</Title>}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
            새로고침
          </Button>
          <Button onClick={() => router.push("/batch")}>실행 이력</Button>
        </Space>
      }
    >
      <BatchScheduleTable data={data?.schedules ?? []} loading={isLoading} />
    </Card>
  );
}
