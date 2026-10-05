import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import UsersPage from "@/app/(admin)/users/page";
import { UserDetailCard } from "@/features/users/components/UserDetailCard";
import type { UserDetail, UserSummary, UsersListParams } from "@/features/users/types";

let mockQuery = "";
let mockUsers: UserSummary[] = [];
const mockPush = jest.fn();
const mockUseUsers = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockQuery),
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));
jest.mock("@/features/users/hooks", () => ({
  useUsers: (params: UsersListParams) => {
    mockUseUsers(params);
    return { data: { users: mockUsers, totalElements: mockUsers.length }, isLoading: false, isFetching: false, error: null, refetch: jest.fn() };
  },
  useDeleteUser: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpdateUserRole: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateUserNotifySettings: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateUserAlimtalkEnabled: () => ({ mutate: jest.fn(), isPending: false }),
}));

const appleUser: UserDetail = {
  userId: 12, provider: "APPLE", role: "USER", status: "ONBOARDED",
  email: "apple@example.com", phone: null,
  notifyDue: true, notifyOverdue: false, alimtalkEnabled: true,
  createdAt: "2026-10-04T09:00:00", updatedAt: "2026-10-04T09:00:00",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery = "";
  mockUsers = [];
});

test("애플 가입 경로 URL을 API 필터로 보존하고 목록에 애플로 표시한다", () => {
  mockQuery = "provider=APPLE";
  mockUsers = [appleUser];
  render(<UsersPage />);
  expect(mockUseUsers).toHaveBeenLastCalledWith(expect.objectContaining({ provider: "APPLE" }));
  expect(screen.getByRole("row", { name: /12.*애플/ })).toBeInTheDocument();
  expect(screen.queryByText("구글")).not.toBeInTheDocument();
});

test("상단 필터에서 애플을 선택해 조회한다", async () => {
  render(<UsersPage />);
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "가입 경로" }));
  fireEvent.click(await screen.findByText("애플"));
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(mockPush).toHaveBeenCalled());
  const params = new URLSearchParams(mockPush.mock.calls[0][0]);
  expect(params.get("provider")).toBe("APPLE");
});

test("애플 가입자의 상세 정보는 구글로 오표기하지 않는다", () => {
  render(<UserDetailCard user={appleUser} />);
  expect(screen.getByText("애플")).toBeInTheDocument();
  expect(screen.queryByText("구글")).not.toBeInTheDocument();
});
