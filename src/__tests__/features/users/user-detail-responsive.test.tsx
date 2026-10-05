import "@/test-utils/antd";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App, ConfigProvider } from "antd";

import UserDetailPage from "@/app/(admin)/users/[userId]/page";
import { useAdminViewport } from "@/components/useAdminViewport";
import { UserDetailCard } from "@/features/users/components/UserDetailCard";
import type { UserDetail } from "@/features/users/types";

jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: jest.fn(() => "wide") }));
const mockViewport = jest.mocked(useAdminViewport);
beforeEach(() => mockViewport.mockReturnValue("wide"));

const mockUpdateNotify = jest.fn();
const mockUpdateRole = jest.fn();
const mockUserQuery = jest.fn();
const mockPush = jest.fn();
jest.mock("@/features/users/hooks", () => ({
  useUser: () => mockUserQuery(),
  useUpdateUserRole: (userId: number) => ({ mutateAsync: (role: string, options: unknown) => mockUpdateRole(userId, role, options), isPending: false }),
  useUpdateUserNotifySettings: () => ({ mutate: mockUpdateNotify, isPending: false }),
  useUpdateUserAlimtalkEnabled: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteUser: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: mockPush }),
  useSearchParams: () => new URLSearchParams("returnTo=%2Fusers%3Fpage%3D2"),
}));
jest.mock("@/features/properties/components/UserPropertiesTab", () => ({ UserPropertiesTab: () => <section aria-label="소속 건물 목록" /> }));
jest.mock("@/features/users/components/ImpersonationModal", () => ({ ImpersonationModal: () => null }));

const user: UserDetail = {
  userId: 12, provider: "KAKAO", role: "USER", status: "ONBOARDED",
  email: "landy@example.com", phone: "010-1234-5678",
  notifyDue: true, notifyOverdue: false, alimtalkEnabled: true,
  createdAt: "2026-10-04T09:00:00", updatedAt: "2026-10-04T09:00:00",
};

function Detail({ subject = user }: { subject?: UserDetail }) {
  return <ConfigProvider theme={{ token: { motion: false } }}><App><UserDetailCard user={subject} /></App></ConfigProvider>;
}

afterEach(() => { jest.restoreAllMocks(); jest.clearAllMocks(); });

test("사용자 상세의 초기 조회·실패·응답·재조회에서 같은 헤더 설명과 복귀 동작을 유지한다", async () => {
  const params = Promise.resolve({ userId: String(user.userId) });
  const refetch = jest.fn();
  const content = () => <ConfigProvider theme={{ token: { motion: false } }}><App><UserDetailPage params={params} /></App></ConfigProvider>;
  mockUserQuery.mockReturnValue({ data: undefined, isLoading: true, isFetching: true, error: null, refetch });
  let view!: ReturnType<typeof render>;
  await act(async () => { view = render(content()); });
  const header = screen.getByRole("heading", { name: "사용자 상세" }).closest(".admin-page-header")!;
  const description = header.querySelector(".admin-page-description")!.textContent;
  expect(description).toContain("계정과 소속 건물·임차인·기기를 확인");
  expect(screen.getByLabelText("상세 정보를 불러오는 중")).toBeVisible();

  mockUserQuery.mockReturnValue({ data: undefined, isLoading: false, isFetching: false, error: new Error("network"), refetch });
  await act(async () => { view.rerender(content()); });
  expect(screen.getByText("사용자 정보를 불러오지 못했습니다.")).toBeVisible();
  expect(screen.getByRole("heading", { name: "사용자 상세" }).closest(".admin-page-header")).toBe(header);
  expect(header.querySelector(".admin-page-description")).toHaveTextContent(description!);
  fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
  expect(refetch).toHaveBeenCalledTimes(1);

  mockUserQuery.mockReturnValue({ data: user, isLoading: false, isFetching: false, error: null, refetch });
  await act(async () => { view.rerender(content()); });
  expect(screen.getByText(user.email)).toBeVisible();
  expect(screen.getByRole("heading", { name: "사용자 상세" }).closest(".admin-page-header")).toBe(header);
  expect(header.querySelector(".admin-page-description")).toHaveTextContent(description!);
  expect(screen.queryByLabelText("상세 정보를 불러오는 중")).not.toBeInTheDocument();

  mockUserQuery.mockReturnValue({ data: user, isLoading: false, isFetching: true, error: null, refetch });
  await act(async () => { view.rerender(content()); });
  expect(screen.getByText(user.email)).toBeVisible();
  expect(header.querySelector(".admin-page-description")).toHaveTextContent(description!);
  fireEvent.click(screen.getByRole("button", { name: /이전 화면으로/ }));
  expect(mockPush).toHaveBeenLastCalledWith("/users?page=2");
});

