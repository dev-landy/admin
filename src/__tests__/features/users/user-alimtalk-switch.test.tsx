import "@/test-utils/antd";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App, ConfigProvider } from "antd";

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


test.each([
  { enabled: true, nextEnabled: false, state: "세입자 발송 사용", feedback: "세입자 알림톡을 껐습니다. 임차인별 설정과 무관하게 전부 멈춥니다." },
  { enabled: false, nextEnabled: true, state: "세입자 발송 중지", feedback: "세입자 알림톡을 켰습니다. 임차인별 설정을 켜야 실제로 나갑니다." },
])("세입자 알림톡 $state 상태에서 변경 요청과 성공 안내를 표시한다", async ({ enabled, nextEnabled, state, feedback }) => {
  mockUpdateAlimtalk.mockImplementation((_enabled: boolean, options: { onSuccess: () => void }) => options.onSuccess());
  // 실제 App 알림 컨텍스트를 사용하고 jsdom이 실행할 수 없는 CSS 모션만 끈다.
  render(<ConfigProvider theme={{ token: { motion: false } }}><App><UserDetailCard user={{ ...user, alimtalkEnabled: enabled }} /></App></ConfigProvider>);
  expect(screen.getByText(state)).toBeInTheDocument();
  const toggle = screen.getByRole("switch", { name: "세입자 알림톡" });
  expect(toggle).toHaveAttribute("aria-checked", String(enabled));
  fireEvent.click(toggle);
  await waitFor(() => expect(mockUpdateAlimtalk).toHaveBeenCalledTimes(1));
  expect(mockUpdateAlimtalk).toHaveBeenCalledWith(nextEnabled, {
    onSuccess: expect.any(Function), onError: expect.any(Function),
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(feedback);
});
