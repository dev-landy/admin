"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Card, Form, Space, Spin, Input, InputNumber } from "antd";
import { PageHeader } from "@/components/PageHeader";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
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
  const keyword = searchParams.get("keyword")?.trim() || undefined;
  const { data, isLoading, error, isFetching, refetch } = useProperties({ page, size, userId, keyword });
  useEffect(() => { filterForm.setFieldsValue({ userId, keyword }); }, [filterForm, userId, keyword]);


  function navigate(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("isDefault");
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

  function applyFilters(values: Record<string, string | number | boolean | undefined>) {
    const changes: Record<string, string | undefined> = { page: "1" };
    for (const key of ["userId", "keyword"]) {
      const value = values[key];
      changes[key] = value === undefined || value === null || value === "" ? undefined : String(value).trim() || undefined;
    }
    navigate(changes);
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="건물 관리" description="건물 이름이나 주소로 찾고 임대인·소속 임차인 정보를 확인합니다." />
      <Card>
        <Form form={filterForm} name="properties-filters" layout="vertical" className="admin-filter-bar" onFinish={applyFilters}>
        <Form.Item name="keyword" label="건물명 또는 주소" className="admin-filter-field"><Input allowClear placeholder="검색어 입력" /></Form.Item>
        <Form.Item name="userId" label="유저 ID" className="admin-id-input"><InputNumber min={1} precision={0} placeholder="전체" style={{ width: "100%" }} /></Form.Item>
          <Form.Item label=" "><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={() => { filterForm.setFieldsValue({ userId: undefined, keyword: undefined }); applyFilters({}); }}>필터 초기화</Button></Space></Form.Item>
        </Form>
        <QueryErrorAlert error={error} title="건물 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
        {(!error || data) && <PropertyTable
          data={data?.properties ?? []} loading={isLoading} page={page} pageSize={size}
          total={data?.totalElements ?? 0} filters={{ userId, keyword }}
          onPageChange={(nextPage, nextSize) => navigate({ page: String(nextSize !== size ? 1 : nextPage), size: String(nextSize) })}
          onFilterChange={(key, value) => navigate({ page: "1", [key]: value === undefined ? undefined : String(value) })}

        />}
      </Card>
    </Space>
  );
}

export default function PropertiesPage() {
  return <Suspense fallback={<Spin size="large" aria-label="목록을 불러오는 중" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}><PropertiesPageContent /></Suspense>;
}
