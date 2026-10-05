"use client";

import { FilterMore } from "@/components/FilterMore";
import { FilterSection } from "@/components/FilterSection";
import { FilterActions } from "@/components/FilterActions";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Form, Space, Spin, Select, Input, InputNumber } from "antd";
import { FilterSummary } from "@/components/FilterSummary";
import { PageHeader } from "@/components/PageHeader";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { optionalPositiveInteger, positiveInteger } from "@/lib/navigation/listParams";
import { useUsers } from "@/features/users/hooks";
import { UserTable } from "@/features/users/components/UserTable";
import { USER_STATUS_OPTIONS } from "@/features/users/userStatus";
import { OAUTH_PROVIDER_OPTIONS } from "@/features/users/oauthProvider";
import type { UserAccountState } from "@/features/users/types";
import { useListSort } from "@/lib/navigation/useListSort";

const LIST_STATUS_OPTIONS = [...USER_STATUS_OPTIONS, { value: "WITHDRAWN" as const, label: "탈퇴" }];

function UsersPageContent() {
  const [filterForm] = Form.useForm();
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = positiveInteger(searchParams.get("page"), 1, 1_000_000);
  const size = positiveInteger(searchParams.get("size"), 20, 100);
  const keyword = searchParams.get("keyword")?.trim() || undefined;
  const userId = optionalPositiveInteger(searchParams.get("userId"));
  const providerRaw = searchParams.get("provider");
  const provider = OAUTH_PROVIDER_OPTIONS.find((option) => option.value === providerRaw)?.value;
  const roleRaw = searchParams.get("role");
  const role = roleRaw === "USER" || roleRaw === "ADMIN" ? roleRaw : undefined;
  const statusRaw = searchParams.get("status");
  const listStatus = LIST_STATUS_OPTIONS.find((option) => option.value === statusRaw)?.value;
  const status = listStatus === "WITHDRAWN" ? undefined : listStatus;
  const accountState: UserAccountState = listStatus === "WITHDRAWN" ? "WITHDRAWN" : listStatus ? "ACTIVE" : "ALL";
  const sort = useListSort({ fields: [{ value: "userId", label: "사용자 ID" }, { value: "createdAt", label: "가입일" }], defaultField: "userId", navigation: { query: searchParams.toString(), update: navigate } });
  const { data, isLoading, error, isFetching, refetch } = useUsers({ page, size, keyword, userId, provider, role, status, accountState, ...sort.requestParams });
  useEffect(() => { filterForm.setFieldsValue({ keyword, userId, provider, role, status: listStatus }); }, [filterForm, keyword, userId, provider, role, listStatus]);


  function navigate(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("onboarded");
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
    for (const key of ["keyword", "userId", "provider", "role", "status"]) {
      const value = values[key];
      changes[key] = value === undefined || value === null || value === "" ? undefined : String(value).trim() || undefined;
    }
    navigate(changes);
  }
  function removeFilter(label: string) { const key = ({"검색": "keyword", "유저 ID": "userId", "가입 경로": "provider", "역할": "role", "가입 상태": "status"} as Record<string, string>)[label]; filterForm.setFieldValue(key, undefined); navigate({ page: "1", [key]: undefined }); }
  function resetFilters() { filterForm.setFieldsValue({ keyword: undefined, userId: undefined, provider: undefined, role: undefined, status: undefined }); applyFilters({}); }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="유저 관리" description="이메일·전화번호로 전체 사용자를 검색하거나 정확한 ID로 찾습니다." />
      <section aria-label="검색 조건과 조회 결과">
        <FilterSection><Form form={filterForm} name="users-filters" layout="vertical" className="admin-filter-bar" onFinish={applyFilters}>
        <Form.Item name="keyword" label="이메일·전화번호" className="admin-filter-keyword admin-filter-field"><Input allowClear placeholder="전체 사용자에서 검색" /></Form.Item>
        <Form.Item name="status" label="가입 상태" className="admin-filter-field"><Select allowClear placeholder="전체" options={LIST_STATUS_OPTIONS} /></Form.Item>
        <FilterActions><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={resetFilters}>필터 초기화</Button></Space></FilterActions>
        <FilterMore>
        <Form.Item name="userId" label="유저 ID" className="admin-id-input"><InputNumber min={1} precision={0} placeholder="정확한 ID" style={{ width: "100%" }} /></Form.Item>
        <Form.Item name="provider" label="가입 경로" className="admin-filter-field"><Select allowClear placeholder="전체" options={OAUTH_PROVIDER_OPTIONS} /></Form.Item>
        <Form.Item name="role" label="역할" className="admin-filter-field"><Select allowClear placeholder="전체" options={[{ label: "사용자", value: "USER" }, { label: "관리자", value: "ADMIN" }]} /></Form.Item>
        </FilterMore>
        </Form></FilterSection>
        <FilterSummary filters={[
          ...(keyword ? [{ label: "검색", value: keyword }] : []), ...(userId ? [{ label: "유저 ID", value: userId }] : []),
          ...(provider ? [{ label: "가입 경로", value: OAUTH_PROVIDER_OPTIONS.find((item) => item.value === provider)?.label }] : []),
          ...(role ? [{ label: "역할", value: role === "ADMIN" ? "관리자" : "사용자" }] : []),
          ...(listStatus ? [{ label: "가입 상태", value: LIST_STATUS_OPTIONS.find((item) => item.value === listStatus)?.label }] : []),
        ].map((filter) => ({ ...filter, onRemove: () => removeFilter(filter.label) }))} onReset={resetFilters} />
        <QueryErrorAlert error={error} title="사용자 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
        {(!error || data) && <UserTable
          sortControl={sort.control}
          data={data?.users ?? []} loading={isLoading} page={page} pageSize={size}
          total={data?.totalElements ?? 0} filters={{ provider, role, status }}
          onPageChange={(nextPage, nextSize) => navigate({ page: String(nextSize !== size ? 1 : nextPage), size: String(nextSize) })}
          onFilterChange={(key, value) => navigate({ page: "1", [key]: value === undefined ? undefined : String(value) })}
          returnPath={`/users?${searchParams.toString()}`}
        />}
      </section>
    </Space>
  );
}

export default function UsersPage() {
  return <Suspense fallback={<Spin size="large" aria-label="목록을 불러오는 중" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}><UsersPageContent /></Suspense>;
}
