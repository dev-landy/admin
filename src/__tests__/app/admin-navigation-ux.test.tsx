import "@/test-utils/antd";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

let mockPathname = "/users/1";
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname, useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }) }));
jest.mock("@/features/auth/guard", () => ({ AuthGuard: ({ children }: { children: ReactNode }) => children }));
jest.mock("@/features/auth/context", () => ({ useAuth: () => ({ logout: jest.fn() }) }));
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: jest.fn(() => "wide") }));
import { useAdminViewport } from "@/components/useAdminViewport";
beforeEach(() => jest.mocked(useAdminViewport).mockReturnValue("wide"));
import AdminLayout from "@/app/(admin)/layout";

test.each([
  ["/users/1", "유저 관리"], ["/tenants/9", "임차인 관리"], ["/contract-documents/document-1", "계약서 관리"],
  ["/payments/duplicates", "납부 중복"], ["/notifications/outbox", "알림 Outbox"], ["/batch/schedules", "배치 설정"],
])("route %s keeps the most specific navigation item selected", async (path, label) => {
  mockPathname = path;
  const { container } = render(<AdminLayout><h1>상세 화면</h1></AdminLayout>);
  await act(async () => { await Promise.resolve(); });
  expect(container.querySelectorAll(".ant-menu-item-selected")).toHaveLength(1);
  expect(container.querySelector(".ant-menu-item-selected")).toHaveTextContent(label);
});

test("중간 화면은 메뉴 레일을 기본으로 제공하고 모바일은 메뉴를 열어 경로를 선택한다", async () => {
  jest.mocked(useAdminViewport).mockReturnValue("compact");
  const view = render(<AdminLayout><h1>본문</h1></AdminLayout>);
  expect(screen.getByRole("button", { name: "메뉴 펼치기" })).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(screen.getByRole("button", { name: "메뉴 펼치기" }));
  expect(screen.getByRole("button", { name: "메뉴 접기" })).toHaveAttribute("aria-expanded", "true");
  jest.mocked(useAdminViewport).mockReturnValue("mobile");
  view.rerender(<AdminLayout><h1>본문</h1></AdminLayout>);
  expect(screen.queryByRole("navigation", { name: "관리자 메뉴" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
  expect(await screen.findByRole("navigation", { name: "관리자 메뉴" })).toBeVisible();
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
