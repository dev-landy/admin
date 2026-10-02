"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Spin, Typography } from "antd";

import { QueryErrorAlert } from "@/components/QueryErrorAlert";

import { PropertyTable } from "@/features/properties/components/PropertyTable";
import { useProperties } from "@/features/properties/hooks";

const { Title } = Typography;

function PropertiesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = Number(searchParams.get("page") ?? "1");
  const size = Number(searchParams.get("size") ?? "20");
  const userId = searchParams.get("userId") ? Number(searchParams.get("userId")) : undefined;
  const keyword = searchParams.get("keyword") || undefined;
  const { data, isLoading, error, isFetching, refetch } = useProperties({ page, size, userId, keyword });

  function navigate(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("isDefault");
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>건물 관리</Title>}>
      <QueryErrorAlert error={error} title="건물 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {(!error || data) && <PropertyTable
        data={data?.properties ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        filters={{ userId, keyword }}
        onPageChange={(nextPage, nextSize) => navigate({ page: String(nextPage), size: String(nextSize) })}
        onFilterChange={(key, value) => navigate({ page: "1", [key]: value === undefined ? undefined : String(value) })}
      />}
    </Card>
  );
}

export default function PropertiesPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}>
      <PropertiesPageContent />
    </Suspense>
  );
}
