"use client";

import { type FocusEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { Button, Drawer, Grid, Layout, Menu, Typography } from "antd";
import {
  UserOutlined,
  HomeOutlined,
  TeamOutlined,
  BellOutlined,
  RocketOutlined,
  FileTextOutlined,
  WarningOutlined,
  InboxOutlined,
  MessageOutlined,
  ExperimentOutlined,
  HistoryOutlined,
  ScheduleOutlined,
  PoweroffOutlined,
  MenuOutlined,
  DoubleLeftOutlined,
} from "@ant-design/icons";

import { AuthGuard } from "@/features/auth/guard";
import { useAuth } from "@/features/auth/context";
import { EnvTag } from "@/components/EnvIndicator";
import { appEnvMeta } from "@/config/app-env";
import { ThemeSelector } from "@/components/ThemeSelector";
import { BrandLogo } from "@/components/BrandLogo";
import { ReceiptIcon } from "@/components/ReceiptIcon";
import { useTheme } from "@/components/ThemeProvider";
import { NavigationGuardProvider, useNavigationGuard } from "@/components/NavigationGuard";
import { useAdminViewport } from "@/components/useAdminViewport";
import { useSidebarPreference } from "@/components/SidebarPreference";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const MENU_LINKS = [
  { key: "/users", icon: <UserOutlined />, label: "유저 관리" },
  { key: "/properties", icon: <HomeOutlined />, label: "건물 관리" },
  { key: "/tenants", icon: <TeamOutlined />, label: "임차인 관리" },
  { key: "/contract-documents", icon: <FileTextOutlined />, label: "계약서 관리" },
  { key: "/payments", icon: <ReceiptIcon />, label: "납부 목록" },
  { key: "/payments/duplicates", icon: <WarningOutlined />, label: "납부 중복" },
  { key: "/notifications", icon: <BellOutlined />, label: "인앱 알림" },
  { key: "/notifications/outbox", icon: <InboxOutlined />, label: "알림 Outbox" },
  { key: "/fcm", icon: <ExperimentOutlined />, label: "FCM 테스트" },
  { key: "/alimtalk", icon: <MessageOutlined />, label: "알림톡" },
  { key: "/release-policies", icon: <RocketOutlined />, label: "릴리즈 정책" },
  { key: "/batch/schedules", icon: <ScheduleOutlined />, label: "배치 설정" },
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
  const { resolved } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { logout, isLoggingOut, isAuthenticated } = useAuth();
  const { requestNavigation } = useNavigationGuard();
  const viewport = useAdminViewport();
  const screens = Grid.useBreakpoint();
  const [collapsedOverride, setCollapsedOverride] = useSidebarPreference();
  const collapsed = collapsedOverride ?? (viewport === "compact" && !(screens.xl ?? true));
  const [navOpen, setNavOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);
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
    { type: "group" as const, key: "rentals", label: "서비스 관리", children: menuLinks.slice(0, 6) },
    { type: "group" as const, key: "messaging", label: "알림 관리", children: menuLinks.slice(6, 10) },
    { type: "group" as const, key: "system", label: "시스템 관리", children: menuLinks.slice(10) },
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

  const isDesktop = viewport !== "mobile";
  useEffect(() => {
    if (!isDesktop && !navOpen) return;
    nav.current?.querySelector<HTMLElement>(".ant-menu-item-selected")?.scrollIntoView?.({ block: "nearest" });
  }, [selectedPath, collapsed, isDesktop, navOpen, isAuthenticated]);

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
          <Sider width={224} collapsedWidth={80} collapsed={collapsed} trigger={null} className="admin-sidebar">
            <div className="admin-sidebar-inner">
              <div className="admin-sidebar-brand">
                <BrandLogo compact={collapsed} />
              </div>
              <nav ref={nav} className="admin-sidebar-nav" aria-label="관리자 메뉴" onFocusCapture={prefetchFocusedPath}>
                <Menu
                  theme={resolved}
                  mode="inline"
                  inlineCollapsed={collapsed}
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
                  icon={<DoubleLeftOutlined className="admin-sidebar-toggle-icon" />}
                  onClick={() => setCollapsedOverride(!collapsed)}
                ><span className="admin-sidebar-footer-label">메뉴 접기</span></Button>
                <Button
                  type="text"
                  block
                  aria-label="로그아웃"
                  loading={isLoggingOut}
                  disabled={isLoggingOut}
                  icon={<PoweroffOutlined />}
                  onClick={handleLogout}
                >
                  <span className="admin-sidebar-footer-label">로그아웃</span>
                </Button>
              </div>
            </div>
          </Sider>
        )}
        <Layout className="admin-shell">
          <Header
            className="admin-shell-header"
            style={{
              height: 64,
              lineHeight: "normal",
              background: "var(--admin-env-header)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: isDesktop ? "0 24px" : "0 12px",
              borderBottom: "1px solid var(--admin-border)",
            }}
          >
            {/* 폭이 좁으면 설명만 말줄임 처리해 햄버거가 화면 밖으로 밀리지 않게 한다. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <EnvTag />
              <Text className="admin-header-environment-description" type="secondary" ellipsis style={{ minWidth: 0 }}>
                {appEnvMeta.description}
              </Text>
            </div>
            <div className="admin-header-controls"><ThemeSelector />
            {isDesktop ? null : (
              <Button
                type="text"
                aria-label="메뉴 열기"
                icon={<MenuOutlined />}
                onClick={() => setNavOpen(true)}
                style={{ flexShrink: 0 }}
              />
            )}</div>
          </Header>
          <Content id="admin-content" className="admin-content" tabIndex={-1} style={{ margin: isDesktop ? 24 : 12 }}>{children}</Content>
        </Layout>
        {isDesktop ? null : (
          <Drawer
            title={<BrandLogo />}
            placement="right"
            closable={{ placement: "end" }}
            size="min(240px, calc(100vw - 32px))"
            open={navOpen}
            onClose={() => setNavOpen(false)}
            styles={{
              header: { height: 64, minHeight: 64, boxSizing: "border-box", padding: "0 16px", gap: 8 },
              title: { display: "flex", alignItems: "center", minWidth: 0 },
              close: { margin: 0, flexShrink: 0 },
              body: { padding: 0 },
            }}
            footer={
              <Button
                type="text"
                block
                aria-label="로그아웃"
                loading={isLoggingOut}
                disabled={isLoggingOut}
                icon={<PoweroffOutlined />}
                onClick={handleLogout}
                style={{ justifyContent: "flex-start", gap: 10 }}
              >
                로그아웃
              </Button>
            }
          >
            <nav ref={nav} aria-label="관리자 메뉴" onFocusCapture={prefetchFocusedPath}>
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
