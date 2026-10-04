import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { UserDetailCard } from "@/features/users/components/UserDetailCard";
import type { UserDetail } from "@/features/users/types";

const mockUpdateAlimtalk = jest.fn();

jest.mock("@/features/users/hooks", () => ({
  useUpdateUserRole: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateUserNotifySettings: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateUserAlimtalkEnabled: () => ({ mutate: mockUpdateAlimtalk, isPending: false }),
  useDeleteUser: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

const user: UserDetail = {
  userId: 12,
  provider: "KAKAO",
  role: "USER",
  status: "ONBOARDED",
  notifyDue: true,
  notifyOverdue: false,
  alimtalkEnabled: true,
  email: "landy@example.com",
  phone: "010-1234-5678",
  createdAt: "2026-06-01T10:22:31",
  updatedAt: "2026-06-20T08:00:00",
};

beforeEach(() => {
  mockUpdateAlimtalk.mockReset();
});


test("세입자 알림톡 사용·중지 상태에 맞춰 양방향 변경을 요청한다", async () => {
  const view = render(<UserDetailCard user={user} />);
  expect(screen.getByText("세입자 발송 사용")).toBeInTheDocument();
  expect(screen.getByRole("switch", { name: "세입자 알림톡" })).toBeChecked();
  fireEvent.click(screen.getByRole("switch", { name: "세입자 알림톡" }));
  await waitFor(() => expect(mockUpdateAlimtalk).toHaveBeenCalledWith(false, expect.any(Object)));

  mockUpdateAlimtalk.mockClear();
  view.rerender(<UserDetailCard user={{ ...user, alimtalkEnabled: false }} />);
  expect(screen.getByText("세입자 발송 중지")).toBeInTheDocument();
  expect(screen.getByRole("switch", { name: "세입자 알림톡" })).not.toBeChecked();
  fireEvent.click(screen.getByRole("switch", { name: "세입자 알림톡" }));
  await waitFor(() => expect(mockUpdateAlimtalk).toHaveBeenCalledWith(true, expect.any(Object)));
});
