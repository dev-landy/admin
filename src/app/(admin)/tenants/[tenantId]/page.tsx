"use client";

import { type ReactNode, Suspense, use } from "react";
import { Button, Space, Spin, Typography } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { detailReturnPath } from "@/lib/navigation/listReturn";

import { QueryErrorAlert } from "@/components/QueryErrorAlert";

import { useTenant } from "@/features/tenants/hooks";
import { TenantDetailCard } from "@/features/tenants/components/TenantDetailCard";

type Props = { params: Promise<{ tenantId: string }> };

function TenantDetailPageContent({ params }: Props) {
  const { tenantId: tenantIdStr } = use(params);
  const tenantId = Number(tenantIdStr);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = detailReturnPath(searchParams.get("returnTo"), "/tenants");
  const { data: tenant, isLoading, error, isFetching, refetch } = useTenant(tenantId);

  function renderState(content: ReactNode) {
    return <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="임차인 상세" description={`임차인 #${tenantId}`} />
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(returnPath)}>이전 화면으로</Button>
      {content}
    </Space>;
  }

  if (isLoading) {
    return renderState(<Spin size="large" aria-label="상세 정보를 불러오는 중" style={{ display: "block", textAlign: "center", marginTop: 80 }} />);
  }

  if (error && !tenant) {
    return renderState(<QueryErrorAlert error={error} title="임차인 정보를 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} />);
  }

  if (!tenant) {
    return renderState(<Typography.Text type="secondary">임차인을 찾을 수 없습니다.</Typography.Text>);
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="임차인 상세" description={`임차인 #${tenantId}`} />
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(returnPath)}>이전 화면으로</Button>
      <QueryErrorAlert error={error} title="임차인 정보를 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData />
      <TenantDetailCard tenant={tenant} returnPath={returnPath} currentPath={`/tenants/${tenantId}?${searchParams}`} />
    </Space>
  );
}

export default function TenantDetailPage(props: Props) {
  return <Suspense fallback={<Spin aria-label="상세 정보를 불러오는 중" />}><TenantDetailPageContent {...props} /></Suspense>;
}
