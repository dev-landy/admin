"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, Spin, Typography } from "antd";

import { useNotifications } from "@/features/notifications/hooks";
import { NotificationTable } from "@/features/notifications/components/NotificationTable";
import type { NotificationType } from "@/features/notifications/types";

const { Title } = Typography;

function NotificationsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Number(searchParams.get("page") ?? "1");
  const size = Number(searchParams.get("size") ?? "20");
  const type = (searchParams.get("type") as NotificationType) || undefined;
  const isReadRaw = searchParams.get("isRead");
  const isRead = isReadRaw === null ? undefined : isReadRaw === "true";

  const { data, isLoading } = useNotifications({ page, size, type, isRead });

  function handlePageChange(p: number, s: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    params.set("size", String(s));
    router.push(`?${params.toString()}`);
  }

  function handleFilterChange(key: string, value: string | boolean | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (value === undefined) params.delete(key);
    else params.set(key, String(value));
    router.push(`?${params.toString()}`);
  }

  return (
    <Card title={<Title level={4} style={{ margin: 0 }}>인앱 알림</Title>}>
      <NotificationTable
        data={data?.notifications ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
        filters={{ type, isRead }}
        onFilterChange={handleFilterChange}
      />
    </Card>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}>
      <NotificationsPageContent />
    </Suspense>
  );
}
