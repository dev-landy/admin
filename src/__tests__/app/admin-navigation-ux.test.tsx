import "@/test-utils/antd";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { Grid } from "antd";

let mockPathname = "/users/1";
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname, useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }) }));
jest.mock("@/features/auth/guard", () => ({ AuthGuard: ({ children }: { children: ReactNode }) => children }));
jest.mock("@/features/auth/context", () => ({ useAuth: () => ({ logout: jest.fn() }) }));
let mockDesktop = true;
beforeEach(() => {
  mockDesktop = true;
  jest.spyOn(Grid, "useBreakpoint").mockImplementation(() => ({ xl: mockDesktop }));
});
afterEach(() => jest.restoreAllMocks());
import AdminLayout from "@/app/(admin)/layout";

test.each([
  ["/", "홈"],
  ["/users/1", "유저 관리"], ["/tenants/9", "임차인 관리"], ["/contract-documents/document-1", "계약서 관리"],
  ["/payments/duplicates", "납부 중복"], ["/notifications/outbox", "알림 Outbox"], ["/batch/schedules", "배치 설정"],
])("route %s keeps the most specific navigation item selected", async (path, label) => {
  mockPathname = path;
  const { container } = render(<AdminLayout><h1>상세 화면</h1></AdminLayout>);
  await act(async () => { await Promise.resolve(); });
  expect(container.querySelectorAll(".ant-menu-item-selected")).toHaveLength(1);
  expect(container.querySelector(".ant-menu-item-selected")).toHaveTextContent(label);
});

test("펼친 모바일과 작은 화면은 헤더 메뉴를 쓰며 데스크톱 전환 뒤에는 이전 드로어를 다시 열지 않는다", async () => {
  mockDesktop = false;
  const view = render(<AdminLayout><h1>본문</h1></AdminLayout>);
  expect(screen.queryByRole("navigation", { name: "관리자 메뉴" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
  expect(await screen.findByRole("navigation", { name: "관리자 메뉴" })).toBeVisible();
  mockDesktop = true;
  view.rerender(<AdminLayout><h1>본문</h1></AdminLayout>);
  expect(screen.queryByRole("button", { name: "메뉴 열기" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "메뉴 접기" })).toBeInTheDocument();
  mockDesktop = false;
  view.rerender(<AdminLayout><h1>본문</h1></AdminLayout>);
  expect(screen.queryByRole("navigation", { name: "관리자 메뉴" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "메뉴 열기" })).toBeInTheDocument();
});

test("keyboard users can bypass navigation and toggle the sidebar", async () => {
  render(<AdminLayout><h1>본문</h1></AdminLayout>);
  await act(async () => { await Promise.resolve(); });
  const main = screen.getByRole("main");
  expect(main).toHaveAttribute("id", "admin-content");
  expect(main).toHaveAttribute("tabindex", "-1");
  expect(screen.getByRole("link", { name: "본문으로 건너뛰기" })).toHaveAttribute("href", "#admin-content");
  const brand = screen.getByRole("img", { name: "랜디 관리자" });
  const house = brand.firstElementChild;
  const wordmark = brand.lastElementChild;
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "메뉴 접기" })); });
  expect(screen.getByRole("button", { name: "메뉴 펼치기" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("img", { name: "랜디 관리자" })).toBe(brand);
  expect(brand.firstElementChild).toBe(house);
  expect(brand.lastElementChild).toBe(wordmark);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "메뉴 펼치기" })); });
  expect(screen.getByRole("button", { name: "메뉴 접기" })).toHaveAttribute("aria-expanded", "true");
  expect(brand.firstElementChild).toBe(house);
  expect(brand.lastElementChild).toBe(wordmark);
});
