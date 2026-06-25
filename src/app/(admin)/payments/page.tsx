"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, Spin, Typography } from "antd";

import { usePayments } from "@/features/payments/hooks";
import { PaymentTable } from "@/features/payments/components/PaymentTable";
import type { PaymentSource } from "@/features/payments/types";

const { Title } = Typography;

function PaymentsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Number(searchParams.get("page") ?? "1");
  const size = Number(searchParams.get("size") ?? "20");
  const source = (searchParams.get("source") as PaymentSource) || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const userId = searchParams.get("userId") ? Number(searchParams.get("userId")) : undefined;
  const tenantId = searchParams.get("tenantId") ? Number(searchParams.get("tenantId")) : undefined;

  const { data, isLoading } = usePayments({ page, size, source, from, to, userId, tenantId });

  function handlePageChange(p: number, s: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    params.set("size", String(s));
    router.push(`?${params.toString()}`);
  }

  function handleFilterChange(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (value === undefined) params.delete(key);
    else params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>납부 목록</Title>}>
      <PaymentTable
        data={data?.payments ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
        filters={{ source }}
        onFilterChange={handleFilterChange}
      />
    </Card>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}>
      <PaymentsPageContent />
    </Suspense>
  );
}
