import "@/test-utils/antd";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

let mockPathname = "/users/1";
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname, useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }) }));
jest.mock("@/features/auth/guard", () => ({ AuthGuard: ({ children }: { children: ReactNode }) => children }));
jest.mock("@/features/auth/context", () => ({ useAuth: () => ({ logout: jest.fn() }) }));
jest.mock("antd", () => {
  const antd = jest.requireActual("antd");
  return { ...antd, Grid: { ...antd.Grid, useBreakpoint: () => ({ lg: true }) } };
});
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

test("keyboard users can bypass navigation and toggle the sidebar", async () => {
  render(<AdminLayout><h1>본문</h1></AdminLayout>);
  await act(async () => { await Promise.resolve(); });
  const main = screen.getByRole("main");
  expect(main).toHaveAttribute("id", "admin-content");
  expect(main).toHaveAttribute("tabindex", "-1");
  expect(screen.getByRole("link", { name: "본문으로 건너뛰기" })).toHaveAttribute("href", "#admin-content");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "메뉴 접기" })); });
  expect(screen.getByRole("button", { name: "메뉴 펼치기" })).toHaveAttribute("aria-expanded", "false");
});
