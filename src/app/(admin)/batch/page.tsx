"use client";

import { useListSort } from "@/lib/navigation/useListSort";

import { RefreshButton } from "@/components/RefreshButton";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { Button, Card, DatePicker, Form, InputNumber, Select, Spin } from "antd";

import { PageHeader } from "@/components/PageHeader";
import { FilterDateRange } from "@/components/FilterDateRange";
import { FilterQuickViews } from "@/components/FilterQuickViews";
import { FilterMore } from "@/components/FilterMore";
import { FilterSection } from "@/components/FilterSection";
import { FilterActions } from "@/components/FilterActions";
import { FilterSummary } from "@/components/FilterSummary";
import { commitDateRangeInput } from "@/components/date-input";
import { BATCH_EXECUTION_STATUS_OPTIONS, BATCH_EXIT_CODE_OPTIONS } from "@/features/batch/executionStatus";
import { positiveInteger, optionalPositiveInteger, optionalDate } from "@/lib/navigation/listParams";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";

import { BatchExecutionTable } from "@/features/batch/components/BatchExecutionTable";
import { useBatchExecutions, useBatchJobs } from "@/features/batch/hooks";

function BatchExecutionsPageContent() {
  const [filterForm] = Form.useForm();
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = positiveInteger(searchParams.get("page"), 1);
  const size = positiveInteger(searchParams.get("size"), 20, 100);
  const jobName = searchParams.get("jobName") || undefined;
  const status = BATCH_EXECUTION_STATUS_OPTIONS.find((option) => option.value === searchParams.get("status"))?.value;
  const exitCode = BATCH_EXIT_CODE_OPTIONS.find((option) => option.value === searchParams.get("exitCode"))?.value;
  const targetDateFrom = optionalDate(searchParams.get("targetDateFrom"));
  const targetDateTo = optionalDate(searchParams.get("targetDateTo"));

  const executionId = optionalPositiveInteger(searchParams.get("executionId"));
  const startedFrom = optionalDate(searchParams.get("startedFrom"));
  const startedTo = optionalDate(searchParams.get("startedTo"));

  const sort = useListSort({ fields: [{ value: "executionId", label: "실행 ID" }, { value: "startTime", label: "시작 시각" }], defaultField: "executionId", defaultDirection: "desc", navigation: { query: searchParams.toString(), update: applyFilters } });
  const { data, isLoading, error, isFetching, refetch } = useBatchExecutions({
    ...sort.requestParams,
    page,
    size,
    jobName,
    status,
    exitCode,
    targetDateFrom,
    targetDateTo, executionId, startedFrom, startedTo,
  });
  useEffect(() => {
    filterForm.setFieldsValue({ jobName, status, exitCode, executionId, startedRange: startedFrom || startedTo ? [startedFrom ? dayjs(startedFrom) : null, startedTo ? dayjs(startedTo) : null] : undefined, dateRange: targetDateFrom || targetDateTo ? [targetDateFrom ? dayjs(targetDateFrom) : null, targetDateTo ? dayjs(targetDateTo) : null] : undefined });
  }, [filterForm, jobName, status, exitCode, targetDateFrom, targetDateTo, executionId, startedFrom, startedTo]);

  const jobsQuery = useBatchJobs();
  const jobsData = jobsQuery.data;

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

  function resetFilters() {
    filterForm.resetFields();
    filterForm.setFieldsValue({ jobName: undefined, status: undefined, exitCode: undefined, executionId: undefined, startedRange: undefined, dateRange: undefined });
    applyFilters({ jobName: undefined, status: undefined, exitCode: undefined, targetDateFrom: undefined, targetDateTo: undefined, executionId: undefined, startedFrom: undefined, startedTo: undefined });
  }

  return (
    <>
    <PageHeader title="배치 실행 이력" description="작업별 실행 결과, 처리 시간, 종료 메시지를 확인합니다."
      extra={<div className="admin-actions"><Link href="/batch/schedules">배치 설정 보기</Link>
        <RefreshButton loading={isFetching} onClick={() => refetch()}>
          새로고침
        </RefreshButton></div>
      }
    />
    <Card>
      <FilterQuickViews views={[
        { label: "실패", active: status === "FAILED", onClick: () => applyFilters({ status: status === "FAILED" ? undefined : "FAILED" }) },
        { label: "진행 중", active: status === "STARTED", onClick: () => applyFilters({ status: status === "STARTED" ? undefined : "STARTED" }) },
      ]} />
      <FilterSection><Form form={filterForm} name="batch-execution-filters" layout="vertical" className="admin-filter-bar"
        initialValues={{ jobName, status, exitCode, dateRange: targetDateFrom || targetDateTo ? [targetDateFrom ? dayjs(targetDateFrom) : null, targetDateTo ? dayjs(targetDateTo) : null] : undefined }}
        onFinish={(values: { jobName?: string; status?: string; exitCode?: string; dateRange?: [Dayjs | null, Dayjs | null]; startedRange?: [Dayjs | null, Dayjs | null]; executionId?: number }) => applyFilters({ jobName: values.jobName, status: values.status, exitCode: values.exitCode, targetDateFrom: values.dateRange?.[0]?.format("YYYY-MM-DD"), targetDateTo: values.dateRange?.[1]?.format("YYYY-MM-DD"), executionId: values.executionId ? String(values.executionId) : undefined, startedFrom: values.startedRange?.[0]?.format("YYYY-MM-DD"), startedTo: values.startedRange?.[1]?.format("YYYY-MM-DD") })}>
        <Form.Item name="jobName" label="배치 작업"><Select className="admin-filter-field" allowClear placeholder="전체 작업" showSearch={{ optionFilterProp: "label" }} options={(jobsData?.jobNames ?? []).map((name) => ({ label: name, value: name }))} /></Form.Item>
        <Form.Item name="status" label="실행 상태"><Select className="admin-filter-field" allowClear placeholder="전체 상태" options={BATCH_EXECUTION_STATUS_OPTIONS} /></Form.Item>
        <FilterActions><div className="admin-actions"><Button type="primary" htmlType="submit">조회</Button><Button onClick={resetFilters}>초기화</Button></div></FilterActions>
        <FilterMore>
        <Form.Item name="executionId" label="실행 ID"><InputNumber min={1} precision={0} /></Form.Item>
        <Form.Item name="startedRange" label="실제 실행일"><FilterDateRange form={filterForm} name="startedRange" /></Form.Item>
        <Form.Item name="exitCode" label="종료 코드"><Select className="admin-filter-field" allowClear placeholder="전체 코드" options={BATCH_EXIT_CODE_OPTIONS} popupMatchSelectWidth={false} /></Form.Item>
        <Form.Item name="dateRange" label="대상 날짜"><DatePicker.RangePicker
          allowEmpty={[true, true]}
          style={{ maxWidth: "100%" }}
          onBlur={(event, info) => commitDateRangeInput(
            event.target,
            info.range,
            filterForm.getFieldValue("dateRange"),
            (dates) => filterForm.setFieldValue("dateRange", dates),
          )}
        /></Form.Item>
        </FilterMore>

      </Form></FilterSection>
      <FilterSummary filters={[
        ...(executionId ? [{ label: "실행 ID", value: executionId, onRemove: () => applyFilters({ executionId: undefined }) }] : []),
        ...(startedFrom || startedTo ? [{ label: "실제 실행일", value: [startedFrom ?? "제한 없음", startedTo ?? "제한 없음"].join(" ~ "), onRemove: () => applyFilters({ startedFrom: undefined, startedTo: undefined }) }] : []),
        ...(jobName ? [{ label: "작업", value: jobName }] : []),
        ...(status ? [{ label: "상태", value: BATCH_EXECUTION_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status }] : []),
        ...(exitCode ? [{ label: "종료 코드", value: BATCH_EXIT_CODE_OPTIONS.find((option) => option.value === exitCode)?.label ?? exitCode }] : []),
        ...(targetDateFrom || targetDateTo ? [{ label: "대상 날짜", value: `${targetDateFrom ?? "제한 없음"} ~ ${targetDateTo ?? "제한 없음"}` }] : []),
      ]} onReset={resetFilters} />
      <QueryErrorAlert error={error} title="배치 실행 이력을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      <QueryErrorAlert error={jobsQuery.error} title="배치 작업 필터를 불러오지 못했습니다." onRetry={jobsQuery.refetch} isRetrying={jobsQuery.isFetching} hasData={jobsData !== undefined} />
      {(!error || data) && <BatchExecutionTable sortControl={sort.control}
        data={data?.executions ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
        filters={{ jobName, status, exitCode, targetDateFrom, targetDateTo, executionId, startedFrom, startedTo }}
        onFilterChange={handleFilterChange}
        onTargetDateRangeChange={handleTargetDateRangeChange}
        jobNames={jobsData?.jobNames ?? []}
      />}
    </Card>
    </>
  );
}

export default function BatchExecutionsPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}>
      <BatchExecutionsPageContent />
    </Suspense>
  );
}
