"use client";

import { FilterMore } from "@/components/FilterMore";
import { FilterSection } from "@/components/FilterSection";
import { useListSort } from "@/lib/navigation/useListSort";
import { FilterActions } from "@/components/FilterActions";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Form, Space, Spin, Input, InputNumber } from "antd";
import { PageHeader } from "@/components/PageHeader";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { UserLookupSelect } from "@/components/EntityLookupSelect";
import { FilterSummary } from "@/components/FilterSummary";
import { ClientLinkButton } from "@/components/ClientLinkButton";
import { detailReturnPath } from "@/lib/navigation/listReturn";
import { optionalPositiveInteger, positiveInteger } from "@/lib/navigation/listParams";
import { useProperties } from "@/features/properties/hooks";
import { PropertyTable } from "@/features/properties/components/PropertyTable";


function PropertiesPageContent() {
  const [filterForm] = Form.useForm();
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = positiveInteger(searchParams.get("page"), 1, 1_000_000);
  const size = positiveInteger(searchParams.get("size"), 20, 100);
  const userId = optionalPositiveInteger(searchParams.get("userId"));
  const propertyId = optionalPositiveInteger(searchParams.get("propertyId"));
  const tenantPropertyId = optionalPositiveInteger(searchParams.get("propertyTenantsId"));
  const returnPath = searchParams.has("returnTo") ? detailReturnPath(searchParams.get("returnTo"), "/tenants") : undefined;
  const keyword = searchParams.get("keyword")?.trim() || undefined;
  const sort = useListSort({ fields: [{ value: "propertyId", label: "건물 번호" }, { value: "createdAt", label: "등록일" }], defaultField: "propertyId", navigation: { query: searchParams.toString(), update: navigate } });
  const { data, isLoading, error, isFetching, refetch } = useProperties({ page, size, userId, propertyId, keyword, ...sort.requestParams });
  useEffect(() => { filterForm.setFieldsValue({ userId, propertyId, keyword }); }, [filterForm, userId, propertyId, keyword]);


  function navigate(changes: Record<string, string | undefined>, replace = false) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("isDefault");
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    router[replace ? "replace" : "push"](`?${params.toString()}`);
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

  function applyFilters(values: Record<string, string | number | boolean | undefined>) {
    const changes: Record<string, string | undefined> = { page: "1" };
    for (const key of ["userId", "propertyId", "keyword"]) {
      const value = values[key];
      changes[key] = value === undefined || value === null || value === "" ? undefined : String(value).trim() || undefined;
    }
    navigate(changes);
  }
  function removeFilter(label: string) { const key = ({"건물명·주소": "keyword", "건물": "propertyId", "임대인": "userId"} as Record<string, string>)[label]; filterForm.setFieldValue(key, undefined); navigate({ page: "1", [key]: undefined }); }
  function resetFilters() { filterForm.setFieldsValue({ userId: undefined, propertyId: undefined, keyword: undefined }); applyFilters({}); }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="건물 관리" description="건물 이름이나 주소로 찾고 임대인·소속 임차인 정보를 확인합니다." extra={returnPath && <ClientLinkButton href={returnPath}>이전 화면</ClientLinkButton>} />
      <section aria-label="검색 조건과 조회 결과">
        <FilterSection><Form form={filterForm} name="properties-filters" layout="vertical" className="admin-filter-bar" onFinish={applyFilters}>
        <Form.Item name="keyword" label="건물명 또는 주소" className="admin-filter-keyword admin-filter-field"><Input allowClear placeholder="검색어 입력" /></Form.Item>
        <Form.Item name="userId" label="임대인" className="admin-filter-field"><UserLookupSelect /></Form.Item>
        <FilterActions><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={resetFilters}>필터 초기화</Button></Space></FilterActions>
        <FilterMore>
        <Form.Item name="propertyId" label="건물 ID" className="admin-id-input"><InputNumber min={1} precision={0} placeholder="정확한 ID" style={{ width: "100%" }} /></Form.Item>
        </FilterMore>
        </Form></FilterSection>
        <FilterSummary filters={[...(keyword ? [{ label: "건물명·주소", value: keyword }] : []), ...(propertyId ? [{ label: "건물", value: `#${propertyId}` }] : []), ...(userId ? [{ label: "임대인", value: `#${userId}` }] : [])].map((filter) => ({ ...filter, onRemove: () => removeFilter(filter.label) }))} onReset={resetFilters} />
        <QueryErrorAlert error={error} title="건물 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
        {(!error || data) && <PropertyTable
          sortControl={sort.control}
          data={data?.properties ?? []} loading={isLoading} page={page} pageSize={size}
          total={data?.totalElements ?? 0} filters={{ userId, keyword, propertyId }}
          onPageChange={(nextPage, nextSize) => navigate({ page: String(nextSize !== size ? 1 : nextPage), size: String(nextSize) })}
          onFilterChange={(key, value) => navigate({ page: "1", [key]: value === undefined ? undefined : String(value) })}
          returnPath={`/properties?${searchParams}`}
          tenantPropertyId={tenantPropertyId}
          onTenantPropertyChange={(id) => navigate({ propertyTenantsId: id ? String(id) : undefined, ...(id ? { propertyTenantPage: "1", propertyTenantKeyword: undefined, propertyTenantTenantId: undefined, propertyTenantContractType: undefined, propertyTenantContractStatus: undefined, propertyTenantNotifyEnabled: undefined } : {}) })}
          navigation={{ query: searchParams.toString(), returnPath: `/properties?${searchParams}`, update: navigate }}
        />}
      </section>
    </Space>
  );
}

export default function PropertiesPage() {
  return <Suspense fallback={<Spin size="large" aria-label="목록을 불러오는 중" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}><PropertiesPageContent /></Suspense>;
}
