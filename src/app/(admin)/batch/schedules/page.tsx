"use client";

import { Alert, Button, Card, Typography } from "antd";
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
      <Alert
        type="info"
        showIcon
        title="실행 시각은 한국 시간입니다"
        description="변경 사항은 서버별로 최대 1분 뒤 반영됩니다. 납부일 알림톡의 발송 마감은 스케줄을 바꿔도 08:55입니다. 일일 발송 점검은 미해결 건을 보고하며 자동으로 재발송하지 않습니다."
        style={{ marginBottom: 16 }}
      />
      <BatchScheduleTable data={data?.schedules ?? []} loading={isLoading} />
    </Card>
  );
}
