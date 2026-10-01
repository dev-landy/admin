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
        description="변경 사항은 저장 후 각 서버가 기본 1분 주기로 조회해 반영합니다. 동기화가 지연되면 반영도 늦어질 수 있으며, 비활성화해도 이미 실행 중인 작업은 중단되지 않습니다. 납부일 알림톡의 발송 마감은 스케줄을 바꿔도 08:55입니다. 일일 발송 점검은 미해결 건을 보고하며 자동으로 재발송하지 않습니다."
        style={{ marginBottom: 16 }}
      />
      <BatchScheduleTable data={data?.schedules ?? []} loading={isLoading} />
    </Card>
  );
}
