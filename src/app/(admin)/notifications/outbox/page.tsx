"use client";

import { useListSort } from "@/lib/navigation/useListSort";

import { RefreshButton } from "@/components/RefreshButton";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { App, Button, Card, Form, Input, InputNumber, Popconfirm, Select, Space, Spin } from "antd";

import { useOutbox, useDispatchNotifications } from "@/features/notifications/hooks";
import { OutboxTable } from "@/features/notifications/components/OutboxTable";
import dayjs from "dayjs";
import { UserLookupSelect } from "@/components/EntityLookupSelect";
import { FilterDateRange } from "@/components/FilterDateRange";
import { FilterQuickViews } from "@/components/FilterQuickViews";
import { FilterMore } from "@/components/FilterMore";
import { OperationalNotice } from "@/components/OperationalNotice";
import { FilterSection } from "@/components/FilterSection";
import { FilterActions } from "@/components/FilterActions";
import { FilterSummary } from "@/components/FilterSummary";
import { RelatedPageBack } from "@/components/RelatedPageBack";
import { PageHeader } from "@/components/PageHeader";
import { OUTBOX_STATUS_OPTIONS } from "@/features/notifications/presentation";
import { positiveInteger, optionalPositiveInteger, optionalDate } from "@/lib/navigation/listParams";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";
import { parseNotificationUserId } from "@/features/notifications/filters";
import { parseProblemDetail } from "@/lib/api/problem";

