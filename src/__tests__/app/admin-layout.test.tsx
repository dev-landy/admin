import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const mockPush = jest.fn();
const mockPrefetch = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/users",
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: mockPrefetch }),
}));

jest.mock("@/features/auth/guard", () => ({
  AuthGuard: ({ children }: { children: ReactNode }) => children,
}));

const mockLogout = jest.fn();
let mockIsLoggingOut = false;
jest.mock("@/features/auth/context", () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false, isLoggingOut: mockIsLoggingOut, logout: mockLogout }),
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
import { useUnsavedChanges } from "@/components/NavigationGuard";

function GuardedContent({ dirty }: { dirty: boolean }) {
  useUnsavedChanges(dirty);
  return <div>본문 영역</div>;
}

async function renderLayout(dirty = false) {
  // 메뉴가 key 등록을 Promise로 배치하므로 실제 초기화가 끝난 뒤 상호작용한다.
  await act(async () => {
    render(
      <AdminLayout>
        <GuardedContent dirty={dirty} />
      </AdminLayout>,
    );
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsLoggingOut = false;
  jest.spyOn(window, "confirm").mockReturnValue(false);
  mockLogout.mockResolvedValue(undefined);
});
afterEach(() => jest.restoreAllMocks());

test("작성 중 데스크톱 사이드바 이동은 취소하거나 확인 후 이동할 수 있다", async () => {
  mockScreens = DESKTOP_SCREENS;
  await renderLayout(true);
  expect(screen.getByText(appEnvMeta.description)).toBeInTheDocument();
  fireEvent.click(screen.getByText("건물 관리"));
  expect(window.confirm).toHaveBeenCalledTimes(1);
  expect(mockPush).not.toHaveBeenCalled();
  jest.mocked(window.confirm).mockReturnValue(true);
  fireEvent.click(screen.getByText("건물 관리"));
  expect(mockPush).toHaveBeenCalledWith("/properties");
});

test("메뉴는 처음에 미리 내려받지 않고 hover 또는 키보드 focus 대상만 한 번 준비한다", async () => {
  mockScreens = DESKTOP_SCREENS;
  await renderLayout();
  expect(mockPrefetch).not.toHaveBeenCalled();
  const properties = screen.getByRole("menuitem", { name: /건물 관리/ });
  fireEvent.mouseEnter(properties);
  fireEvent.focus(properties);
  expect(mockPrefetch).toHaveBeenCalledTimes(1);
  expect(mockPrefetch).toHaveBeenCalledWith("/properties", expect.objectContaining({ onInvalidate: expect.any(Function) }));
  fireEvent.focus(screen.getByRole("menuitem", { name: /임차인 관리/ }));
  expect(mockPrefetch).toHaveBeenCalledTimes(2);
  fireEvent.mouseEnter(screen.getByRole("menuitem", { name: /유저 관리/ }));
  expect(mockPrefetch).toHaveBeenCalledTimes(2);
});

test("작성 중 모바일 메뉴 이동을 취소하면 드로어와 현재 화면을 유지한다", async () => {
  mockScreens = MOBILE_SCREENS;
  await renderLayout(true);
  fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
  expect(await screen.findByRole("button", { name: "로그아웃" })).toBeInTheDocument();
  fireEvent.click(await screen.findByText("납부 목록"));
  expect(mockPush).not.toHaveBeenCalled();
  expect(document.querySelector(".ant-drawer-open")).toBeInTheDocument();
  jest.mocked(window.confirm).mockReturnValue(true);
  fireEvent.click(screen.getByText("납부 목록"));
  expect(mockPush).toHaveBeenCalledWith("/payments");
  await waitFor(() => expect(document.querySelector(".ant-drawer-open")).not.toBeInTheDocument());
});

test("데스크톱의 로그아웃 동작을 인증 provider에 전달한다", async () => {
  mockScreens = DESKTOP_SCREENS;
  await renderLayout();
  fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));
  expect(mockLogout).toHaveBeenCalledTimes(1);
});

test("로그아웃 요청 중에는 표시된 버튼이 잠기고 재요청하지 않는다", async () => {
  mockScreens = DESKTOP_SCREENS;
  mockIsLoggingOut = true;
  await renderLayout();
  const logout = screen.getByRole("button", { name: "로그아웃" });
  expect(logout).toBeDisabled();
  fireEvent.click(logout);
  expect(mockLogout).not.toHaveBeenCalled();
});

test("드로어에서 로그아웃을 누르면 로그아웃되고 드로어가 닫힌다", async () => {
  mockScreens = MOBILE_SCREENS;

  await renderLayout();
  fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
  fireEvent.click(await screen.findByRole("button", { name: "로그아웃" }));

  expect(mockLogout).toHaveBeenCalledTimes(1);
  await waitFor(() => {
    expect(document.querySelector(".ant-drawer-open")).not.toBeInTheDocument();
  });
});
