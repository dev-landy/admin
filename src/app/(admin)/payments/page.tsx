"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Card, Form, Space, Spin, DatePicker, InputNumber, Select } from "antd";
import { PageHeader } from "@/components/PageHeader";
import { commitDateInput } from "@/components/date-input";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { optionalDate, optionalPositiveInteger, positiveInteger } from "@/lib/navigation/listParams";
import { usePayments } from "@/features/payments/hooks";
import { PaymentTable } from "@/features/payments/components/PaymentTable";
import dayjs, { type Dayjs } from "dayjs";
import { PAYMENT_SOURCE_OPTIONS } from "@/features/payments/paymentSource";

function PaymentsPageContent() {
  const [filterForm] = Form.useForm();
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = positiveInteger(searchParams.get("page"), 1, 1_000_000);
  const size = positiveInteger(searchParams.get("size"), 20, 100);
  const sourceRaw = searchParams.get("source");
  const source = sourceRaw === "MANUAL" || sourceRaw === "BANK_AUTO" || sourceRaw === "INITIALIZED" ? sourceRaw : undefined;
  const fromDate = optionalDate(searchParams.get("from"));
  const toDate = optionalDate(searchParams.get("to"));
  const from = fromDate ? dayjs(fromDate).startOf("month").format("YYYY-MM-DD") : undefined;
  const to = toDate ? dayjs(toDate).startOf("month").format("YYYY-MM-DD") : undefined;
  const userId = optionalPositiveInteger(searchParams.get("userId"));
  const tenantId = optionalPositiveInteger(searchParams.get("tenantId"));
  const { data, isLoading, error, isFetching, refetch } = usePayments({ page, size, source, from, to, userId, tenantId });
  useEffect(() => { filterForm.setFieldsValue({ source, from: from ? dayjs(from) : undefined, to: to ? dayjs(to) : undefined, userId, tenantId }); }, [filterForm, source, from, to, userId, tenantId]);


  function navigate(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("sort");
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
    for (const key of ["source", "from", "to", "userId", "tenantId"]) {
      const value = values[key];
      changes[key] = value && typeof value === "object" && "format" in value ? value.startOf("month").format("YYYY-MM-DD") : value === undefined || value === null || value === "" ? undefined : String(value).trim() || undefined;
    }
    navigate(changes);
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="납부 목록" description="청구월·출처·임차인 조건으로 납부 내역을 확인합니다. 기간은 납부일이 아닌 청구월을 기준으로 적용합니다." extra={<Button href="/payments/duplicates">중복 납부 확인</Button>} />
      <Card>
        <Form form={filterForm} name="payments-filters" layout="vertical" className="admin-filter-bar" onFinish={applyFilters}>
        <Form.Item name="source" label="납부 출처" className="admin-filter-field"><Select allowClear placeholder="전체" options={PAYMENT_SOURCE_OPTIONS} /></Form.Item>
        <Form.Item name="userId" label="유저 ID" className="admin-id-input"><InputNumber min={1} precision={0} placeholder="전체" style={{ width: "100%" }} /></Form.Item>
        <Form.Item name="tenantId" label="임차인 ID" className="admin-id-input"><InputNumber min={1} precision={0} placeholder="전체" style={{ width: "100%" }} /></Form.Item>
        <Form.Item name="from" label="청구월 시작" className="admin-filter-field"><DatePicker picker="month" format="YYYY-MM" style={{ width: "100%" }} onBlur={(event) => commitDateInput(event.target, ["YYYY-MM"], filterForm.getFieldValue("from"), (date) => filterForm.setFieldValue("from", date))} /></Form.Item>
        <Form.Item name="to" label="청구월 종료" className="admin-filter-field" dependencies={["from"]} rules={[({ getFieldValue }) => ({ validator(_rule, value?: Dayjs) { const start = getFieldValue("from") as Dayjs | undefined; return !start || !value || !value.isBefore(start, "month") ? Promise.resolve() : Promise.reject(new Error("시작월보다 이전일 수 없습니다.")); } })]}><DatePicker picker="month" format="YYYY-MM" style={{ width: "100%" }} onBlur={(event) => commitDateInput(event.target, ["YYYY-MM"], filterForm.getFieldValue("to"), (date) => filterForm.setFieldValue("to", date))} /></Form.Item>
          <Form.Item label=" "><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={() => { filterForm.setFieldsValue({ source: undefined, from: undefined, to: undefined, userId: undefined, tenantId: undefined }); applyFilters({}); }}>필터 초기화</Button></Space></Form.Item>
        </Form>
        <QueryErrorAlert error={error} title="납부 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
        {(!error || data) && <PaymentTable
          data={data?.payments ?? []} loading={isLoading} page={page} pageSize={size}
          total={data?.totalElements ?? 0} filters={{ source, userId, tenantId }}
          onPageChange={(nextPage, nextSize) => navigate({ page: String(nextSize !== size ? 1 : nextPage), size: String(nextSize) })}
          onFilterChange={(key, value) => navigate({ page: "1", [key]: value === undefined ? undefined : String(value) })}

        />}
      </Card>
    </Space>
  );
}

export default function PaymentsPage() {
  return <Suspense fallback={<Spin size="large" aria-label="목록을 불러오는 중" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}><PaymentsPageContent /></Suspense>;
}
