"use client";

import { type ReactNode, Suspense, use, useState } from "react";
import dynamic from "next/dynamic";
import { Alert, Tabs, Spin, Typography, Space, Button, Flex } from "antd";
import { ArrowLeftOutlined, UserSwitchOutlined } from "@ant-design/icons";
import { RowActions } from "@/components/RowActions";
import { ClientLinkButton } from "@/components/ClientLinkButton";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { DeferredContentBoundary, DeferredContentError } from "@/components/DeferredContentBoundary";
import { detailReturnPath, relatedListPath } from "@/lib/navigation/listReturn";
import type { ListNavigation } from "@/lib/navigation/useScopedListState";

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

const USER_DETAIL_DESCRIPTION = "계정과 소속 건물·임차인·기기를 확인하고 알림·권한을 관리합니다.";

type Props = { params: Promise<{ userId: string }> };

function UserDetailPageContent({ params }: Props) {
  const { userId: userIdStr } = use(params);
  const userId = Number(userIdStr);
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = detailReturnPath(searchParams.get("returnTo"), "/users");
  const activeTab = ["properties", "tenants", "fcm"].includes(searchParams.get("tab") ?? "") ? searchParams.get("tab")! : "properties";
  const currentPath = `/users/${userId}?${searchParams}`;
  function navigate(changes: Record<string, string | undefined>, replace = false) {
    const query = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) { if (value === undefined) query.delete(key); else query.set(key, value); }
    router[replace ? "replace" : "push"](`?${query}`);
  }
  const listNavigation: ListNavigation = { query: searchParams.toString(), returnPath: currentPath, update: navigate };
  const { data: user, isLoading, error, isFetching, refetch } = useUser(userId);
  const [impersonationOpen, setImpersonationOpen] = useState(false);

  function renderState(content: ReactNode) {
    return <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="사용자 상세" description={USER_DETAIL_DESCRIPTION} />
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(returnPath)}>이전 화면으로</Button>
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
  const readOnly = user.deletedAt != null;

  return (
    <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
      <PageHeader title="사용자 상세" description={readOnly ? "탈퇴 계정과 현재 보관된 건물·임차인 정보를 읽기 전용으로 확인합니다." : USER_DETAIL_DESCRIPTION} />
      <Flex justify="space-between" align="center" wrap gap={12}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push(returnPath)}>
          이전 화면으로
        </Button>
        {!readOnly && <RowActions subject={`유저 #${userId} 업무`}
          primary={<ClientLinkButton href={relatedListPath("/payments", { userId }, currentPath)}>납부 내역</ClientLinkButton>}
          items={[
            { key: "notifications", label: "알림 내역", href: relatedListPath("/notifications", { userId }, currentPath) },
            { key: "outbox", label: "알림 발송 Outbox", href: relatedListPath("/notifications/outbox", { userId }, currentPath) },
            { key: "alimtalk", label: "알림톡 내역", href: relatedListPath("/alimtalk", { userId }, currentPath) },
            { type: "divider" },
            { key: "impersonate", label: "유저 토큰 발급", icon: <UserSwitchOutlined />, onClick: () => setImpersonationOpen(true) },
          ]}
        />}
      </Flex>
      {readOnly && <Alert type="info" showIcon title="탈퇴 계정 · 보관 정보 읽기 전용"
        description="현재 남아 있는 보관 정보이며, 탈퇴 당시의 정확한 사본은 아닙니다. 탈퇴 이후 만들어진 내역은 포함하지 않습니다. 삭제된 기기 토큰과 계약서 원본은 조회할 수 없습니다." />}
      <QueryErrorAlert error={error} title="사용자 정보를 불러오지 못했습니다." onRetry={refetch} isRetrying={isFetching} hasData />
      <UserDetailCard key={`${userId}-${readOnly ? "retained" : "active"}`} user={user} returnPath={returnPath}>
      <Tabs
        activeKey={activeTab}
        onChange={(tab) => navigate({ tab })}
        items={[
          { key: "properties", label: readOnly ? "보관 건물" : "건물 목록", children: <UserPropertiesTab key={userId} userId={userId} navigation={listNavigation} readOnly={readOnly} /> },
          { key: "tenants", label: readOnly ? "보관 임차인" : "임차인 목록", children: <DeferredContentBoundary key={userId} fallback={<DeferredContentError />}><UserTenantsTab userId={userId} navigation={listNavigation} readOnly={readOnly} /></DeferredContentBoundary> },
          { key: "fcm", label: "FCM 토큰", children: <DeferredContentBoundary key={userId} fallback={<DeferredContentError />}><UserFcmTab userId={userId} navigation={listNavigation} readOnly={readOnly} /></DeferredContentBoundary> },
        ]}
      />
      </UserDetailCard>
      {!readOnly && <ImpersonationModal
        open={impersonationOpen}
        onClose={() => setImpersonationOpen(false)}
        userId={userId}
      />}
    </Space>
  );
}

export default function UserDetailPage(props: Props) {
  return <Suspense fallback={<Spin aria-label="상세 정보를 불러오는 중" />}><UserDetailPageContent {...props} /></Suspense>;
}
