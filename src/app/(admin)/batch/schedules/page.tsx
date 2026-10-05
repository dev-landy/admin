"use client";

import { useListSort } from "@/lib/navigation/useListSort";
import { sortRecords } from "@/lib/table/sort-records";

import { RefreshButton } from "@/components/RefreshButton";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { Button, Card, Form, Input, Select, Spin } from "antd";

import { useRouter, useSearchParams } from "next/navigation";
import { positiveInteger } from "@/lib/navigation/listParams";
import { FilterSummary } from "@/components/FilterSummary";
import { OperationalNotice } from "@/components/OperationalNotice";
import { FilterSection } from "@/components/FilterSection";
import { FilterActions } from "@/components/FilterActions";
import { PageHeader } from "@/components/PageHeader";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";

import { BatchScheduleTable } from "@/features/batch/components/BatchScheduleTable";
import { useBatchSchedules } from "@/features/batch/hooks";

function BatchSchedulesPageContent() {
  const { data, isLoading, error, isFetching, refetch } = useBatchSchedules();
  const [filterForm] = Form.useForm();
  const searchParams = useSearchParams();
  const router = useRouter();
  const keyword = searchParams.get("keyword")?.trim() || undefined;
  const enabled = ["true", "false"].includes(searchParams.get("enabled") ?? "") ? searchParams.get("enabled")! : undefined;
  const page = positiveInteger(searchParams.get("page"), 1);
  const size = positiveInteger(searchParams.get("size"), 20, 100);
  useEffect(() => { filterForm.setFieldsValue({ keyword, enabled }); }, [filterForm, keyword, enabled]);
  function updateQuery(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) { if (value === undefined) params.delete(key); else params.set(key, value); }
    router.push(`?${params.toString()}`);
  }
  const sort = useListSort({ fields: [{ value: "jobName", label: "작업명" }, { value: "nextExecutionAt", label: "다음 실행" }, { value: "updatedAt", label: "수정 시각" }, { value: "key", label: "작업 키" }], defaultField: "key", defaultDirection: "asc", navigation: { query: searchParams.toString(), update: updateQuery } });
  const filteredSchedules = (data?.schedules ?? []).filter((schedule) =>
    [schedule.jobName, schedule.label].some((value) => value.toLocaleLowerCase().includes((keyword ?? "").toLocaleLowerCase()))
    && (enabled === undefined || schedule.enabled === (enabled === "true")),
  );
  const schedules = sort.requestParams.sort ? sortRecords(filteredSchedules, sort.field, sort.direction, "key") : filteredSchedules;

  return (
    <>
    <PageHeader title="배치 설정" description="반복 작업의 실행 시간과 활성 상태를 관리합니다."
      extra={<div className="admin-actions"><Link href="/batch">실행 이력 보기</Link>
        <RefreshButton loading={isFetching} onClick={() => refetch()}>
          새로고침
        </RefreshButton></div>
      }
    />
    <Card>
      <OperationalNotice title="실행 시각은 한국 시간입니다">변경 사항은 저장 후 각 서버가 기본 1분 주기로 조회해 반영합니다. 동기화가 지연되면 반영도 늦어질 수 있으며, 비활성화해도 이미 실행 중인 작업은 중단되지 않습니다. 납부일 알림톡의 발송 마감은 스케줄을 바꿔도 08:55입니다. 일일 발송 점검은 미해결 건을 보고하며 자동으로 재발송하지 않습니다.</OperationalNotice>
      <QueryErrorAlert error={error} title="배치 설정을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      <FilterSection><Form form={filterForm} name="batch-schedule-filters" layout="vertical" className="admin-filter-bar" initialValues={{ keyword, enabled }}
        onFinish={(values: { keyword?: string; enabled?: string }) => updateQuery({ keyword: values.keyword?.trim() || undefined, enabled: values.enabled, page: "1" })}>
        <Form.Item name="keyword" label="작업 검색" className="admin-filter-keyword"><Input allowClear placeholder="작업명·설명 검색" /></Form.Item>
        <Form.Item name="enabled" label="활성 상태"><Select allowClear placeholder="전체" options={[{ label: "활성", value: "true" }, { label: "비활성", value: "false" }]} /></Form.Item>
        <FilterActions><div className="admin-actions"><Button type="primary" htmlType="submit">조회</Button><Button onClick={() => { filterForm.setFieldsValue({ keyword: undefined, enabled: undefined }); updateQuery({ keyword: undefined, enabled: undefined, page: "1" }); }}>초기화</Button></div></FilterActions>
      </Form></FilterSection>
      <FilterSummary filters={[...(keyword ? [{ label: "작업 검색", value: keyword }] : []), ...(enabled ? [{ label: "활성 상태", value: enabled === "true" ? "활성" : "비활성" }] : [])]} onReset={() => { filterForm.setFieldsValue({ keyword: undefined, enabled: undefined }); updateQuery({ keyword: undefined, enabled: undefined, page: "1" }); }} />
      {(!error || data) && <BatchScheduleTable sortControl={sort.control} data={schedules} loading={isLoading} disabled={isFetching || !!error} page={page} pageSize={size} onPageChange={(nextPage, nextSize) => updateQuery({ page: String(nextPage), size: String(nextSize) })} />}
    </Card>
    </>
  );
}

export default function BatchSchedulesPage() {
  return <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}><BatchSchedulesPageContent /></Suspense>;
}
