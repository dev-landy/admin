"use client";

import { use, useState } from "react";
import { Tabs, Spin, Typography, Space, Button, Flex } from "antd";
import { ArrowLeftOutlined, UserSwitchOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

import { useUser } from "@/features/users/hooks";
import { UserDetailCard } from "@/features/users/components/UserDetailCard";
import { UserTenantsTab } from "@/features/users/components/UserTenantsTab";
import { UserFcmTab } from "@/features/users/components/UserFcmTab";
import { ImpersonationModal } from "@/features/users/components/ImpersonationModal";
import { UserPropertiesTab } from "@/features/properties/components/UserPropertiesTab";

type Props = { params: Promise<{ userId: string }> };

export default function UserDetailPage({ params }: Props) {
  const { userId: userIdStr } = use(params);
  const userId = Number(userIdStr);
  const router = useRouter();
  const { data: user, isLoading } = useUser(userId);
  const [impersonationOpen, setImpersonationOpen] = useState(false);

  if (isLoading) {
    return <Spin size="large" style={{ display: "block", textAlign: "center", marginTop: 80 }} />;
  }

  if (!user) {
    return <Typography.Text type="secondary">유저를 찾을 수 없습니다.</Typography.Text>;
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Flex justify="space-between" align="center">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.push("/users")}>
          목록으로
        </Button>
        <Button icon={<UserSwitchOutlined />} onClick={() => setImpersonationOpen(true)}>
          유저 토큰 발급
        </Button>
      </Flex>
      <UserDetailCard user={user} />
      <Tabs
        items={[
          { key: "properties", label: "건물 목록", children: <UserPropertiesTab userId={userId} /> },
          { key: "tenants", label: "임차인 목록", children: <UserTenantsTab userId={userId} /> },
          { key: "fcm", label: "FCM 토큰", children: <UserFcmTab userId={userId} /> },
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
