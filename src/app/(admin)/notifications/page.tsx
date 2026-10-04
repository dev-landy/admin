"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Card, Form, InputNumber, Select, Spin } from "antd";

import { useNotifications } from "@/features/notifications/hooks";
import { NotificationTable } from "@/features/notifications/components/NotificationTable";
import { SendNotificationModal } from "@/features/notifications/components/SendNotificationModal";
import { positiveInteger } from "@/lib/navigation/listParams";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { PageHeader } from "@/components/PageHeader";
import { FilterSummary } from "@/components/FilterSummary";
import { parseNotificationUserId } from "@/features/notifications/filters";
import { NOTIFICATION_TYPE_OPTIONS } from "@/features/notifications/presentation";
import type { NotificationType } from "@/features/notifications/types";

type Filters = { userId?: number; type?: NotificationType; isRead?: string };

function NotificationsPageContent() {
  const [filterForm] = Form.useForm();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const page = positiveInteger(searchParams.get("page"), 1);
  const size = positiveInteger(searchParams.get("size"), 20, 100);
  const userId = parseNotificationUserId(searchParams.get("userId"));
  const type = NOTIFICATION_TYPE_OPTIONS.find((option) => option.value === searchParams.get("type"))?.value;
  const isReadRaw = searchParams.get("isRead");
  const isRead = isReadRaw === "true" ? true : isReadRaw === "false" ? false : undefined;
  const filters = { userId, type, isRead };
  useEffect(() => {
    filterForm.setFieldsValue({ userId, type, isRead: isRead === undefined ? undefined : String(isRead) });
  }, [filterForm, userId, type, isRead]);
  const { data, isLoading, error, refetch, isFetching } = useNotifications({ page, size, ...filters });

  function applyParams(changes: Record<string, string | number | boolean | undefined | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    for (const [key, value] of Object.entries(changes)) {
      if (value === undefined || value === null || value === "") params.delete(key);
      else params.set(key, String(value));
    }
    router.push(`?${params.toString()}`);
  }

  function handlePageChange(p: number, s: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    params.set("size", String(s));
    router.push(`?${params.toString()}`);
  }

  function resetFilters() {
    filterForm.resetFields();
    filterForm.setFieldsValue({ userId: undefined, type: undefined, isRead: undefined });
    applyParams({ userId: undefined, type: undefined, isRead: undefined });
  }

  const activeFilters = [
    ...(userId === undefined ? [] : [{ label: "유저 ID", value: userId }]),
    ...(type ? [{ label: "유형", value: NOTIFICATION_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type }] : []),
    ...(isRead === undefined ? [] : [{ label: "읽음 상태", value: isRead ? "읽음" : "미읽음" }]),
  ];

  return (
    <>
      <PageHeader title="인앱 알림" description="유저에게 저장된 알림과 읽음 상태를 확인합니다. 행을 선택하면 상세 정보를 볼 수 있습니다."
        extra={<div className="admin-actions"><Link href="/notifications/outbox">발송 대기열 보기</Link><Button loading={isFetching} onClick={() => refetch()}>새로고침</Button><Button type="primary" onClick={() => setSendModalOpen(true)}>커스텀 알림 발송</Button></div>} />
      <Card>
        <Form form={filterForm} name="notification-filters" layout="vertical" initialValues={{ ...filters, isRead: isRead === undefined ? undefined : String(isRead) }} onFinish={(values: Filters) => applyParams(values)} className="admin-filter-bar">
          <Form.Item name="userId" label="유저 ID" rules={[{ type: "integer", min: 1, message: "1 이상의 정수를 입력하세요." }]}><InputNumber min={1} precision={0} className="admin-id-input" placeholder="전체 유저" /></Form.Item>
          <Form.Item name="type" label="알림 유형"><Select className="admin-filter-field" allowClear placeholder="전체 유형" options={NOTIFICATION_TYPE_OPTIONS} /></Form.Item>
          <Form.Item name="isRead" label="읽음 상태"><Select className="admin-filter-field" allowClear placeholder="전체 상태" options={[{ label: "읽음", value: "true" }, { label: "미읽음", value: "false" }]} /></Form.Item>
          <Form.Item><div className="admin-actions"><Button htmlType="submit" type="primary">조회</Button><Button onClick={resetFilters}>초기화</Button></div></Form.Item>
        </Form>
        <FilterSummary filters={activeFilters} onReset={resetFilters} />
        <QueryErrorAlert error={error} onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} title="알림 목록을 불러오지 못했습니다." />
        {(!error || data !== undefined) && <NotificationTable data={data?.notifications ?? []} loading={isLoading} page={page} pageSize={size} total={data?.totalElements ?? 0} onPageChange={handlePageChange} filters={filters} onFilterChange={(key, value) => applyParams({ [key]: value })} />}
      </Card>
      <SendNotificationModal open={sendModalOpen} onClose={() => setSendModalOpen(false)} />
    </>
  );
}

export default function NotificationsPage() {
  return <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}><NotificationsPageContent /></Suspense>;
}
