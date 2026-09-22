"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, Empty, Space, Spin, Tabs, Typography } from "antd";
import { ReloadOutlined, SendOutlined } from "@ant-design/icons";

import { AlimtalkHistoryTable } from "@/features/alimtalk/components/AlimtalkHistoryTable";
import { AlimtalkTemplateCard } from "@/features/alimtalk/components/AlimtalkTemplateCard";
import { AlimtalkTestSendModal } from "@/features/alimtalk/components/AlimtalkTestSendModal";
import { useAlimtalkTemplates, useAlimtalks } from "@/features/alimtalk/hooks";
import type { AlimtalkStatus, AlimtalkTrigger, AlimtalkType } from "@/features/alimtalk/types";

const { Title } = Typography;

function TemplatesTab() {
  const { data, isLoading, isFetching, refetch } = useAlimtalkTemplates();
  const [testSendOpen, setTestSendOpen] = useState(false);

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        title="저장하면 재시작 없이 다음 발송부터 적용됩니다"
        description="같은 값이 실제 발송과 임대인이 보는 미리보기에 함께 반영됩니다."
      />
      <Space>
        <Button icon={<ReloadOutlined />} loading={isFetching} onClick={() => refetch()}>
          새로고침
        </Button>
        <Button type="primary" icon={<SendOutlined />} onClick={() => setTestSendOpen(true)}>
          테스트 발송
        </Button>
      </Space>
      {isLoading && <Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 40 }} />}
      {!isLoading && (data?.templates.length ?? 0) === 0 && <Empty description="등록된 템플릿이 없습니다." />}
      {data?.templates.map((template) => (
        <AlimtalkTemplateCard key={template.type} template={template} />
      ))}
      <AlimtalkTestSendModal open={testSendOpen} onClose={() => setTestSendOpen(false)} />
    </Space>
  );
}

function HistoryTab() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Number(searchParams.get("page") ?? "1");
  const size = Number(searchParams.get("size") ?? "20");
  const userIdRaw = searchParams.get("userId");
  const tenantIdRaw = searchParams.get("tenantId");
  const filters = {
    userId: userIdRaw === null ? undefined : Number(userIdRaw),
    tenantId: tenantIdRaw === null ? undefined : Number(tenantIdRaw),
    type: (searchParams.get("type") as AlimtalkType) || undefined,
    triggerSource: (searchParams.get("triggerSource") as AlimtalkTrigger) || undefined,
    status: (searchParams.get("status") as AlimtalkStatus) || undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  };

  const { data, isLoading, isFetching, refetch } = useAlimtalks({ page, size, ...filters });

  function pushParams(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`?${params.toString()}`);
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
      <AlimtalkHistoryTable
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
      />
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
    <Card title={<Title level={4} style={{ margin: 0 }}>알림톡</Title>}>
      <Tabs
        activeKey={tab}
        onChange={handleTabChange}
        items={[
          { key: "templates", label: "템플릿 설정", children: <TemplatesTab /> },
          { key: "history", label: "발송 이력", children: <HistoryTab /> },
        ]}
      />
    </Card>
  );
}

export default function AlimtalkPage() {
  return (
    <Suspense fallback={<Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />}>
      <AlimtalkPageContent />
    </Suspense>
  );
}
