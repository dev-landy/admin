"use client";

import Link from "next/link";
import { Alert, Button, Card } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

import { PageHeader } from "@/components/PageHeader";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";

import { BatchScheduleTable } from "@/features/batch/components/BatchScheduleTable";
import { useBatchSchedules } from "@/features/batch/hooks";

export default function BatchSchedulesPage() {
  const { data, isLoading, error, isFetching, refetch } = useBatchSchedules();

  return (
    <>
    <PageHeader title="배치 설정" description="반복 작업의 실행 시간과 활성 상태를 관리합니다."
      extra={<div className="admin-actions"><Link href="/batch">실행 이력 보기</Link>
        <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
          새로고침
        </Button></div>
      }
    />
    <Card>
      <Alert
        type="info"
        showIcon
        title="실행 시각은 한국 시간입니다"
        description="변경 사항은 저장 후 각 서버가 기본 1분 주기로 조회해 반영합니다. 동기화가 지연되면 반영도 늦어질 수 있으며, 비활성화해도 이미 실행 중인 작업은 중단되지 않습니다. 납부일 알림톡의 발송 마감은 스케줄을 바꿔도 08:55입니다. 일일 발송 점검은 미해결 건을 보고하며 자동으로 재발송하지 않습니다."
        style={{ marginBottom: 16 }}
      />
      <QueryErrorAlert error={error} title="배치 설정을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {(!error || data) && <BatchScheduleTable data={data?.schedules ?? []} loading={isLoading} disabled={isFetching || !!error} />}
    </Card>
    </>
  );
}
