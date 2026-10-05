"use client";

import { FilterSection } from "@/components/FilterSection";
import { useListSort } from "@/lib/navigation/useListSort";
import { FilterActions } from "@/components/FilterActions";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Form, Space, Spin, DatePicker } from "antd";
import { PageHeader } from "@/components/PageHeader";
import { commitDateInput } from "@/components/date-input";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { UserLookupSelect } from "@/components/EntityLookupSelect";
import { FilterSummary } from "@/components/FilterSummary";
import { TenantSearchFields } from "@/features/tenants/components/TenantSearchFields";
import { CONTRACT_STATUS_OPTIONS, CONTRACT_TYPE_OPTIONS, readTenantFilters, TENANT_FILTER_KEYS } from "@/features/tenants/listFilters";
import { optionalDate, optionalPositiveInteger, positiveInteger } from "@/lib/navigation/listParams";
import { useTenants } from "@/features/tenants/hooks";
import { TenantTable } from "@/features/tenants/components/TenantTable";
import dayjs, { type Dayjs } from "dayjs";

function TenantsPageContent() {
  const [filterForm] = Form.useForm();
  const selectedUserId = Form.useWatch<number | undefined>("userId", filterForm);
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = positiveInteger(searchParams.get("page"), 1, 1_000_000);
  const size = positiveInteger(searchParams.get("size"), 20, 100);
  const userId = optionalPositiveInteger(searchParams.get("userId"));
  const { keyword, tenantId, propertyId, contractType, contractStatus, notifyEnabled } = readTenantFilters(searchParams);
  const startDate = optionalDate(searchParams.get("startDate"));
  const endDate = optionalDate(searchParams.get("endDate"));
  const sort = useListSort({ fields: [{ value: "tenantId", label: "임차인 번호" }, { value: "createdAt", label: "등록일" }], defaultField: "tenantId", navigation: { query: searchParams.toString(), update: navigate } });
  const { data, isLoading, error, isFetching, refetch } = useTenants({ page, size, userId, keyword, tenantId, propertyId, contractType, contractStatus, notifyEnabled, startDate, endDate, ...sort.requestParams });
  useEffect(() => { filterForm.setFieldsValue({ userId, keyword, tenantId, propertyId, contractType, contractStatus, notifyEnabled, startDate: startDate ? dayjs(startDate) : undefined, endDate: endDate ? dayjs(endDate) : undefined }); }, [filterForm, userId, keyword, tenantId, propertyId, contractType, contractStatus, notifyEnabled, startDate, endDate]);


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
    for (const key of ["userId", ...TENANT_FILTER_KEYS, "startDate", "endDate"]) {
      const value = values[key];
      changes[key] = value && typeof value === "object" && "format" in value ? value.format("YYYY-MM-DD") : value === undefined || value === null || value === "" ? undefined : String(value).trim() || undefined;
    }
    navigate(changes);
  }
  function removeFilter(label: string) { const key = ({"검색": "keyword", "임차인": "tenantId", "건물": "propertyId", "임대인": "userId", "계약 유형": "contractType", "계약 상태": "contractStatus", "알림": "notifyEnabled", "계약 시작일": "startDate", "계약 종료일": "endDate"} as Record<string, string>)[label]; filterForm.setFieldValue(key, undefined); navigate({ page: "1", [key]: undefined }); }
  function resetFilters() { filterForm.setFieldsValue(Object.fromEntries(["userId", ...TENANT_FILTER_KEYS, "startDate", "endDate"].map((key) => [key, undefined]))); applyFilters({}); }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="임차인 관리" description="이름·전화번호·호실로 전체 임차인을 검색하고 건물·계약 상태로 좁힙니다. 계약 날짜는 입력한 날짜와 정확히 일치하는 계약을 찾습니다." />
      <section aria-label="검색 조건과 조회 결과">
        <FilterSection><Form form={filterForm} name="tenants-filters" layout="vertical" className="admin-filter-bar" onFinish={applyFilters}
          onValuesChange={(changed) => { if (Object.hasOwn(changed, "userId")) filterForm.setFieldValue("propertyId", undefined); }}>
        <TenantSearchFields userId={selectedUserId}
          actions={<FilterActions><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={resetFilters}>필터 초기화</Button></Space></FilterActions>}
          additionalFilters={<>
            <Form.Item name="userId" label="임대인" className="admin-filter-field"><UserLookupSelect /></Form.Item>
            <Form.Item name="startDate" label="계약 시작일" className="admin-filter-field"><DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} onBlur={(event) => commitDateInput(event.target, ["YYYY-MM-DD"], filterForm.getFieldValue("startDate"), (date) => filterForm.setFieldValue("startDate", date))} /></Form.Item>
            <Form.Item name="endDate" label="계약 종료일" className="admin-filter-field"><DatePicker format="YYYY-MM-DD" style={{ width: "100%" }} onBlur={(event) => commitDateInput(event.target, ["YYYY-MM-DD"], filterForm.getFieldValue("endDate"), (date) => filterForm.setFieldValue("endDate", date))} /></Form.Item>
          </>}
        />
        </Form></FilterSection>
        <FilterSummary filters={[
          ...(keyword ? [{ label: "검색", value: keyword }] : []), ...(tenantId ? [{ label: "임차인", value: `#${tenantId}` }] : []), ...(propertyId ? [{ label: "건물", value: `#${propertyId}` }] : []), ...(userId ? [{ label: "임대인", value: `#${userId}` }] : []),
          ...(contractType ? [{ label: "계약 유형", value: CONTRACT_TYPE_OPTIONS.find((item) => item.value === contractType)?.label }] : []), ...(contractStatus ? [{ label: "계약 상태", value: CONTRACT_STATUS_OPTIONS.find((item) => item.value === contractStatus)?.label }] : []),
          ...(notifyEnabled !== undefined ? [{ label: "알림", value: notifyEnabled ? "활성" : "비활성" }] : []), ...(startDate ? [{ label: "계약 시작일", value: startDate }] : []), ...(endDate ? [{ label: "계약 종료일", value: endDate }] : []),
        ].map((filter) => ({ ...filter, onRemove: () => removeFilter(filter.label) }))} onReset={resetFilters} />
        <QueryErrorAlert error={error} title="임차인 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
        {(!error || data) && <TenantTable
          sortControl={sort.control}
          data={data?.tenants ?? []} loading={isLoading} page={page} pageSize={size}
          total={data?.totalElements ?? 0} filters={{ userId, notifyEnabled, startDate, endDate }}
          onPageChange={(nextPage, nextSize) => navigate({ page: String(nextSize !== size ? 1 : nextPage), size: String(nextSize) })}
          onFilterChange={(key, value) => navigate({ page: "1", [key]: value === undefined ? undefined : String(value) })}
          returnPath={`/tenants?${searchParams.toString()}`}
        />}
      </section>
    </Space>
  );
}

export default function TenantsPage() {
  return <Suspense fallback={<Spin size="large" aria-label="목록을 불러오는 중" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}><TenantsPageContent /></Suspense>;
}
