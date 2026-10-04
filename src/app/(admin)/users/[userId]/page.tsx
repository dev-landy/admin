"use client";

import { type ReactNode, Suspense, use, useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, Spin, Typography, Space, Button, Flex } from "antd";
import { ArrowLeftOutlined, UserSwitchOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { DeferredContentBoundary, DeferredContentError } from "@/components/DeferredContentBoundary";
import { listReturnPath } from "@/lib/navigation/listReturn";

import { QueryErrorAlert } from "@/components/QueryErrorAlert";

import { useUser } from "@/features/users/hooks";
import { UserDetailCard } from "@/features/users/components/UserDetailCard";
import { ImpersonationModal } from "@/features/users/components/ImpersonationModal";
import { UserPropertiesTab } from "@/features/properties/components/UserPropertiesTab";

function TabLoading() {
  return <div role="status" aria-live="polite" aria-busy="true"><Spin /> 목록 화면을 불러오는 중입니다.</div>;
}

const UserTenantsTab = dynamic(() => import("@/features/users/components/UserTenantsTab").then((module) => module.UserTenantsTab), { loading: TabLoading });
const UserFcmTab = dynamic(() => import("@/features/users/components/UserFcmTab").then((module) => module.UserFcmTab), { loading: TabLoading });

type Props = { params: Promise<{ userId: string }> };

function UserDetailPageContent({ params }: Props) {
  const { userId: userIdStr } = use(params);
  const userId = Number(userIdStr);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = listReturnPath(searchParams.get("returnTo"), "/users");
  const { data: user, isLoading, error, isFetching, refetch } = useUser(userId);
  const [impersonationOpen, setImpersonationOpen] = useState(false);

  function renderState(content: ReactNode) {
    return <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="사용자 상세" description={`유저 #${userId}`} />
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(returnPath)}>목록으로</Button>
      {content}
    </Space>;
  }

  if (isLoading) {
    return renderState(<Spin size="large" aria-label="상세 정보를 불러오는 중" style={{ display: "block", textAlign: "center", marginTop: 80 }} />);
  }

  if (error && !user) {
    return renderState(<QueryErrorAlert error={error} title="사용자 정보를 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} />);
  }

  if (!user) {
    return renderState(<Typography.Text type="secondary">유저를 찾을 수 없습니다.</Typography.Text>);
  }

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="사용자 상세" description={`유저 #${userId}`} />
      <Flex justify="space-between" align="center" wrap gap={12}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(returnPath)}>
          목록으로
        </Button>
        <Space wrap>
          <Button onClick={() => router.push(`/notifications?userId=${userId}`)}>알림</Button>
          <Button onClick={() => router.push(`/notifications/outbox?userId=${userId}`)}>알림 Outbox</Button>
          <Button icon={<UserSwitchOutlined />} onClick={() => setImpersonationOpen(true)}>
            유저 토큰 발급
          </Button>
        </Space>
      </Flex>
      <QueryErrorAlert error={error} title="사용자 정보를 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData />
      <UserDetailCard user={user} returnPath={returnPath} />
      <Tabs
        items={[
          { key: "properties", label: "건물 목록", children: <UserPropertiesTab key={userId} userId={userId} /> },
          { key: "tenants", label: "임차인 목록", children: <DeferredContentBoundary key={userId} fallback={<DeferredContentError />}><UserTenantsTab userId={userId} /></DeferredContentBoundary> },
          { key: "fcm", label: "FCM 토큰", children: <DeferredContentBoundary key={userId} fallback={<DeferredContentError />}><UserFcmTab userId={userId} /></DeferredContentBoundary> },
        ]}
      />
      <ImpersonationModal
        open={impersonationOpen}
        onClose={() => setImpersonationOpen(false)}
        userId={userId}
      />
    </Space>
  );
}

export default function UserDetailPage(props: Props) {
  return <Suspense fallback={<Spin aria-label="상세 정보를 불러오는 중" />}><UserDetailPageContent {...props} /></Suspense>;
}
