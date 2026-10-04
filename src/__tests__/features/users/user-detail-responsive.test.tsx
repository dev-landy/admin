import "@/test-utils/antd";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { App, ConfigProvider, Grid } from "antd";

import { UserDetailCard } from "@/features/users/components/UserDetailCard";
import type { UserDetail } from "@/features/users/types";

const mockUpdateNotify = jest.fn();
jest.mock("@/features/users/hooks", () => ({
  useUpdateUserRole: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateUserNotifySettings: () => ({ mutate: mockUpdateNotify, isPending: false }),
  useUpdateUserAlimtalkEnabled: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteUser: () => ({ mutate: jest.fn(), isPending: false }),
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));

const user: UserDetail = {
  userId: 12, provider: "KAKAO", role: "USER", status: "ONBOARDED",
  email: "landy@example.com", phone: "010-1234-5678",
  notifyDue: true, notifyOverdue: false, alimtalkEnabled: true,
  createdAt: "2026-10-04T09:00:00", updatedAt: "2026-10-04T09:00:00",
};

function Detail() {
  return <ConfigProvider theme={{ token: { motion: false } }}><App><UserDetailCard user={user} /></App></ConfigProvider>;
}

afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

test("좁은 화면에서는 라벨과 값을 별도 행에 표시하며 넓은 화면과 설정 동작을 보존한다", () => {
  const breakpoint = jest.spyOn(Grid, "useBreakpoint").mockReturnValue({ sm: true });
  const view = render(<Detail />);
  const providerRow = () => screen.getByText("가입 경로").closest("tr")!;
  expect(within(providerRow()).getByText("카카오")).toBeInTheDocument();

  breakpoint.mockReturnValue({ sm: false });
  view.rerender(<Detail />);
  expect(within(providerRow()).queryByText("카카오")).not.toBeInTheDocument();
  expect(screen.getByText("카카오").closest("tr")).not.toBe(providerRow());
  expect(screen.getByText(user.email)).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "사용자 역할" })).toBeEnabled();
  const dueSwitch = screen.getByRole("switch", { name: "납부일 알림" });
  expect(dueSwitch).toBeChecked();
  fireEvent.click(dueSwitch);
  expect(mockUpdateNotify).toHaveBeenCalledWith({ notifyDue: false }, expect.any(Object));

  breakpoint.mockReturnValue({ sm: true });
  view.rerender(<Detail />);
  expect(within(providerRow()).getByText("카카오")).toBeInTheDocument();
  expect(screen.getByText(user.email)).toBeInTheDocument();
  expect(screen.getByRole("switch", { name: "납부일 알림" })).toBeChecked();
});
