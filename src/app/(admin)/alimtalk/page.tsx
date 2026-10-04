"use client";

import { PageHeader } from "@/components/PageHeader";
import { FilterSummary } from "@/components/FilterSummary";
import { commitDateRangeInput } from "@/components/date-input";
import { parseNotificationUserId } from "@/features/notifications/filters";
import { ALIMTALK_STATUS_OPTIONS, ALIMTALK_TYPE_OPTIONS, ALIMTALK_TRIGGER_OPTIONS } from "@/features/alimtalk/presentation";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";
import { positiveInteger, optionalDate } from "@/lib/navigation/listParams";
import { QueryErrorAlert } from "@/components/QueryErrorAlert";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, DatePicker, Empty, Form, InputNumber, Select, Space, Spin, Tabs } from "antd";
import { ReloadOutlined, SendOutlined } from "@ant-design/icons";

import { AlimtalkHistoryTable } from "@/features/alimtalk/components/AlimtalkHistoryTable";
import { AlimtalkTemplateCard } from "@/features/alimtalk/components/AlimtalkTemplateCard";
import { AlimtalkTestSendModal } from "@/features/alimtalk/components/AlimtalkTestSendModal";
import { useAlimtalkTemplates, useAlimtalks } from "@/features/alimtalk/hooks";

function TemplatesTab() {
  const { data, isLoading, error, isFetching, refetch } = useAlimtalkTemplates();
  const [testSendOpen, setTestSendOpen] = useState(false);

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        title="저장하면 재시작 없이 다음 발송부터 적용됩니다"
        description="같은 값이 실제 발송과 임대인이 보는 미리보기에 함께 반영됩니다."
      />
      <Space wrap>
        <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
          새로고침
        </Button>
        <Button type="primary" icon={<SendOutlined />} onClick={() => setTestSendOpen(true)}>
          테스트 발송
        </Button>
      </Space>
      <QueryErrorAlert error={error} title="알림톡 템플릿을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {isLoading && <Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 40 }} />}
      {!isLoading && !error && data?.templates.length === 0 && <Empty description="등록된 템플릿이 없습니다." />}
      {data?.templates.map((template) => (
        <AlimtalkTemplateCard key={template.type} template={template} />
      ))}
      <AlimtalkTestSendModal open={testSendOpen} onClose={() => setTestSendOpen(false)} />
    </Space>
  );
}

