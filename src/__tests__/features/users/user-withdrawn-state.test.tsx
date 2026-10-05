import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";

import { useAdminViewport } from "@/components/useAdminViewport";
import { UserTable } from "@/features/users/components/UserTable";
import type { UserSummary } from "@/features/users/types";

const mockPush = jest.fn();
const mockDelete = jest.fn();
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: jest.fn(() => "wide") }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/features/users/hooks", () => ({ useDeleteUser: () => ({ mutateAsync: mockDelete, isPending: false }) }));
const viewport = jest.mocked(useAdminViewport);

const active: UserSummary = {
  userId: 12, email: "active@example.test", phone: "010-1234-5678", provider: "KAKAO",
  role: "USER", status: "ONBOARDED", createdAt: "2026-09-01T09:00:00", deletedAt: null, fcmPlatforms: ["ANDROID", "IOS"],
};
const withdrawn: UserSummary = {
  ...active, userId: 13, email: "withdrawn@example.test", deletedAt: "2026-10-05T15:42:09", fcmPlatforms: [],
};
const legacy: UserSummary = {
  userId: 14, email: "legacy@example.test", phone: null, provider: "APPLE", role: "USER", status: "DRAFT", createdAt: "2026-09-02T09:00:00",
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <ConfigProvider theme={{ token: { motion: false } }}><App>{children}</App></ConfigProvider>;
}
beforeEach(() => jest.clearAllMocks());

test.each(["wide", "compact", "mobile"] as const)("%s 목록은 탈퇴와 가입 진행을 구분하고 탈퇴 계정에는 읽기 전용 상세만 제공한다", async (mode) => {
  viewport.mockReturnValue(mode);
  const returnPath = "/users?keyword=example&page=2";
  render(<UserTable data={[active, withdrawn, legacy]} loading={false} page={2} pageSize={20} total={23}
    filters={{}} onFilterChange={jest.fn()} onPageChange={jest.fn()} returnPath={returnPath} />, { wrapper });
  const record = (user: UserSummary) => mode === "mobile"
    ? screen.getByRole("article", { name: `유저 #${user.userId} ${user.email}` })
    : screen.getByRole("row", { name: new RegExp(user.email.replaceAll(".", "\\.")) });
  const retired = record(withdrawn);
  expect(within(retired).getByText("탈퇴", { exact: true })).toBeVisible();
  expect(within(retired).queryByText("온보딩 완료")).not.toBeInTheDocument();
  expect(within(retired).getByText(mode === "mobile" ? "2026년 10월 5일" : "탈퇴일 2026년 10월 5일")).toBeVisible();
  if (mode === "mobile") expect(within(retired).getByText("탈퇴일", { exact: true })).toBeVisible();
  expect(within(retired).getAllByRole("button")).toHaveLength(1);
  expect(within(retired).getByRole("button", { name: "상세" })).toBeVisible();
  expect(within(retired).queryByRole("link")).not.toBeInTheDocument();
  expect(within(retired).getByText("미확인", { exact: true })).toBeVisible();
  fireEvent.click(retired);
  fireEvent.keyDown(retired, { key: "Enter" });
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
  fireEvent.click(within(retired).getByRole("button", { name: "상세" }));
  expect(mockPush).toHaveBeenCalledWith(`/users/13?returnTo=${encodeURIComponent(returnPath)}`);
  expect(within(retired).queryByRole("button", { name: /더보기/ })).not.toBeInTheDocument();

  const current = record(active);
  expect(within(current).getByText("온보딩 완료")).toBeVisible();
  expect(within(current).queryByText(/^탈퇴일/)).not.toBeInTheDocument();
  expect(within(current).queryByText("탈퇴", { exact: true })).not.toBeInTheDocument();
  expect(within(record(legacy)).getByText("생성중")).toBeVisible();
  expect(within(record(legacy)).getByRole("button", { name: "상세" })).toBeVisible();
  fireEvent.click(within(current).getByRole("button", { name: "상세" }));
  expect(mockPush).toHaveBeenCalledWith(`/users/12?returnTo=${encodeURIComponent(returnPath)}`);
  fireEvent.click(within(current).getByRole("button", { name: "유저 #12 더보기" }));
  const payments = new URL((await screen.findByRole("link", { name: "납부 내역" })).getAttribute("href")!, "https://landy.internal");
  expect(payments.pathname).toBe("/payments");
  expect(payments.searchParams.get("userId")).toBe("12");
  expect(payments.searchParams.get("returnTo")).toBe(returnPath);
  expect(screen.getByRole("link", { name: "알림 내역" })).toHaveAttribute("href", expect.stringContaining("userId=12"));
  await waitFor(() => expect(screen.getByRole("menuitem", { name: "사용자 삭제" })).toBeVisible());
  expect(mockDelete).not.toHaveBeenCalled();
});
