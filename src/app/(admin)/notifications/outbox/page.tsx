"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, App, Button, Card, Form, Input, InputNumber, Popconfirm, Select, Space, Spin } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

import { useOutbox, useDispatchNotifications } from "@/features/notifications/hooks";
import { OutboxTable } from "@/features/notifications/components/OutboxTable";
import { FilterSummary } from "@/components/FilterSummary";
import { PageHeader } from "@/components/PageHeader";
import { OUTBOX_STATUS_OPTIONS } from "@/features/notifications/presentation";
import { positiveInteger } from "@/lib/navigation/listParams";
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

  useEffect(() => {
    filterForm.setFieldsValue({ userId, status, errorCode });
  }, [filterForm, userId, status, errorCode]);

  const queryParams = { page, size, userId, status, errorCode };
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
    filterForm.setFieldsValue({ userId: undefined, status: undefined, errorCode: undefined });
    applyFilters({ userId: undefined, status: undefined, errorCode: undefined });
  }

  return (
    <>
    <PageHeader title="알림 Outbox" description="푸시 발송 대기열과 실패 원인을 확인하고 재처리합니다."
      extra={
        <Space wrap>
          <Link href="/notifications">인앱 알림 보기</Link>
          <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
            새로고침
          </Button>
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
      <Alert
        type="info"
        showIcon
        title="재큐잉 후에는 수동 Dispatch로 발송하세요"
        description="재큐잉은 발송 대기 상태로 되돌립니다. 즉시 발송하려면 수동 Dispatch를 실행하세요. 납부일·미납·계약 만료 예정 알림은 대상일이 지나면 SKIPPED로 처리됩니다. SENDING은 발송 중이며 재큐잉할 수 없습니다."
        style={{ marginBottom: 16 }}
      />
      <Form form={filterForm} name="outbox-filters" layout="vertical" className="admin-filter-bar" initialValues={{ userId, status, errorCode }} onFinish={applyFilters}>
        <Form.Item name="userId" label="유저 ID" rules={[{ type: "integer", min: 1, message: "1 이상의 정수를 입력하세요." }]}><InputNumber min={1} precision={0} className="admin-id-input" placeholder="전체 유저" /></Form.Item>
        <Form.Item name="status" label="발송 상태"><Select className="admin-filter-field" allowClear placeholder="전체 상태" options={OUTBOX_STATUS_OPTIONS} /></Form.Item>
        <Form.Item name="errorCode" label="에러 코드"><Input allowClear className="admin-filter-field" placeholder="코드 정확 일치" /></Form.Item>
        <Form.Item><div className="admin-actions"><Button htmlType="submit" type="primary">조회</Button><Button onClick={resetFilters}>초기화</Button></div></Form.Item>
      </Form>
      <FilterSummary filters={[
        ...(userId === undefined ? [] : [{ label: "유저 ID", value: userId }]),
        ...(status ? [{ label: "상태", value: OUTBOX_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status }] : []),
        ...(errorCode ? [{ label: "에러 코드", value: errorCode }] : []),
      ]} onReset={resetFilters} />
      <QueryErrorAlert error={error} onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined}
        title="발송 대기열을 불러오지 못했습니다." />
      {(!error || data !== undefined) && <OutboxTable
        data={data?.outboxes ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={handlePageChange}
        filters={{ userId, status, errorCode }}
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
