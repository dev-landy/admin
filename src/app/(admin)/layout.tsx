"use client";

import { type ReactNode, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Layout, Menu, Space, Typography } from "antd";
import {
  UserOutlined,
  HomeOutlined,
  CreditCardOutlined,
  BellOutlined,
  MessageOutlined,
  DeploymentUnitOutlined,
  WarningOutlined,
  MailOutlined,
  LogoutOutlined,
} from "@ant-design/icons";

import { AuthGuard } from "@/features/auth/guard";
import { useAuth } from "@/features/auth/context";
import { EnvTag } from "@/components/EnvIndicator";
import { appEnvMeta } from "@/config/app-env";

const { Sider, Header, Content } = Layout;
const { Title, Text } = Typography;

const MENU_ITEMS = [
  { key: "/users", icon: <UserOutlined />, label: "유저 관리" },
  { key: "/tenants", icon: <HomeOutlined />, label: "임차인 관리" },
  { key: "/payments", icon: <CreditCardOutlined />, label: "납부 목록" },
  { key: "/payments/duplicates", icon: <WarningOutlined />, label: "납부 중복" },
  { key: "/notifications", icon: <BellOutlined />, label: "인앱 알림" },
  { key: "/notifications/outbox", icon: <MailOutlined />, label: "알림 Outbox" },
  { key: "/feedbacks", icon: <MessageOutlined />, label: "피드백" },
  { key: "/release-policies", icon: <DeploymentUnitOutlined />, label: "릴리즈 정책" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <AuthGuard>
      <Layout style={{ minHeight: "100vh" }}>
        <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
          <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {!collapsed && (
              <Title level={5} style={{ color: "#fff", margin: 0 }}>
                Landy Admin
              </Title>
            )}
          </div>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[pathname]}
            items={MENU_ITEMS}
            onClick={({ key }) => router.push(key)}
          />
        </Sider>
        <Layout>
          <Header
            style={{
              background: appEnvMeta.headerBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 24px",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <Space size={8}>
              <EnvTag />
              <Text type="secondary">{appEnvMeta.description}</Text>
            </Space>
            <Button icon={<LogoutOutlined />} onClick={logout}>
              로그아웃
            </Button>
          </Header>
          <Content style={{ margin: 24 }}>{children}</Content>
        </Layout>
      </Layout>
    </AuthGuard>
  );
}
