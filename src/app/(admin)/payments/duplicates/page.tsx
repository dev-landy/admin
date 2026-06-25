"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, Spin, Typography } from "antd";

import { useDuplicates } from "@/features/payments/hooks";
import { DuplicateTable } from "@/features/payments/components/DuplicateTable";

const { Title } = Typography;

function DuplicatesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Number(searchParams.get("page") ?? "1");
  const size = Number(searchParams.get("size") ?? "20");

  const { data, isLoading } = useDuplicates({ page, size });

  function handlePageChange(p: number, s: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    params.set("size", String(s));
    router.push(`?${params.toString()}`);
  }

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>납부 중복 탐지</Title>}>
      <DuplicateTable
        data={data?.duplicates ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
      />
    </Card>
  );
}

export default function DuplicatesPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}>
      <DuplicatesPageContent />
    </Suspense>
  );
}