test("화면 크기가 바뀌어도 계정 요약과 설정을 보존하고 모바일에서는 설정을 펼쳐 변경한다", async () => {
  const view = render(<Detail />);
  const profile = () => screen.getByLabelText("계정 정보 요약");
  expect(within(profile()).getByText("가입 경로")).toBeVisible();
  expect(within(profile()).getByText("카카오")).toBeVisible();
  expect(within(profile()).getByText("현재 역할")).toBeVisible();
  expect(within(profile()).getByText("사용자")).toBeVisible();
  expect(within(profile()).getAllByText("2026-10-04 09:00")).toHaveLength(2);
  expect(screen.queryByRole("link", { name: "설정 변경" })).not.toBeInTheDocument();
  mockViewport.mockReturnValue("mobile");
  view.rerender(<Detail />);
  expect(within(profile()).getByText("카카오")).toBeVisible();
  expect(screen.getByText(user.email)).toBeVisible();
  expect(screen.queryByRole("combobox", { name: "사용자 역할" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "설정 변경" }));
  await waitFor(() => expect(screen.getByRole("combobox", { name: "사용자 역할" })).toBeVisible());
  const dueSwitch = screen.getByRole("switch", { name: "납부일 알림" });
  expect(dueSwitch).toBeChecked();
  fireEvent.click(dueSwitch);
  expect(mockUpdateNotify).toHaveBeenCalledWith({ notifyDue: false }, expect.any(Object));
  mockViewport.mockReturnValue("compact");
  view.rerender(<Detail />);
  expect(screen.queryByRole("link", { name: "설정 변경" })).not.toBeInTheDocument();
  expect(within(profile()).getByText("카카오")).toBeVisible();
  expect(screen.getByRole("switch", { name: "납부일 알림" })).toBeChecked();
});


async function openRoleChange() {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "사용자 역할" }));
  fireEvent.click(await screen.findByText("관리자", { selector: ".ant-select-item-option-content" }));
  const dialog = await screen.findByRole("dialog", { name: "관리자 역할로 변경할까요?" });
  await waitFor(() => expect(dialog).toBeVisible());
  return dialog;
}

test("역할 변경은 요청 중 취소·Escape·중복을 막고 실패하면 같은 대상의 확인창에서 재시도한다", async () => {
  let fail!: (error: Error) => void;
  const request = new Promise<void>((_, reject) => { fail = reject; });
  mockUpdateRole.mockImplementationOnce((_id: number, _role: string, options: { onError: (error: Error) => void }) => request.catch((error) => {
    options.onError(error); throw error;
  })).mockResolvedValueOnce(undefined);
  const view = render(<Detail />);
  const dialog = await openRoleChange();
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "취소" })).toHaveFocus());
  fireEvent.click(within(dialog).getByRole("button", { name: "역할 변경" }));
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "취소" })).toBeDisabled());
  expect(within(dialog).getByRole("button", { name: "역할 변경" })).toBeDisabled();
  fireEvent.keyDown(dialog, { key: "Escape", code: "Escape", keyCode: 27 });
  expect(dialog).toBeVisible();
  expect(mockUpdateRole).toHaveBeenCalledTimes(1);
  mockViewport.mockReturnValue("mobile");
  view.rerender(<Detail />);
  expect(dialog).toBeVisible();
  expect(within(dialog).getByRole("button", { name: "취소" })).toBeDisabled();
  await act(async () => { fail(new Error("network")); await request.catch(() => undefined); });
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "역할 변경" })).toBeEnabled());
  expect(dialog).toBeVisible();
  expect(screen.getByText("역할 변경 실패")).toBeVisible();
  await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "역할 변경" })); });
  expect(mockUpdateRole).toHaveBeenCalledTimes(2);
  expect(mockUpdateRole).toHaveBeenLastCalledWith(12, "ADMIN", expect.any(Object));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "관리자 역할로 변경할까요?" })).not.toBeInTheDocument());
});

test("역할 확인 취소는 선택기로 포커스를 돌리고 대상 변경 시 이전 확인을 정리한다", async () => {
  mockUpdateRole.mockResolvedValue(undefined);
  const view = render(<Detail />);
  let dialog = await openRoleChange();
  fireEvent.click(within(dialog).getByRole("button", { name: "취소" }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "관리자 역할로 변경할까요?" })).not.toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("combobox", { name: "사용자 역할" })).toHaveFocus());
  dialog = await openRoleChange();
  view.rerender(<Detail subject={{ ...user, userId: 14, email: "next@example.com" }} />);
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  expect(mockUpdateRole).not.toHaveBeenCalled();
  dialog = await openRoleChange();
  expect(within(dialog).getByText(/유저 #14 · next@example.com/)).toBeVisible();
  await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "역할 변경" })); });
  expect(mockUpdateRole).toHaveBeenCalledWith(14, "ADMIN", expect.any(Object));
});


test("계정 설정은 하위 목록보다 먼저 보이고 모바일에서는 펼쳐서 수정하며 화면 전환 후에도 보존한다", async () => {
  mockViewport.mockReturnValue("mobile");
  const Content = () => <ConfigProvider theme={{ token: { motion: false } }}><App><UserDetailCard user={user}><section aria-label="임차인 목록">임차인 20건</section></UserDetailCard></App></ConfigProvider>;
  const view = render(<Content />);
  const settings = screen.getByText(/알림·권한 설정/, { selector: "summary" });
  expect(settings.compareDocumentPosition(screen.getByRole("region", { name: "임차인 목록" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.queryByRole("combobox", { name: "사용자 역할" })).not.toBeInTheDocument();
  fireEvent.click(settings);
  await waitFor(() => expect(screen.getByRole("combobox", { name: "사용자 역할" })).toBeVisible());
  fireEvent.click(screen.getByRole("switch", { name: "납부일 알림" }));
  expect(mockUpdateNotify).toHaveBeenCalledWith({ notifyDue: false }, expect.any(Object));
  mockViewport.mockReturnValue("compact");
  view.rerender(<Content />);
  expect(screen.getByRole("combobox", { name: "사용자 역할" })).toBeVisible();
  expect(screen.getByText(user.email)).toBeVisible();
});
