"use client";

import { useListSort } from "@/lib/navigation/useListSort";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Form, Space, Spin } from "antd";

import { PageHeader } from "@/components/PageHeader";
import { ClientLinkButton } from "@/components/ClientLinkButton";
import { optionalPositiveInteger, positiveInteger } from "@/lib/navigation/listParams";
import { detailReturnPath, relatedListPath } from "@/lib/navigation/listReturn";
import { TenantLookupSelect } from "@/components/EntityLookupSelect";
import { FilterSummary } from "@/components/FilterSummary";
import { FilterSection } from "@/components/FilterSection";
import { FilterActions } from "@/components/FilterActions";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";

import { useDuplicates } from "@/features/payments/hooks";
import { DuplicateTable } from "@/features/payments/components/DuplicateTable";

function DuplicatesPageContent() {
  const [filterForm] = Form.useForm();
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = positiveInteger(searchParams.get("page"), 1);
  const size = positiveInteger(searchParams.get("size"), 20, 100);
  const tenantId = optionalPositiveInteger(searchParams.get("tenantId"));
  const returnPath = searchParams.has("returnTo") ? detailReturnPath(searchParams.get("returnTo"), "/tenants") : undefined;

  function updateSort(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) { if (value === undefined) params.delete(key); else params.set(key, value); }
    router.push(`?${params.toString()}`);
  }
  const sort = useListSort({ fields: [{ value: "billingMonth", label: "청구월" }, { value: "tenantId", label: "임차인 ID" }], defaultField: "billingMonth", defaultDirection: "desc", navigation: { query: searchParams.toString(), update: updateSort } });
  const { data, isLoading, error, isFetching, refetch } = useDuplicates({ page, size, ...sort.requestParams, tenantId });
  useEffect(() => { filterForm.setFieldValue("tenantId", tenantId); }, [filterForm, tenantId]);

  function handlePageChange(p: number, s: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(s === size ? p : 1));
    params.set("size", String(s));
    router.push(`?${params.toString()}`);
  }
  function applyFilters(values: { tenantId?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (values.tenantId) params.set("tenantId", String(values.tenantId)); else params.delete("tenantId");
    router.push(`?${params}`);
  }
  function resetFilters() { filterForm.setFieldValue("tenantId", undefined); applyFilters({}); }
  useEffect(() => {
    if (!data || error || isFetching) return;
    const lastPage = Math.max(1, Math.ceil(data.totalElements / size));
    if (page <= lastPage) return;
    const params = new URLSearchParams(searchParams.toString()); params.set("page", String(lastPage)); router.replace(`?${params}`);
  }, [data, error, isFetching, page, router, searchParams, size]);

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="납부 중복 탐지" description="동일 임차인·청구월에 여러 납부가 등록된 내역입니다. 해당 청구월의 납부 내역을 바로 확인할 수 있습니다." extra={<Space wrap>{returnPath && <ClientLinkButton href={returnPath}>이전 화면</ClientLinkButton>}<ClientLinkButton href={relatedListPath("/payments", { tenantId })}>납부 목록</ClientLinkButton></Space>} />
    <section aria-label="검색 조건과 조회 결과">
      <FilterSection><Form form={filterForm} name="duplicates-filters" layout="vertical" className="admin-filter-bar" onFinish={applyFilters}>
        <Form.Item name="tenantId" label="임차인" className="admin-filter-field"><TenantLookupSelect /></Form.Item>
        <FilterActions><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={resetFilters}>필터 초기화</Button></Space></FilterActions>
      </Form></FilterSection>
      <FilterSummary filters={tenantId ? [{ label: "임차인", value: `#${tenantId}`, onRemove: resetFilters }] : []} onReset={resetFilters} />
      <QueryErrorAlert error={error} title="중복 납부 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {(!error || data) && <DuplicateTable sortControl={sort.control}
        data={data?.duplicates ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
        returnPath={`/payments/duplicates?${searchParams}`}
      />}
    </section>
    </Space>
  );
}

export default function DuplicatesPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}>
      <DuplicatesPageContent />
    </Suspense>
  );
}
