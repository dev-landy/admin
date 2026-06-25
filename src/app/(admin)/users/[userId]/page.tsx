"use client";

import { use } from "react";
import { Tabs, Spin, Typography, Space, Button } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

import { useUser } from "@/features/users/hooks";
import { UserDetailCard } from "@/features/users/components/UserDetailCard";
import { UserTenantsTab } from "@/features/users/components/UserTenantsTab";
import { UserFcmTab } from "@/features/users/components/UserFcmTab";

type Props = { params: Promise<{ userId: string }> };

export default function UserDetailPage({ params }: Props) {
  const { userId: userIdStr } = use(params);
  const userId = Number(userIdStr);
  const router = useRouter();
  const { data: user, isLoading } = useUser(userId);

  if (isLoading) {
    return <Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />;
  }

  if (!user) {
    return <Typography.Text type="secondary">유저를 찾을 수 없습니다.</Typography.Text>;
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/users")}>
        목록으로
      </Button>
      <UserDetailCard user={user} />
      <Tabs
        items={[
          { key: "tenants", label: "임차인 목록", children: <UserTenantsTab userId={userId} /> },
          { key: "fcm", label: "FCM 토큰", children: <UserFcmTab userId={userId} /> },
        ]}
      />
    </Space>
  );
}
