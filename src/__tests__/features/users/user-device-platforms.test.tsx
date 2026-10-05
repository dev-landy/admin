import "@/test-utils/antd";
import { render, screen, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";

import { useAdminViewport } from "@/components/useAdminViewport";
import { UserDevicePlatforms } from "@/features/users/components/UserDevicePlatforms";
import { UserTable } from "@/features/users/components/UserTable";
import type { UserSummary } from "@/features/users/types";

jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: jest.fn(() => "wide") }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/features/users/hooks", () => ({ useDeleteUser: () => ({ mutateAsync: jest.fn(), isPending: false }) }));

const mockViewport = jest.mocked(useAdminViewport);
const user: UserSummary = {
  userId: 12, email: "landy@example.com", phone: "010-1234-5678", provider: "KAKAO",
  role: "USER", status: "ONBOARDED", createdAt: "2026-10-05T09:00:00",
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <ConfigProvider theme={{ token: { motion: false } }}><App>{children}</App></ConfigProvider>;
}

test.each([
  [undefined, ["미확인"]],
  [null, ["미확인"]],
  [[], ["미확인"]],
  [["ANDROID", "ANDROID"], ["Android"]],
  [["IOS"], ["iOS"]],
  [["IOS", "ANDROID", "IOS"], ["Android", "iOS"]],
  [["WEB", null], ["미확인"]],
  [["IOS", "UNKNOWN", null], ["iOS", "미확인"]],
] as const)("FCM 플랫폼 %p은 각 OS를 별도 라벨로 중복 없이 표시하고 불명확한 값은 미확인으로 보존한다", (platforms, expected) => {
  render(<UserDevicePlatforms platforms={platforms} />);
  for (const label of ["Android", "iOS", "미확인"] as const) {
    const matches = screen.queryAllByText(label, { exact: true });
    expect(matches).toHaveLength(expected.some((expectedLabel) => expectedLabel === label) ? 1 : 0);
    for (const match of matches) expect(match).toBeVisible();
  }
  const labels = expected.map((label) => screen.getByText(label, { exact: true }));
  for (let index = 1; index < labels.length; index += 1) {
    expect(labels[index - 1].compareDocumentPosition(labels[index]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
});

test.each(["mobile", "compact", "wide"] as const)("%s 유저 조회에서 OS와 가입일을 펼침 없이 항상 읽고 로그인 제공자에서 OS를 추론하지 않는다", (viewport) => {
  mockViewport.mockReturnValue(viewport);
  const registeredUser: UserSummary = { ...user, fcmPlatforms: ["IOS", "ANDROID", "ANDROID"] };
  const noDeviceUser: UserSummary = { ...user, userId: 13, email: "apple@example.com", provider: "APPLE", fcmPlatforms: [] };
  const legacyUser: UserSummary = { ...user, userId: 14, email: "legacy@example.com", provider: "GOOGLE" };
  render(<UserTable data={[registeredUser, noDeviceUser, legacyUser]} loading={false} page={1} pageSize={20} total={3}
    filters={{}} onFilterChange={jest.fn()} onPageChange={jest.fn()} />, { wrapper });

  for (const [entry, osLabels] of [[registeredUser, ["Android", "iOS"]], [noDeviceUser, ["미확인"]], [legacyUser, ["미확인"]]] as const) {
    const record = viewport === "mobile"
      ? screen.getByRole("article", { name: `유저 #${entry.userId} ${entry.email}` })
      : screen.getByRole("row", { name: new RegExp(entry.email.replaceAll(".", "\\.")) });
    for (const label of osLabels) {
      const matches = within(record).getAllByText(label, { exact: true });
      expect(matches).toHaveLength(1);
      expect(matches[0]).toBeVisible();
    }
    if (viewport === "compact") expect(within(record).getByText("기기 OS:")).toBeVisible();
    if (viewport === "mobile") expect(within(record).getByText("기기 OS")).toBeVisible();
    expect(within(record).getByText(viewport === "compact" ? "가입일 2026년 10월 5일" : "2026년 10월 5일")).toBeVisible();
    expect(within(record).queryByRole("button", { name: /펼치기|Expand/ })).not.toBeInTheDocument();
    expect(within(record).queryByText("추가 정보")).not.toBeInTheDocument();
  }
  if (viewport === "wide") expect(screen.getByRole("columnheader", { name: "기기 OS" })).toBeVisible();
});