function OutboxPageContent() {
  const [filterForm] = Form.useForm();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { notification } = App.useApp();
  const [dispatchSize, setDispatchSize] = useState<number>(50);

  const page = positiveInteger(searchParams.get("page"), 1);
  const size = positiveInteger(searchParams.get("size"), 20, 100);
  const userId = parseNotificationUserId(searchParams.get("userId"));
  const errorCode = searchParams.get("errorCode")?.trim() || undefined;
  const status = OUTBOX_STATUS_OPTIONS.find((option) => option.value === searchParams.get("status"))?.value;

  const notificationId = optionalPositiveInteger(searchParams.get("notificationId"));
  const fcmTokenId = optionalPositiveInteger(searchParams.get("fcmTokenId"));
  const lastAttemptedFrom = optionalDate(searchParams.get("lastAttemptedFrom"));
  const lastAttemptedTo = optionalDate(searchParams.get("lastAttemptedTo"));
  const sentFrom = optionalDate(searchParams.get("sentFrom"));
  const sentTo = optionalDate(searchParams.get("sentTo"));
  const filters = { userId, status, errorCode, notificationId, fcmTokenId, lastAttemptedFrom, lastAttemptedTo, sentFrom, sentTo };

  useEffect(() => {
    filterForm.setFieldsValue({ userId, status, errorCode, notificationId, fcmTokenId,
      attemptedRange: lastAttemptedFrom || lastAttemptedTo ? [lastAttemptedFrom ? dayjs(lastAttemptedFrom) : null, lastAttemptedTo ? dayjs(lastAttemptedTo) : null] : undefined,
      sentRange: sentFrom || sentTo ? [sentFrom ? dayjs(sentFrom) : null, sentTo ? dayjs(sentTo) : null] : undefined });
  }, [filterForm, userId, status, errorCode, notificationId, fcmTokenId, lastAttemptedFrom, lastAttemptedTo, sentFrom, sentTo]);

  const sort = useListSort({ fields: [{ value: "notificationOutboxEventId", label: "대기열 ID" }, { value: "sentAt", label: "푸시 발송 시각" }, { value: "lastAttemptedAt", label: "마지막 시도" }], defaultField: "notificationOutboxEventId", defaultDirection: "desc", navigation: { query: searchParams.toString(), update: applyFilters } });
  const queryParams = { page, size, ...filters, ...sort.requestParams };
  const { data, isLoading, isFetching, error, refetch } = useOutbox(queryParams);
  const { mutate: dispatch, isPending: isDispatching } = useDispatchNotifications();

  function handlePageChange(p: number, s: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    params.set("size", String(s));
    router.push(`?${params.toString()}`);
  }

  function applyFilters(changes: Record<string, string | number | undefined | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    for (const [key, value] of Object.entries(changes)) {
      const normalized = value === undefined || value === null ? undefined : String(value).trim();
      if (!normalized) params.delete(key);
      else params.set(key, normalized);
    }
    router.push(`?${params.toString()}`);
  }

  function resetFilters() {
    filterForm.resetFields();
    filterForm.setFieldsValue(Object.fromEntries([...Object.keys(filters), "attemptedRange", "sentRange"].map((key) => [key, undefined])));
    applyFilters(Object.fromEntries(Object.keys(filters).map((key) => [key, undefined])));
  }

  return (
    <>
    <PageHeader title="알림 Outbox" description="푸시 발송 대기열과 실패 원인을 확인하고 재처리합니다."
      extra={
        <Space wrap>
          <RelatedPageBack />
          <Link href="/notifications">인앱 알림 보기</Link>
          <RefreshButton loading={isFetching} onClick={() => refetch()}>
            새로고침
          </RefreshButton>
          <Space.Compact>
            <Space.Addon>최대</Space.Addon>
            <InputNumber
              aria-label="최대 처리 건수"
              min={1}
              max={100}
              precision={0}
              disabled={isDispatching}
              value={dispatchSize}
              onChange={(v) => setDispatchSize(v ?? 50)}
              style={{ width: 80 }}
            />
            <Space.Addon>건</Space.Addon>
          </Space.Compact>
          <Popconfirm
            title={`최대 ${dispatchSize}건의 대기 발송을 즉시 처리하시겠습니까?`}
            description="목록 필터와 관계없이 발송 가능한 전체 대기 건에서 처리합니다."
            okText="확인"
            cancelText="취소"
            disabled={isDispatching}
            onConfirm={() =>
              dispatch(dispatchSize, {
                onSuccess: (res) => {
                  if (!res) {
                    notification.info({ title: "수동 발송 요청이 완료되었습니다.",
                      description: "서버가 처리 통계를 제공하지 않았습니다. 목록을 새로 조회해 결과를 확인해 주세요." });
                    return;
                  }
                  const summary = {
                    title: `${res.processed}건 처리 · 발송 성공 ${res.sent}건`,
                    description: `실패 ${res.failed}건 · 건너뜀 ${res.skipped}건 · 다른 경로에서 발송 중 ${res.alreadyClaimed}건`,
                  };
                  if (res.failed > 0) notification.warning(summary);
                  else notification.success(summary);
                },
                onError: (err) => {
                  const p = parseProblemDetail(err);
                  notification.error({ title: p?.title ?? "발송 결과를 확인하지 못했습니다.",
                    description: `${p?.detail ?? "일부 발송은 처리되었을 수 있습니다."} 목록을 다시 조회해 상태를 확인해 주세요.` });
                },
              })
            }
          >
            <Button type="primary" loading={isDispatching} disabled={isDispatching}>수동 Dispatch</Button>
          </Popconfirm>
        </Space>
      }
    />
    <Card>
      <OperationalNotice title="재큐잉·전체 대기열 발송 안내">재큐잉은 발송 대기 상태로 되돌립니다. 수동 Dispatch는 목록 필터와 관계없이 전체 대기열을 처리합니다. 대상일이 지난 예약 알림은 건너뛰며, 발송 중인 건은 재큐잉할 수 없습니다.</OperationalNotice>
      <FilterQuickViews views={[
        { label: "실패", active: status === "FAILED", onClick: () => applyFilters({ status: status === "FAILED" ? undefined : "FAILED" }) },
        { label: "건너뜀", active: status === "SKIPPED", onClick: () => applyFilters({ status: status === "SKIPPED" ? undefined : "SKIPPED" }) },
        { label: "발송 중", active: status === "SENDING", onClick: () => applyFilters({ status: status === "SENDING" ? undefined : "SENDING" }) },
      ]} />
      <FilterSection><Form form={filterForm} name="outbox-filters" layout="vertical" className="admin-filter-bar" initialValues={{ userId, status, errorCode }} onFinish={(values: typeof filters & { attemptedRange?: [import("dayjs").Dayjs | null, import("dayjs").Dayjs | null]; sentRange?: [import("dayjs").Dayjs | null, import("dayjs").Dayjs | null] }) => {
        const { attemptedRange, sentRange, ...rest } = values;
        applyFilters({ ...rest, lastAttemptedFrom: attemptedRange?.[0]?.format("YYYY-MM-DD"), lastAttemptedTo: attemptedRange?.[1]?.format("YYYY-MM-DD"), sentFrom: sentRange?.[0]?.format("YYYY-MM-DD"), sentTo: sentRange?.[1]?.format("YYYY-MM-DD") });
      }}>
        <Form.Item name="userId" label="유저" rules={[{ type: "integer", min: 1, message: "1 이상의 정수를 입력하세요." }]}><UserLookupSelect style={{ minWidth: 240 }} /></Form.Item>
        <Form.Item name="status" label="발송 상태"><Select className="admin-filter-field" allowClear placeholder="전체 상태" options={OUTBOX_STATUS_OPTIONS} /></Form.Item>
        <FilterActions><div className="admin-actions"><Button htmlType="submit" type="primary">조회</Button><Button onClick={resetFilters}>초기화</Button></div></FilterActions>
        <FilterMore>
        <Form.Item name="notificationId" label="알림 ID"><InputNumber min={1} precision={0} /></Form.Item>
        <Form.Item name="fcmTokenId" label="FCM 토큰 ID"><InputNumber min={1} precision={0} /></Form.Item>
        <Form.Item name="attemptedRange" label="마지막 시도일"><FilterDateRange form={filterForm} name="attemptedRange" /></Form.Item>
        <Form.Item name="sentRange" label="발송일"><FilterDateRange form={filterForm} name="sentRange" /></Form.Item>
        <Form.Item name="errorCode" label="에러 코드"><Input allowClear className="admin-filter-field" placeholder="코드 정확 일치" /></Form.Item>
        </FilterMore>

      </Form></FilterSection>
      <FilterSummary filters={Object.entries(filters).filter(([, value]) => value !== undefined).map(([key, value]) => ({
        label: ({ userId: "유저 ID", status: "상태", errorCode: "에러 코드", notificationId: "알림 ID", fcmTokenId: "FCM 토큰 ID", lastAttemptedFrom: "시도 시작일", lastAttemptedTo: "시도 종료일", sentFrom: "발송 시작일", sentTo: "발송 종료일" } as Record<string, string>)[key],
        value: key === "status" ? OUTBOX_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? String(value) : String(value), onRemove: () => applyFilters({ [key]: undefined }),
      }))} onReset={resetFilters} />
      <QueryErrorAlert error={error} onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined}
        title="발송 대기열을 불러오지 못했습니다." />
      {(!error || data !== undefined) && <OutboxTable sortControl={sort.control} returnPath={`/notifications/outbox?${searchParams.toString()}`}
        data={data?.outboxes ?? []}
        loading={isLoading}
        disabled={isFetching || !!error}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
        filters={filters}
        onFilterChange={(key, value) => applyFilters({ [key]: value })}
      />}
    </Card>
    </>
  );
}

export default function OutboxPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}>
      <OutboxPageContent />
    </Suspense>
  );
}