function HistoryTab() {
  const [filterForm] = Form.useForm();
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = positiveInteger(searchParams.get("page"), 1);
  const size = positiveInteger(searchParams.get("size"), 20, 100);
  const userIdRaw = searchParams.get("userId");
  const tenantIdRaw = searchParams.get("tenantId");
  const filters = {
    userId: parseNotificationUserId(userIdRaw),
    tenantId: parseNotificationUserId(tenantIdRaw),
    type: ALIMTALK_TYPE_OPTIONS.find((option) => option.value === searchParams.get("type"))?.value,
    triggerSource: ALIMTALK_TRIGGER_OPTIONS.find((option) => option.value === searchParams.get("triggerSource"))?.value,
    status: ALIMTALK_STATUS_OPTIONS.find((option) => option.value === searchParams.get("status"))?.value,
    from: optionalDate(searchParams.get("from")),
    to: optionalDate(searchParams.get("to")),
  };

  const { userId, tenantId, type, triggerSource, status, from, to } = filters;
  useEffect(() => {
    filterForm.setFieldsValue({ userId, tenantId, type, triggerSource, status, dateRange: from || to ? [from ? dayjs(from) : null, to ? dayjs(to) : null] : undefined });
  }, [filterForm, userId, tenantId, type, triggerSource, status, from, to]);

  const { data, isLoading, error, isFetching, refetch } = useAlimtalks({ page, size, ...filters });

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`?${params.toString()}`);
  }

  function resetFilters() {
    filterForm.resetFields();
    filterForm.setFieldsValue({ userId: undefined, tenantId: undefined, type: undefined, triggerSource: undefined, status: undefined, dateRange: undefined });
    pushParams((params) => { for (const key of Object.keys(filters)) params.delete(key); params.set("page", "1"); });
  }

  return (
    <>
      <Alert
        type="info"
        showIcon
        title="제출 전(READY)과 결과 대기(PENDING)는 미결 건입니다"
        description="발송 점검에서 발견한 미결 건은 공급자 상태와 실제 실행이 끝났는지 확인한 뒤 종결하세요. 종결은 재발송하지 않으며 같은 날 재요청 제한도 유지됩니다."
        style={{ marginBottom: 16 }}
      />
      <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()} style={{ marginBottom: 16 }}>
        새로고침
      </Button>
      <Form form={filterForm} name="alimtalk-history-filters" layout="vertical" className="admin-filter-bar"
        initialValues={{ ...filters, dateRange: filters.from || filters.to ? [filters.from ? dayjs(filters.from) : null, filters.to ? dayjs(filters.to) : null] : undefined }}
        onFinish={(values: { userId?: number; tenantId?: number; type?: string; triggerSource?: string; status?: string; dateRange?: [Dayjs | null, Dayjs | null] }) => pushParams((params) => {
          params.set("page", "1");
          const changes = { userId: values.userId, tenantId: values.tenantId, type: values.type, triggerSource: values.triggerSource, status: values.status, from: values.dateRange?.[0]?.format("YYYY-MM-DD"), to: values.dateRange?.[1]?.format("YYYY-MM-DD") };
          for (const [key, value] of Object.entries(changes)) {
            if (value === undefined || value === null || value === "") params.delete(key);
            else params.set(key, String(value));
          }
        })}>
        <Form.Item name="userId" label="유저 ID" rules={[{ type: "integer", min: 1, message: "1 이상의 정수를 입력하세요." }]}><InputNumber min={1} precision={0} className="admin-id-input" placeholder="전체 유저" /></Form.Item>
        <Form.Item name="tenantId" label="임차인 ID" rules={[{ type: "integer", min: 1, message: "1 이상의 정수를 입력하세요." }]}><InputNumber min={1} precision={0} className="admin-id-input" placeholder="전체 임차인" /></Form.Item>
        <Form.Item name="type" label="알림 종류"><Select className="admin-filter-field" allowClear placeholder="전체 종류" options={ALIMTALK_TYPE_OPTIONS} /></Form.Item>
        <Form.Item name="triggerSource" label="발동 경로"><Select className="admin-filter-field" allowClear placeholder="전체 경로" options={ALIMTALK_TRIGGER_OPTIONS} /></Form.Item>
        <Form.Item name="status" label="발송 상태"><Select className="admin-filter-field" allowClear placeholder="전체 상태" options={ALIMTALK_STATUS_OPTIONS} /></Form.Item>
        <Form.Item name="dateRange" label="대상 날짜"><DatePicker.RangePicker
          allowEmpty={[true, true]}
          style={{ maxWidth: "100%" }}
          onBlur={(event, info) => commitDateRangeInput(
            event.target,
            info.range,
            filterForm.getFieldValue("dateRange"),
            (dates) => filterForm.setFieldValue("dateRange", dates),
          )}
        /></Form.Item>
        <Form.Item><div className="admin-actions"><Button type="primary" htmlType="submit">조회</Button><Button onClick={resetFilters}>초기화</Button></div></Form.Item>
      </Form>
      <FilterSummary filters={Object.entries(filters).filter(([, value]) => value !== undefined).map(([key, value]) => ({ label: ({ userId: "유저 ID", tenantId: "임차인 ID", type: "종류", triggerSource: "발동", status: "상태", from: "시작일", to: "종료일" } as Record<string, string>)[key], value }))} onReset={resetFilters} />
      <QueryErrorAlert error={error} title="알림톡 발송 이력을 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData={data !== undefined} />
      {(!error || data) && <AlimtalkHistoryTable
        data={data?.alimtalks ?? []}
        loading={isLoading}
        page={page}
        pageSize={size}
        total={data?.totalElements ?? 0}
        onPageChange={(nextPage, nextSize) =>
          pushParams((params) => {
            params.set("page", String(nextPage));
            params.set("size", String(nextSize));
          })
        }
        filters={filters}
        onFilterChange={(key, value) =>
          pushParams((params) => {
            params.set("page", "1");
            if (value === undefined || value === "") params.delete(key);
            else params.set(key, String(value));
          })
        }
      />}
    </>
  );
}

function AlimtalkPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") === "history" ? "history" : "templates";

  // 탭을 주소에 남겨 이력 필터를 건 링크를 그대로 공유할 수 있게 한다.
  function handleTabChange(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  return (
    <>
    <PageHeader title="알림톡" description="카카오 알림톡 템플릿과 발송 이력을 관리합니다." />
    <Card>
      <Tabs
        activeKey={tab}
        onChange={handleTabChange}
        items={[
          { key: "templates", label: "템플릿 설정", children: <TemplatesTab /> },
          { key: "history", label: "발송 이력", children: <HistoryTab /> },
        ]}
      />
    </Card>
    </>
  );
}

export default function AlimtalkPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}>
      <AlimtalkPageContent />
    </Suspense>
  );
}
