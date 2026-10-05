"use client";

import { useListSort } from "@/lib/navigation/useListSort";

import { FilterMore } from "@/components/FilterMore";
import { FilterSection } from "@/components/FilterSection";
import { FilterActions } from "@/components/FilterActions";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Form, Space, Spin, DatePicker, InputNumber, Select } from "antd";
import { PageHeader } from "@/components/PageHeader";
import { ClientLinkButton } from "@/components/ClientLinkButton";
import { commitDateInput } from "@/components/date-input";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { UserLookupSelect, TenantLookupSelect } from "@/components/EntityLookupSelect";
import { FilterSummary } from "@/components/FilterSummary";
import { PropertyLookupSelect } from "@/features/properties/components/PropertyLookupSelect";
import { detailReturnPath, relatedListPath } from "@/lib/navigation/listReturn";
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
  const paymentId = optionalPositiveInteger(searchParams.get("paymentId"));
  const propertyId = optionalPositiveInteger(searchParams.get("propertyId"));
  const paidFrom = optionalDate(searchParams.get("paidFrom"));
  const paidTo = optionalDate(searchParams.get("paidTo"));
  const draftUserId = Form.useWatch("userId", filterForm) as number | undefined;
  const draftPropertyId = Form.useWatch("propertyId", filterForm) as number | undefined;
  const returnPath = searchParams.has("returnTo") ? detailReturnPath(searchParams.get("returnTo"), "/tenants") : undefined;
  const currentPath = `/payments?${searchParams}`;
  const sort = useListSort({ fields: [{ value: "paymentId", label: "납부 ID" }, { value: "billingMonth", label: "청구월" }, { value: "paidAt", label: "실제 납부일" }, { value: "updatedAt", label: "수정 시각" }], defaultField: "paymentId", defaultDirection: "desc", navigation: { query: searchParams.toString(), update: navigate } });
  const { data, isLoading, error, isFetching, refetch } = usePayments({ page, size, ...sort.requestParams, source, from, to, userId, tenantId, paymentId, propertyId, paidFrom, paidTo });
  useEffect(() => { filterForm.setFieldsValue({ source, from: from ? dayjs(from) : undefined, to: to ? dayjs(to) : undefined, userId, tenantId, paymentId, propertyId, paidFrom: paidFrom ? dayjs(paidFrom) : undefined, paidTo: paidTo ? dayjs(paidTo) : undefined }); }, [filterForm, source, from, to, userId, tenantId, paymentId, propertyId, paidFrom, paidTo]);


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
    for (const key of ["source", "from", "to", "userId", "tenantId", "paymentId", "propertyId", "paidFrom", "paidTo"]) {
      const value = values[key];
      changes[key] = value && typeof value === "object" && "format" in value ? (key === "from" || key === "to" ? value.startOf("month") : value).format("YYYY-MM-DD") : value === undefined || value === null || value === "" ? undefined : String(value).trim() || undefined;
    }
    navigate(changes);
  }
  function removeFilter(label: string) { const key = ({"납부 ID": "paymentId", "임대인": "userId", "임차인": "tenantId", "건물": "propertyId", "청구월 시작": "from", "청구월 종료": "to", "납부일 시작": "paidFrom", "납부일 종료": "paidTo", "납부 출처": "source"} as Record<string, string>)[label]; filterForm.setFieldValue(key, undefined); navigate({ page: "1", [key]: undefined }); }
  function resetFilters() { filterForm.setFieldsValue(Object.fromEntries(["source", "from", "to", "userId", "tenantId", "paymentId", "propertyId", "paidFrom", "paidTo"].map((key) => [key, undefined]))); applyFilters({}); }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="납부 목록" description="청구월과 실제 납부일을 각각 지정해 내역을 찾습니다. 두 기간의 시작과 종료를 모두 포함합니다." extra={<Space wrap>{returnPath && <ClientLinkButton href={returnPath}>이전 화면</ClientLinkButton>}<ClientLinkButton href={relatedListPath("/payments/duplicates", { tenantId }, currentPath)}>중복 납부 확인</ClientLinkButton></Space>} />
      <section aria-label="검색 조건과 조회 결과">
        <FilterSection><Form form={filterForm} name="payments-filters" layout="vertical" className="admin-filter-bar" onFinish={applyFilters} onValuesChange={(changed) => {
          if ("userId" in changed) filterForm.setFieldsValue({ propertyId: undefined, tenantId: undefined });
          else if ("propertyId" in changed) filterForm.setFieldValue("tenantId", undefined);
        }}>
        <Form.Item name="tenantId" label="임차인" className="admin-filter-field"><TenantLookupSelect userId={draftUserId} propertyId={draftPropertyId} /></Form.Item>
        <Form.Item name="from" label="청구월 시작" className="admin-filter-field"><DatePicker picker="month" format="YYYY-MM" style={{ width: "100%" }} onBlur={(event) => commitDateInput(event.target, ["YYYY-MM"], filterForm.getFieldValue("from"), (date) => filterForm.setFieldValue("from", date))} /></Form.Item>
        <Form.Item name="to" label="청구월 종료" className="admin-filter-field" dependencies={["from"]} rules={[({ getFieldValue }) => ({ validator(_rule, value?: Dayjs) { const start = getFieldValue("from") as Dayjs | undefined; return !start || !value || !value.isBefore(start, "month") ? Promise.resolve() : Promise.reject(new Error("시작월보다 이전일 수 없습니다.")); } })]}><DatePicker picker="month" format="YYYY-MM" style={{ width: "100%" }} onBlur={(event) => commitDateInput(event.target, ["YYYY-MM"], filterForm.getFieldValue("to"), (date) => filterForm.setFieldValue("to", date))} /></Form.Item>
        <FilterActions><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={resetFilters}>필터 초기화</Button></Space></FilterActions>
        <FilterMore>
        <Form.Item name="userId" label="임대인" className="admin-filter-field"><UserLookupSelect /></Form.Item>
        <Form.Item name="propertyId" label="건물" className="admin-filter-field"><PropertyLookupSelect userId={draftUserId} /></Form.Item>
        <Form.Item name="source" label="납부 출처" className="admin-filter-field"><Select allowClear placeholder="전체" options={PAYMENT_SOURCE_OPTIONS} /></Form.Item>
        <Form.Item name="paymentId" label="납부 ID" className="admin-id-input"><InputNumber min={1} precision={0} placeholder="정확한 ID" style={{ width: "100%" }} /></Form.Item>
        <Form.Item name="paidFrom" label="납부일 시작" className="admin-filter-field"><DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} onBlur={(event) => commitDateInput(event.target, ["YYYY-MM-DD"], filterForm.getFieldValue("paidFrom"), (date) => filterForm.setFieldValue("paidFrom", date))} /></Form.Item>
        <Form.Item name="paidTo" label="납부일 종료" className="admin-filter-field" dependencies={["paidFrom"]} rules={[({ getFieldValue }) => ({ validator(_rule, value?: Dayjs) { const start = getFieldValue("paidFrom") as Dayjs | undefined; return !start || !value || !value.isBefore(start, "day") ? Promise.resolve() : Promise.reject(new Error("시작일보다 이전일 수 없습니다.")); } })]}><DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} onBlur={(event) => commitDateInput(event.target, ["YYYY-MM-DD"], filterForm.getFieldValue("paidTo"), (date) => filterForm.setFieldValue("paidTo", date))} /></Form.Item>
        </FilterMore>
        </Form></FilterSection>
        <FilterSummary filters={[
          ...([['납부 ID', paymentId], ['임대인', userId], ['임차인', tenantId], ['건물', propertyId], ['청구월 시작', from?.slice(0, 7)], ['청구월 종료', to?.slice(0, 7)], ['납부일 시작', paidFrom], ['납부일 종료', paidTo]] as const).flatMap(([label, value]) => value ? [{ label, value: typeof value === "number" ? `#${value}` : value }] : []),
          ...(source ? [{ label: "납부 출처", value: PAYMENT_SOURCE_OPTIONS.find((item) => item.value === source)?.label }] : []),
        ].map((filter) => ({ ...filter, onRemove: () => removeFilter(filter.label) }))} onReset={resetFilters} />
        <QueryErrorAlert error={error} title="납부 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
        {(!error || data) && <PaymentTable sortControl={sort.control}
          data={data?.payments ?? []} loading={isLoading} page={page} pageSize={size}
          total={data?.totalElements ?? 0} filters={{ source, userId, tenantId }}
          onPageChange={(nextPage, nextSize) => navigate({ page: String(nextSize !== size ? 1 : nextPage), size: String(nextSize) })}
          onFilterChange={(key, value) => navigate({ page: "1", [key]: value === undefined ? undefined : String(value) })}
          returnPath={currentPath}
        />}
      </section>
    </Space>
  );
}

export default function PaymentsPage() {
  return <Suspense fallback={<Spin size="large" aria-label="목록을 불러오는 중" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}><PaymentsPageContent /></Suspense>;
}
