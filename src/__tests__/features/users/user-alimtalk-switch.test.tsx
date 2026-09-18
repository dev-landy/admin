import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { UserDetailCard } from "@/features/users/components/UserDetailCard";
import type { UserDetail } from "@/features/users/types";

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

test("세입자 알림톡 사용 상태를 보여준다", () => {
  render(<UserDetailCard user={user} />);

  expect(screen.getByText("세입자 발송 사용")).toBeInTheDocument();
});

test("스위치를 내리면 끄는 요청을 보낸다", async () => {
  render(<UserDetailCard user={user} />);

  const switches = screen.getAllByRole("switch");
  fireEvent.click(switches[switches.length - 1]);

  await waitFor(() => {
    expect(mockUpdateAlimtalk).toHaveBeenCalledWith(false, expect.any(Object));
  });
});

test("꺼진 계정은 상태를 그대로 드러낸다", () => {
  render(<UserDetailCard user={{ ...user, alimtalkEnabled: false }} />);

  expect(screen.getByText("세입자 발송 중지")).toBeInTheDocument();
});
