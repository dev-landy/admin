"use client";

import { useListSort } from "@/lib/navigation/useListSort";

import { RefreshButton } from "@/components/RefreshButton";

import { FilterMore } from "@/components/FilterMore";
import { FilterSection } from "@/components/FilterSection";
import { FilterActions } from "@/components/FilterActions";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Form, Input, InputNumber, Select, Spin } from "antd";

import { useNotifications } from "@/features/notifications/hooks";
import { NotificationTable } from "@/features/notifications/components/NotificationTable";
import { SendNotificationModal } from "@/features/notifications/components/SendNotificationModal";
import { positiveInteger, optionalPositiveInteger, optionalDate } from "@/lib/navigation/listParams";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { RelatedPageBack } from "@/components/RelatedPageBack";
import { PageHeader } from "@/components/PageHeader";
import dayjs from "dayjs";
import { UserLookupSelect, TenantLookupSelect } from "@/components/EntityLookupSelect";
import { FilterDateRange } from "@/components/FilterDateRange";
import { FilterQuickViews } from "@/components/FilterQuickViews";
import { FilterSummary } from "@/components/FilterSummary";
import { parseNotificationUserId } from "@/features/notifications/filters";
import { NOTIFICATION_TYPE_OPTIONS } from "@/features/notifications/presentation";
import type { NotificationsListParams } from "@/features/notifications/types";

type Filters = Omit<NotificationsListParams, "isRead"> & { isRead?: string; createdRange?: [import("dayjs").Dayjs | null, import("dayjs").Dayjs | null]; targetRange?: [import("dayjs").Dayjs | null, import("dayjs").Dayjs | null] };

