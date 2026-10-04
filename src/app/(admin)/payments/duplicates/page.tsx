"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, Space, Spin } from "antd";

import { PageHeader } from "@/components/PageHeader";
import { ClientLinkButton } from "@/components/ClientLinkButton";
import { positiveInteger } from "@/lib/navigation/listParams";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";

import { useDuplicates } from "@/features/payments/hooks";
import { DuplicateTable } from "@/features/payments/components/DuplicateTable";

function DuplicatesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = positiveInteger(searchParams.get("page"), 1);
  const size = positiveInteger(searchParams.get("size"), 20, 100);

  const { data, isLoading, error, isFetching, refetch } = useDuplicates({ page, size });

  function handlePageChange(p: number, s: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    params.set("size", String(s));
    router.push(`?${params.toString()}`);
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="납부 중복 탐지" description="동일 임차인·청구월에 여러 납부가 등록된 내역입니다. 임차인별 납부 내역을 확인해 주세요." extra={<ClientLinkButton href="/payments">납부 목록</ClientLinkButton>} />
    <Card>
      <QueryErrorAlert error={error} title="중복 납부 목록을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {(!error || data) && <DuplicateTable
        data={data?.duplicates ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
      />}
    </Card>
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
