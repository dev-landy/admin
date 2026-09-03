"use client";

import { type ReactNode, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Drawer, Grid, Layout, Menu, Typography } from "antd";
import {
  UserOutlined,
  HomeOutlined,
  CreditCardOutlined,
  BellOutlined,
  DeploymentUnitOutlined,
  FileTextOutlined,
  WarningOutlined,
  MailOutlined,
  SendOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
  MenuOutlined,
} from "@ant-design/icons";

import { AuthGuard } from "@/features/auth/guard";
import { useAuth } from "@/features/auth/context";
import { EnvTag } from "@/components/EnvIndicator";
import { appEnvMeta } from "@/config/app-env";

const { Sider, Header, Content } = Layout;
const { Title, Text } = Typography;

const MENU_ITEMS = [
  { key: "/users", icon: <UserOutlined />, label: "유저 관리" },
  { key: "/properties", icon: <HomeOutlined />, label: "건물 관리" },
  { key: "/tenants", icon: <HomeOutlined />, label: "임차인 관리" },
  { key: "/contract-ocr", icon: <FileTextOutlined />, label: "계약서 관리" },
  { key: "/payments", icon: <CreditCardOutlined />, label: "납부 목록" },
  { key: "/payments/duplicates", icon: <WarningOutlined />, label: "납부 중복" },
  { key: "/notifications", icon: <BellOutlined />, label: "인앱 알림" },
  { key: "/notifications/outbox", icon: <MailOutlined />, label: "알림 Outbox" },
  { key: "/fcm", icon: <SendOutlined />, label: "FCM 테스트" },
  { key: "/release-policies", icon: <DeploymentUnitOutlined />, label: "릴리즈 정책" },
  { key: "/batch/schedules", icon: <ClockCircleOutlined />, label: "배치 설정" },
  { key: "/batch", icon: <HistoryOutlined />, label: "배치 실행 이력" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const screens = Grid.useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // useBreakpoint()는 구독이 붙기 전(SSR·첫 렌더)에 빈 객체를 반환한다. 어드민은 데스크톱이
  // 주 사용 환경이므로 값이 없을 때는 데스크톱 레이아웃을 기본값으로 둔다 — 모바일에서는
  // 하이드레이션 직후 layout effect가 값을 채워 페인트 전에 모바일 레이아웃으로 정정된다.
  const isDesktop = screens.lg ?? true;

  const navigate = (key: string) => {
    router.push(key);
    setNavOpen(false);
  };

  const handleLogout = () => {
    setNavOpen(false);
    void logout();
  };

  return (
    <AuthGuard>
      <Layout style={{ minHeight: "100vh" }}>
        {isDesktop && (
          // Sider는 트리거 높이만큼 padding-bottom을 갖는다. children을 height 100% 플렉스 컬럼으로
          // 두면 메뉴가 남는 공간을 차지하고 로그아웃이 트리거 바로 위 바닥에 고정된다.
          <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {!collapsed && (
                  <Title level={5} style={{ color: "#fff", margin: 0 }}>
                    Landy Admin
                  </Title>
                )}
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                <Menu
                  theme="dark"
                  mode="inline"
                  selectedKeys={[pathname]}
                  items={MENU_ITEMS}
                  onClick={({ key }) => navigate(key)}
                />
              </div>
              <div style={{ padding: 8 }}>
                <Button
                  type="text"
                  block
                  aria-label="로그아웃"
                  icon={<LogoutOutlined />}
                  onClick={handleLogout}
                  style={{
                    color: "rgba(255, 255, 255, 0.65)",
                    textAlign: collapsed ? "center" : "start",
                  }}
                >
                  {collapsed ? null : "로그아웃"}
                </Button>
              </div>
            </div>
          </Sider>
        )}
        <Layout>
          <Header
            style={{
              background: appEnvMeta.headerBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: isDesktop ? "0 24px" : "0 12px",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            {/* 폭이 좁으면 설명만 말줄임 처리해 햄버거가 화면 밖으로 밀리지 않게 한다. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <EnvTag />
              <Text type="secondary" ellipsis style={{ minWidth: 0 }}>
                {appEnvMeta.description}
              </Text>
            </div>
            {isDesktop ? null : (
              <Button
                type="text"
                aria-label="메뉴 열기"
                icon={<MenuOutlined />}
                onClick={() => setNavOpen(true)}
                style={{ flexShrink: 0 }}
              />
            )}
          </Header>
          <Content style={{ margin: isDesktop ? 24 : 12 }}>{children}</Content>
        </Layout>
        {isDesktop ? null : (
          <Drawer
            title="Landy Admin"
            placement="right"
            size={240}
            open={navOpen}
            onClose={() => setNavOpen(false)}
            styles={{ body: { padding: 0 } }}
            footer={
              <Button
                type="text"
                block
                aria-label="로그아웃"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{ textAlign: "start" }}
              >
                로그아웃
              </Button>
            }
          >
            <Menu
              mode="inline"
              selectedKeys={[pathname]}
              items={MENU_ITEMS}
              onClick={({ key }) => navigate(key)}
            />
          </Drawer>
        )}
      </Layout>
    </AuthGuard>
  );
}
