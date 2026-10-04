"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Card, Form, Space, Spin, DatePicker, InputNumber, Select } from "antd";
import { PageHeader } from "@/components/PageHeader";
import { commitDateInput } from "@/components/date-input";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { optionalDate, optionalPositiveInteger, positiveInteger } from "@/lib/navigation/listParams";
import { useTenants } from "@/features/tenants/hooks";
import { TenantTable } from "@/features/tenants/components/TenantTable";
import dayjs, { type Dayjs } from "dayjs";

function TenantsPageContent() {
  const [filterForm] = Form.useForm();
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = positiveInteger(searchParams.get("page"), 1, 1_000_000);
  const size = positiveInteger(searchParams.get("size"), 20, 100);
  const userId = optionalPositiveInteger(searchParams.get("userId"));
  const notifyEnabledRaw = searchParams.get("notifyEnabled");
  const notifyEnabled = notifyEnabledRaw === "true" ? true : notifyEnabledRaw === "false" ? false : undefined;
  const startDate = optionalDate(searchParams.get("startDate"));
  const endDate = optionalDate(searchParams.get("endDate"));
  const { data, isLoading, error, isFetching, refetch } = useTenants({ page, size, userId, notifyEnabled, startDate, endDate });
  useEffect(() => { filterForm.setFieldsValue({ userId, notifyEnabled, startDate: startDate ? dayjs(startDate) : undefined, endDate: endDate ? dayjs(endDate) : undefined }); }, [filterForm, userId, notifyEnabled, startDate, endDate]);


  function navigate(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  }

  useEffect(() => {
    if (!data || error || isFetching || typeof data.totalElements !== "number") return;
    const lastPage = Math.max(1, Math.ceil(data.totalElements / size));
    if (page > lastPage) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(lastPage));
      router.replace(`?${params.toString()}`);
    }
  }, [data, error, isFetching, page, router, searchParams, size]);

  function applyFilters(values: Record<string, string | number | boolean | Dayjs | undefined>) {
    const changes: Record<string, string | undefined> = { page: "1" };
    for (const key of ["userId", "notifyEnabled", "startDate", "endDate"]) {
      const value = values[key];
      changes[key] = value && typeof value === "object" && "format" in value ? value.format("YYYY-MM-DD") : value === undefined || value === null || value === "" ? undefined : String(value).trim() || undefined;
    }
    navigate(changes);
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="임차인 관리" description="임대인과 계약 날짜·알림 설정으로 임차인을 찾습니다." />
      <Card>
        <Form form={filterForm} name="tenants-filters" layout="vertical" className="admin-filter-bar" onFinish={applyFilters}>
        <Form.Item name="userId" label="유저 ID" className="admin-id-input"><InputNumber min={1} precision={0} placeholder="전체" style={{ width: "100%" }} /></Form.Item>
        <Form.Item name="notifyEnabled" label="알림" className="admin-filter-field"><Select allowClear placeholder="전체" options={[{ label: "활성", value: true }, { label: "비활성", value: false }]} /></Form.Item>
        <Form.Item name="startDate" label="계약 시작일" className="admin-filter-field"><DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} onBlur={(event) => commitDateInput(event.target, ["YYYY-MM-DD"], filterForm.getFieldValue("startDate"), (date) => filterForm.setFieldValue("startDate", date))} /></Form.Item>
        <Form.Item name="endDate" label="계약 종료일" className="admin-filter-field"><DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} onBlur={(event) => commitDateInput(event.target, ["YYYY-MM-DD"], filterForm.getFieldValue("endDate"), (date) => filterForm.setFieldValue("endDate", date))} /></Form.Item>
          <Form.Item label=" "><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={() => { filterForm.setFieldsValue({ userId: undefined, notifyEnabled: undefined, startDate: undefined, endDate: undefined }); applyFilters({}); }}>필터 초기화</Button></Space></Form.Item>
        </Form>
        <QueryErrorAlert error={error} title="임차인 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
        {(!error || data) && <TenantTable
          data={data?.tenants ?? []} loading={isLoading} page={page} pageSize={size}
          total={data?.totalElements ?? 0} filters={{ userId, notifyEnabled, startDate, endDate }}
          onPageChange={(nextPage, nextSize) => navigate({ page: String(nextSize !== size ? 1 : nextPage), size: String(nextSize) })}
          onFilterChange={(key, value) => navigate({ page: "1", [key]: value === undefined ? undefined : String(value) })}
          returnPath={`/tenants?${searchParams.toString()}`}
        />}
      </Card>
    </Space>
  );
}

export default function TenantsPage() {
  return <Suspense fallback={<Spin size="large" aria-label="목록을 불러오는 중" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}><TenantsPageContent /></Suspense>;
}
