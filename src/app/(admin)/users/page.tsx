"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, Spin, Typography } from "antd";

import { useUsers } from "@/features/users/hooks";
import { UserTable } from "@/features/users/components/UserTable";
import type { OAuthProvider, UserRole } from "@/features/users/types";

const { Title } = Typography;

function UsersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Number(searchParams.get("page") ?? "1");
  const size = Number(searchParams.get("size") ?? "20");
  const provider = (searchParams.get("provider") as OAuthProvider) || undefined;
  const role = (searchParams.get("role") as UserRole) || undefined;
  const onboardedRaw = searchParams.get("onboarded");
  const onboarded = onboardedRaw === null ? undefined : onboardedRaw === "true";

  const { data, isLoading } = useUsers({ page, size, provider, role, onboarded });

  function handlePageChange(p: number, s: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    params.set("size", String(s));
    router.push(`?${params.toString()}`);
  }

  function handleFilterChange(key: string, value: string | boolean | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (value === undefined) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>유저 관리</Title>}>
      <UserTable
        data={data?.users ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
        filters={{ provider, role, onboarded }}
        onFilterChange={handleFilterChange}
      />
    </Card>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}>
      <UsersPageContent />
    </Suspense>
  );
}
