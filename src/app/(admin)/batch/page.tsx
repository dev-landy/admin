"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Space, Spin, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

import { BatchExecutionTable } from "@/features/batch/components/BatchExecutionTable";
import { useBatchExecutions, useBatchJobs } from "@/features/batch/hooks";
import type { BatchExecutionStatus, BatchExitCode } from "@/features/batch/types";

const { Title } = Typography;

function BatchExecutionsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Number(searchParams.get("page") ?? "1");
  const size = Number(searchParams.get("size") ?? "20");
  const jobName = searchParams.get("jobName") || undefined;
  const status = (searchParams.get("status") as BatchExecutionStatus) || undefined;
  const exitCode = (searchParams.get("exitCode") as BatchExitCode) || undefined;
  const targetDateFrom = searchParams.get("targetDateFrom") || undefined;
  const targetDateTo = searchParams.get("targetDateTo") || undefined;

  const { data, isLoading, isFetching, refetch } = useBatchExecutions({
    page,
    size,
    jobName,
    status,
    exitCode,
    targetDateFrom,
    targetDateTo,
  });
  const { data: jobsData } = useBatchJobs();

  function handlePageChange(p: number, s: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    params.set("size", String(s));
    router.push(`?${params.toString()}`);
  }

  // 필터가 바뀌면 현재 페이지의 조건이 사라지므로 항상 1페이지로 되돌린다.
  function applyFilters(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  }

  function handleFilterChange(key: string, value: string | undefined) {
    applyFilters({ [key]: value });
  }

  function handleTargetDateRangeChange(from: string | undefined, to: string | undefined) {
    applyFilters({ targetDateFrom: from, targetDateTo: to });
  }

  return (
    <Card
      title={<Title level={4} style={{ margin: 0 }}>배치 실행 이력</Title>}
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
            새로고침
          </Button>
          <Button type="primary" onClick={() => router.push("/batch/schedules")}>
            실행 시간 설정
          </Button>
        </Space>
      }
    >
      <BatchExecutionTable
        data={data?.executions ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
        filters={{ jobName, status, exitCode, targetDateFrom, targetDateTo }}
        onFilterChange={handleFilterChange}
        onTargetDateRangeChange={handleTargetDateRangeChange}
        jobNames={jobsData?.jobNames ?? []}
      />
    </Card>
  );
}

export default function BatchExecutionsPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}>
      <BatchExecutionsPageContent />
    </Suspense>
  );
}