function NotificationsPageContent() {
  const [filterForm] = Form.useForm();
  const draftUserId: number | undefined = Form.useWatch("userId", filterForm);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const page = positiveInteger(searchParams.get("page"), 1);
  const size = positiveInteger(searchParams.get("size"), 20, 100);
  const userId = parseNotificationUserId(searchParams.get("userId"));
  const type = NOTIFICATION_TYPE_OPTIONS.find((option) => option.value === searchParams.get("type"))?.value;
  const isReadRaw = searchParams.get("isRead");
  const isRead = isReadRaw === "true" ? true : isReadRaw === "false" ? false : undefined;
  const notificationId = optionalPositiveInteger(searchParams.get("notificationId"));
  const tenantId = optionalPositiveInteger(searchParams.get("tenantId"));
  const keyword = searchParams.get("keyword")?.trim() || undefined;
  const createdFrom = optionalDate(searchParams.get("createdFrom"));
  const createdTo = optionalDate(searchParams.get("createdTo"));
  const targetFrom = optionalDate(searchParams.get("targetFrom"));
  const targetTo = optionalDate(searchParams.get("targetTo"));
  const filters = { userId, type, isRead, notificationId, tenantId, keyword, createdFrom, createdTo, targetFrom, targetTo };
  useEffect(() => {
    filterForm.setFieldsValue({ userId, type, isRead: isRead === undefined ? undefined : String(isRead), notificationId, tenantId, keyword,
      createdRange: createdFrom || createdTo ? [createdFrom ? dayjs(createdFrom) : null, createdTo ? dayjs(createdTo) : null] : undefined,
      targetRange: targetFrom || targetTo ? [targetFrom ? dayjs(targetFrom) : null, targetTo ? dayjs(targetTo) : null] : undefined });
  }, [filterForm, userId, type, isRead, notificationId, tenantId, keyword, createdFrom, createdTo, targetFrom, targetTo]);
  const sort = useListSort({ fields: [{ value: "notificationId", label: "알림 ID" }, { value: "createdAt", label: "생성 시각" }, { value: "targetDate", label: "업무 대상일" }], defaultField: "notificationId", defaultDirection: "desc", navigation: { query: searchParams.toString(), update: applyParams } });
  const { data, isLoading, error, refetch, isFetching } = useNotifications({ page, size, ...sort.requestParams, ...filters });

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
    filterForm.setFieldsValue(Object.fromEntries([...Object.keys(filters), "createdRange", "targetRange"].map((key) => [key, undefined])));
    applyParams(Object.fromEntries(Object.keys(filters).map((key) => [key, undefined])));
  }

  const labels: Record<string, string> = { userId: "수신 유저", type: "알림 유형", isRead: "읽음 상태", notificationId: "알림 ID", tenantId: "임차인", keyword: "제목", createdFrom: "생성 시작일", createdTo: "생성 종료일", targetFrom: "대상 시작일", targetTo: "대상 종료일" };
  const activeFilters = Object.entries(filters).filter(([, value]) => value !== undefined).map(([key, value]) => ({
    label: labels[key], value: typeof value === "boolean" ? value ? "읽음" : "미읽음" : key === "type" ? NOTIFICATION_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? String(value) : String(value), onRemove: () => applyParams({ [key]: undefined }),
  }));

  return (
    <>
      <PageHeader title="인앱 알림" description="유저에게 저장된 알림과 읽음 상태를 확인합니다. 행을 선택하면 상세 정보를 볼 수 있습니다."
        extra={<div className="admin-actions"><RelatedPageBack /><Link href="/notifications/outbox">발송 대기열 보기</Link><RefreshButton loading={isFetching} onClick={() => refetch()}>새로고침</RefreshButton><Button type="primary" onClick={() => setSendModalOpen(true)}>커스텀 알림 발송</Button></div>} />
      <section aria-label="검색 조건과 조회 결과">
        <FilterQuickViews views={[
          { label: "미읽음", active: isRead === false, onClick: () => applyParams({ isRead: isRead === false ? undefined : false }) },
          { label: "계약 처리 실패", active: type === "CONTRACT_FAILED", onClick: () => applyParams({ type: type === "CONTRACT_FAILED" ? undefined : "CONTRACT_FAILED" }) },
        ]} />
        <FilterSection><Form form={filterForm} name="notification-filters" onValuesChange={(changes) => { if ("userId" in changes) filterForm.setFieldValue("tenantId", undefined); }} layout="vertical" initialValues={{ ...filters, isRead: isRead === undefined ? undefined : String(isRead) }} onFinish={(values: Filters) => {
          const { createdRange, targetRange, ...rest } = values;
          applyParams({ ...rest, createdFrom: createdRange?.[0]?.format("YYYY-MM-DD"), createdTo: createdRange?.[1]?.format("YYYY-MM-DD"), targetFrom: targetRange?.[0]?.format("YYYY-MM-DD"), targetTo: targetRange?.[1]?.format("YYYY-MM-DD") });
        }} className="admin-filter-bar">
          <Form.Item className="admin-filter-keyword" name="keyword" label="제목 검색"><Input allowClear maxLength={200} placeholder="알림 제목" /></Form.Item>
        <Form.Item name="userId" label="수신 유저" rules={[{ type: "integer", min: 1, message: "1 이상의 정수를 입력하세요." }]}><UserLookupSelect style={{ minWidth: 240 }} /></Form.Item>
        <Form.Item name="isRead" label="읽음 상태"><Select className="admin-filter-field" allowClear placeholder="전체 상태" options={[{ label: "읽음", value: "true" }, { label: "미읽음", value: "false" }]} /></Form.Item>
        <FilterActions><div className="admin-actions"><Button htmlType="submit" type="primary">조회</Button><Button onClick={resetFilters}>초기화</Button></div></FilterActions>
        <FilterMore>
        <Form.Item name="tenantId" label="임차인"><TenantLookupSelect userId={draftUserId} style={{ minWidth: 240 }} /></Form.Item>
        <Form.Item name="type" label="알림 유형"><Select className="admin-filter-field" allowClear placeholder="전체 유형" options={NOTIFICATION_TYPE_OPTIONS} /></Form.Item>
        <Form.Item name="createdRange" label="생성일"><FilterDateRange form={filterForm} name="createdRange" /></Form.Item>
        <Form.Item name="targetRange" label="대상일"><FilterDateRange form={filterForm} name="targetRange" /></Form.Item>
        <Form.Item name="notificationId" label="알림 ID"><InputNumber min={1} precision={0} /></Form.Item>
        </FilterMore>
        </Form></FilterSection>
        <FilterSummary filters={activeFilters} onReset={resetFilters} />
        <QueryErrorAlert error={error} onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} title="알림 목록을 불러오지 못했습니다." />
        {(!error || data !== undefined) && <NotificationTable sortControl={sort.control} returnPath={`/notifications?${searchParams.toString()}`} data={data?.notifications ?? []} loading={isLoading} page={page} pageSize={size} total={data?.totalElements ?? 0} onPageChange={handlePageChange} filters={filters} onFilterChange={(key, value) => applyParams({ [key]: value })} />}
      </section>
      <SendNotificationModal open={sendModalOpen} onClose={() => setSendModalOpen(false)} />
    </>
  );
}

export default function NotificationsPage() {
  return <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}><NotificationsPageContent /></Suspense>;
}
