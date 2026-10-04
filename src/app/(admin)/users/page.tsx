"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Card, Form, Space, Spin, Select } from "antd";
import { PageHeader } from "@/components/PageHeader";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { positiveInteger } from "@/lib/navigation/listParams";
import { useUsers } from "@/features/users/hooks";
import { UserTable } from "@/features/users/components/UserTable";
import { USER_STATUS_OPTIONS } from "@/features/users/userStatus";
import { OAUTH_PROVIDER_OPTIONS } from "@/features/users/oauthProvider";

function UsersPageContent() {
  const [filterForm] = Form.useForm();
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = positiveInteger(searchParams.get("page"), 1, 1_000_000);
  const size = positiveInteger(searchParams.get("size"), 20, 100);
  const providerRaw = searchParams.get("provider");
  const provider = OAUTH_PROVIDER_OPTIONS.find((option) => option.value === providerRaw)?.value;
  const roleRaw = searchParams.get("role");
  const role = roleRaw === "USER" || roleRaw === "ADMIN" ? roleRaw : undefined;
  const statusRaw = searchParams.get("status");
  const status = statusRaw === "DRAFT" || statusRaw === "VERIFIED" || statusRaw === "ONBOARDED" ? statusRaw : undefined;
  const { data, isLoading, error, isFetching, refetch } = useUsers({ page, size, provider, role, status });
  useEffect(() => { filterForm.setFieldsValue({ provider, role, status }); }, [filterForm, provider, role, status]);


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
    for (const key of ["provider", "role", "status"]) {
      const value = values[key];
      changes[key] = value === undefined || value === null || value === "" ? undefined : String(value).trim() || undefined;
    }
    navigate(changes);
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="유저 관리" description="가입 경로·역할·가입 상태로 사용자를 찾고 상세 정보를 확인합니다." />
      <Card>
        <Form form={filterForm} name="users-filters" layout="vertical" className="admin-filter-bar" onFinish={applyFilters}>
        <Form.Item name="provider" label="가입 경로" className="admin-filter-field"><Select allowClear placeholder="전체" options={OAUTH_PROVIDER_OPTIONS} /></Form.Item>
        <Form.Item name="role" label="역할" className="admin-filter-field"><Select allowClear placeholder="전체" options={[{ label: "사용자", value: "USER" }, { label: "관리자", value: "ADMIN" }]} /></Form.Item>
        <Form.Item name="status" label="가입 상태" className="admin-filter-field"><Select allowClear placeholder="전체" options={USER_STATUS_OPTIONS} /></Form.Item>
          <Form.Item label=" "><Space wrap><Button type="primary" htmlType="submit">조회</Button><Button onClick={() => { filterForm.setFieldsValue({ provider: undefined, role: undefined, status: undefined }); applyFilters({}); }}>필터 초기화</Button></Space></Form.Item>
        </Form>
        <QueryErrorAlert error={error} title="사용자 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
        {(!error || data) && <UserTable
          data={data?.users ?? []} loading={isLoading} page={page} pageSize={size}
          total={data?.totalElements ?? 0} filters={{ provider, role, status }}
          onPageChange={(nextPage, nextSize) => navigate({ page: String(nextSize !== size ? 1 : nextPage), size: String(nextSize) })}
          onFilterChange={(key, value) => navigate({ page: "1", [key]: value === undefined ? undefined : String(value) })}
          returnPath={`/users?${searchParams.toString()}`}
        />}
      </Card>
    </Space>
  );
}

export default function UsersPage() {
  return <Suspense fallback={<Spin size="large" aria-label="목록을 불러오는 중" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}><UsersPageContent /></Suspense>;
}
