"use client";

import { type FocusEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
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
  MessageOutlined,
  SendOutlined,
  HistoryOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";

import { AuthGuard } from "@/features/auth/guard";
import { useAuth } from "@/features/auth/context";
import { EnvTag } from "@/components/EnvIndicator";
import { appEnvMeta } from "@/config/app-env";
import { NavigationGuardProvider, useNavigationGuard } from "@/components/NavigationGuard";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const MENU_LINKS = [
  { key: "/users", icon: <UserOutlined />, label: "유저 관리" },
  { key: "/properties", icon: <HomeOutlined />, label: "건물 관리" },
  { key: "/tenants", icon: <HomeOutlined />, label: "임차인 관리" },
  { key: "/contract-documents", icon: <FileTextOutlined />, label: "계약서 관리" },
  { key: "/payments", icon: <CreditCardOutlined />, label: "납부 목록" },
  { key: "/payments/duplicates", icon: <WarningOutlined />, label: "납부 중복" },
  { key: "/notifications", icon: <BellOutlined />, label: "인앱 알림" },
  { key: "/notifications/outbox", icon: <MailOutlined />, label: "알림 Outbox" },
  { key: "/fcm", icon: <SendOutlined />, label: "FCM 테스트" },
  { key: "/alimtalk", icon: <MessageOutlined />, label: "알림톡" },
  { key: "/release-policies", icon: <DeploymentUnitOutlined />, label: "릴리즈 정책" },
  { key: "/batch/schedules", icon: <ClockCircleOutlined />, label: "배치 설정" },
  { key: "/batch", icon: <HistoryOutlined />, label: "배치 실행 이력" },
];

function selectedMenuPath(pathname: string): string | undefined {
  return MENU_LINKS
    .filter(({ key }) => pathname === key || pathname.startsWith(`${key}/`))
    .sort((a, b) => b.key.length - a.key.length)[0]?.key;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <NavigationGuardProvider><AdminLayoutContent>{children}</AdminLayoutContent></NavigationGuardProvider>;
}

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, isLoggingOut } = useAuth();
  const { requestNavigation } = useNavigationGuard();
  const screens = Grid.useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const prefetchedPaths = useRef(new Set<string>());
  const selectedPath = selectedMenuPath(pathname);

  const prefetchPath = (key: string) => {
    if (key === pathname || prefetchedPaths.current.has(key)) return;
    prefetchedPaths.current.add(key);
    router.prefetch(key, { kind: PrefetchKind.AUTO, onInvalidate: () => { prefetchedPaths.current.delete(key); } });
  };
  const menuLinks = MENU_LINKS.map((item) => ({
    ...item,
    "data-route": item.key,
    onMouseEnter: () => prefetchPath(item.key),
  }));
  const menuItems = [
    { type: "group" as const, key: "rentals", label: "임대 관리", children: menuLinks.slice(0, 6) },
    { type: "group" as const, key: "messaging", label: "알림 운영", children: menuLinks.slice(6, 10) },
    { type: "group" as const, key: "system", label: "시스템 운영", children: menuLinks.slice(10) },
  ];
  const prefetchFocusedPath = (event: FocusEvent<HTMLElement>) => {
    const item = event.target instanceof Element ? event.target.closest("li[data-route]") : null;
    const key = item?.getAttribute("data-route");
    if (key && MENU_LINKS.some((link) => link.key === key)) prefetchPath(key);
  };
  useEffect(() => {
    const label = pathname.startsWith("/users/") ? "사용자 상세"
      : pathname.startsWith("/tenants/") ? "임차인 상세"
      : pathname.startsWith("/contract-documents/") ? "계약서 검수"
      : MENU_LINKS.find(({ key }) => key === selectedPath)?.label ?? "관리자";
    document.title = `${label} | [${appEnvMeta.label}] Landy Admin`;
  }, [pathname, selectedPath]);

  // useBreakpoint()는 구독이 붙기 전(SSR·첫 렌더)에 빈 객체를 반환한다. 어드민은 데스크톱이
  // 주 사용 환경이므로 값이 없을 때는 데스크톱 레이아웃을 기본값으로 둔다 — 모바일에서는
  // 하이드레이션 직후 layout effect가 값을 채워 페인트 전에 모바일 레이아웃으로 정정된다.
  const isDesktop = screens.lg ?? true;

  const navigate = (key: string) => {
    requestNavigation(() => {
      router.push(key);
      setNavOpen(false);
    });
  };

  const handleLogout = () => {
    if (isLoggingOut) return;
    requestNavigation(() => {
      setNavOpen(false);
      void logout();
    });
  };

  return (
    <AuthGuard>
      <a href="#admin-content" className="admin-skip-link">본문으로 건너뛰기</a>
      <Layout style={{ minHeight: "100dvh" }}>
        {isDesktop && (
          <Sider width={224} collapsed={collapsed} className="admin-sidebar">
            <div className="admin-sidebar-inner">
              <div className="admin-sidebar-brand">
                {collapsed ? <Text style={{ color: "#fff", fontSize: 22, fontWeight: 700 }} aria-label="Landy Admin">L</Text> : (
                  <Text strong style={{ color: "#fff", fontSize: 16 }}>
                    Landy Admin
                  </Text>
                )}
              </div>
              <nav className="admin-sidebar-nav" aria-label="관리자 메뉴" onFocusCapture={prefetchFocusedPath}>
                <Menu
                  theme="dark"
                  mode="inline"
                  selectedKeys={selectedPath ? [selectedPath] : []}
                  items={menuItems}
                  onClick={({ key }) => navigate(key)}
                />
              </nav>
              <div className="admin-sidebar-footer">
                <Button
                  type="text"
                  block
                  aria-label={collapsed ? "메뉴 펼치기" : "메뉴 접기"}
                  aria-expanded={!collapsed}
                  icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                  onClick={() => setCollapsed(!collapsed)}
                  style={{ textAlign: collapsed ? "center" : "start" }}
                >{collapsed ? null : "메뉴 접기"}</Button>
                <Button
                  type="text"
                  block
                  aria-label="로그아웃"
                  loading={isLoggingOut}
                  disabled={isLoggingOut}
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
        <Layout className="admin-shell">
          <Header
            className="admin-shell-header"
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
          <Content id="admin-content" className="admin-content" tabIndex={-1} style={{ margin: isDesktop ? 24 : 12 }}>{children}</Content>
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
                loading={isLoggingOut}
                disabled={isLoggingOut}
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                style={{ textAlign: "start" }}
              >
                로그아웃
              </Button>
            }
          >
            <nav aria-label="관리자 메뉴" onFocusCapture={prefetchFocusedPath}>
              <Menu
                mode="inline"
                selectedKeys={selectedPath ? [selectedPath] : []}
                items={menuItems}
                onClick={({ key }) => navigate(key)}
              />
            </nav>
          </Drawer>
        )}
      </Layout>
    </AuthGuard>
  );
}
