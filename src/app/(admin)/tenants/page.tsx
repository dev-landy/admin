"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, Spin, Typography } from "antd";

import { useTenants } from "@/features/tenants/hooks";
import { TenantTable } from "@/features/tenants/components/TenantTable";

const { Title } = Typography;

function TenantsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Number(searchParams.get("page") ?? "1");
  const size = Number(searchParams.get("size") ?? "20");
  const userId = searchParams.get("userId") ? Number(searchParams.get("userId")) : undefined;
  const notifyEnabledRaw = searchParams.get("notifyEnabled");
  const notifyEnabled = notifyEnabledRaw === null ? undefined : notifyEnabledRaw === "true";
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const { data, isLoading } = useTenants({ page, size, userId, notifyEnabled, startDate, endDate });

  function handlePageChange(p: number, s: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    params.set("size", String(s));
    router.push(`?${params.toString()}`);
  }

  function handleFilterChange(key: string, value: boolean | number | string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (value === undefined) params.delete(key);
    else params.set(key, String(value));
    router.push(`?${params.toString()}`);
  }

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>임차인 관리</Title>}>
      <TenantTable
        data={data?.tenants ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
        filters={{ userId, notifyEnabled, startDate, endDate }}
        onFilterChange={handleFilterChange}
      />
    </Card>
  );
}

export default function TenantsPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}>
      <TenantsPageContent />
    </Suspense>
  );
}
