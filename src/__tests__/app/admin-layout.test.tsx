import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/users",
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock("@/features/auth/guard", () => ({
  AuthGuard: ({ children }: { children: ReactNode }) => children,
}));

const mockLogout = jest.fn();
jest.mock("@/features/auth/context", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false, logout: mockLogout }),
}));

// 브레이크포인트는 antd Grid.useBreakpoint를 갈아끼워 제어한다. jsdom의 matchMedia는
// 항상 matches:false라 responsiveObserver로는 데스크톱 상태를 만들 수 없다.
type Screens = Record<string, boolean>;

// 실제 responsiveObserver는 구독 시 모든 브레이크포인트 키를 boolean으로 채워 내려준다.
const DESKTOP_SCREENS: Screens = { xs: true, sm: true, md: true, lg: true, xl: true, xxl: false, xxxl: false };
const MOBILE_SCREENS: Screens = { xs: true, sm: false, md: false, lg: false, xl: false, xxl: false, xxxl: false };

let mockScreens: Screens = DESKTOP_SCREENS;
jest.mock("antd", () => {
  const actual = jest.requireActual("antd");
  return {
    ...actual,
    Grid: { ...actual.Grid, useBreakpoint: () => mockScreens },
  };
});

import AdminLayout from "@/app/(admin)/layout";
import { appEnvMeta } from "@/config/app-env";

function renderLayout() {
  return render(
    <AdminLayout>
      <div>본문 영역</div>
    </AdminLayout>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLogout.mockResolvedValue(undefined);
});

test("데스크톱에서는 사이드바 메뉴가 보이고 햄버거 버튼은 없다", () => {
  mockScreens = DESKTOP_SCREENS;

  const { container } = renderLayout();

  const header = container.querySelector(".ant-layout-header") as HTMLElement;

  expect(container.querySelector(".ant-layout-sider")).toBeInTheDocument();
  expect(screen.getByText("유저 관리")).toBeInTheDocument();
  expect(within(header).getByText(appEnvMeta.description)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "메뉴 열기" })).not.toBeInTheDocument();
  expect(screen.getByText("본문 영역")).toBeInTheDocument();
});

test("데스크톱에서는 로그아웃이 헤더가 아니라 사이드바 하단에 있다", () => {
  mockScreens = DESKTOP_SCREENS;

  const { container } = renderLayout();

  const sider = container.querySelector(".ant-layout-sider") as HTMLElement;
  const header = container.querySelector(".ant-layout-header") as HTMLElement;
  const logoutButton = within(sider).getByRole("button", { name: "로그아웃" });

  expect(within(header).queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument();

  fireEvent.click(logoutButton);

  expect(mockLogout).toHaveBeenCalledTimes(1);
});

test("모바일에서는 헤더에 햄버거 버튼이 있고 사이드바 메뉴는 렌더링되지 않는다", () => {
  mockScreens = MOBILE_SCREENS;

  const { container } = renderLayout();

  const header = container.querySelector(".ant-layout-header") as HTMLElement;

  expect(container.querySelector(".ant-layout-sider")).not.toBeInTheDocument();
  expect(within(header).getByRole("button", { name: "메뉴 열기" })).toBeInTheDocument();
  expect(within(header).getByText(appEnvMeta.description)).toBeInTheDocument();
  expect(within(header).queryByText("Landy Admin")).not.toBeInTheDocument();
  expect(screen.queryByText("유저 관리")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "로그아웃" })).not.toBeInTheDocument();
});

test("모바일에서 햄버거를 누르면 드로어에 메뉴와 로그아웃이 열린다", async () => {
  mockScreens = MOBILE_SCREENS;

  renderLayout();
  fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));

  const drawer = (await screen.findByText("유저 관리")).closest(".ant-drawer") as HTMLElement;

  expect(within(drawer).getByText("배치 실행 이력")).toBeInTheDocument();
  expect(within(drawer).getByRole("button", { name: "로그아웃" })).toBeInTheDocument();
  expect(document.querySelector(".ant-drawer-open")).toBeInTheDocument();
});

test("드로어에서 메뉴를 고르면 해당 경로로 이동하고 드로어가 닫힌다", async () => {
  mockScreens = MOBILE_SCREENS;

  renderLayout();
  fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
  fireEvent.click(await screen.findByText("납부 목록"));

  expect(mockPush).toHaveBeenCalledWith("/payments");
  await waitFor(() => {
    expect(document.querySelector(".ant-drawer-open")).not.toBeInTheDocument();
  });
});

test("드로어에서 로그아웃을 누르면 로그아웃되고 드로어가 닫힌다", async () => {
  mockScreens = MOBILE_SCREENS;

  renderLayout();
  fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
  fireEvent.click(await screen.findByRole("button", { name: "로그아웃" }));

  expect(mockLogout).toHaveBeenCalledTimes(1);
  await waitFor(() => {
    expect(document.querySelector(".ant-drawer-open")).not.toBeInTheDocument();
  });
});
