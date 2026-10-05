let mockQuery = "";
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mockQuery), useRouter: () => ({ push: mockPush }) }));
beforeEach(() => { mockQuery = ""; mockPush.mockClear(); });

let mockViewport: "mobile" | "compact" | "wide" = "wide";
jest.mock("@/components/useAdminViewport", () => ({ useAdminViewport: () => mockViewport }));
beforeEach(() => { mockViewport = "wide"; });

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { App } from "antd";

import { ReleasePolicyList } from "@/features/releasePolicies/components/ReleasePolicyList";
import type { ReleasePolicy, ReleasePoliciesListParams } from "@/features/releasePolicies/types";
import { useReleasePolicies } from "@/features/releasePolicies/hooks";

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const getComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (element: Element): CSSStyleDeclaration => getComputedStyle(element);

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

class MockMessageChannel {
  port1 = { onmessage: null as ((event: MessageEvent) => void) | null };
  port2 = {
    postMessage: () => {
      setTimeout(() => this.port1.onmessage?.({} as MessageEvent), 0);
    },
  };
}

Object.defineProperty(global, "MessageChannel", { writable: true, value: MockMessageChannel });

const ios: ReleasePolicy = {
  appReleasePolicyId: 3,
  platform: "IOS",
  channel: "PRODUCTION",
  latestBuildNumber: 42,
  latestVersion: "1.4.2",
  minSupportedBuildNumber: 30,
  storeUrl: "https://apps.apple.com/app/id123456789",
  forceUpdateTitle: "업데이트가 필요합니다",
  forceUpdateMessage: "계속 사용하려면 최신 버전으로 업데이트하세요.",
  softUpdateTitle: "새 버전이 있습니다",
  softUpdateMessage: "지금 업데이트하면 더 편하게 쓸 수 있습니다.",
  createdAt: "2026-08-01T09:00:00",
  updatedAt: "2026-09-01T12:00:00",
};

const android: ReleasePolicy = {
  ...ios,
  appReleasePolicyId: 4,
  platform: "ANDROID",
  channel: "PREVIEW",
  latestVersion: "1.3.9",
  latestBuildNumber: 39,
  minSupportedBuildNumber: 20,
  storeUrl: "https://play.google.com/store/apps/details?id=app.landy",
};

jest.mock("@/features/releasePolicies/hooks", () => ({
  useReleasePolicies: jest.fn((params: ReleasePoliciesListParams = {}) => {
    const policies = [ios, android].filter((policy) => (!params.platform || policy.platform === params.platform) && (!params.channel || policy.channel === params.channel));
    return { data: { releasePolicies: policies, page: params.page ?? 1, size: params.size ?? 20, totalElements: policies.length }, isLoading: false };
  }),
  useUpdateReleasePolicy: () => ({ mutate: jest.fn(), isPending: false }),
}));

test("수정 버튼은 그 행의 정책 값으로 수정 모달을 연다", async () => {
  render(
    <App>
      <ReleasePolicyList />
    </App>,
  );

  fireEvent.click(screen.getAllByRole("button", { name: "수정" })[1]);

  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("릴리즈 정책 수정")).toBeInTheDocument();
  expect(within(dialog).getByText("ANDROID")).toBeInTheDocument();
  expect(within(dialog).getByText("PREVIEW")).toBeInTheDocument();
  expect(within(dialog).getByLabelText("최신 버전")).toHaveValue("1.3.9");
  expect(within(dialog).getByLabelText("스토어 URL")).toHaveValue(
    "https://play.google.com/store/apps/details?id=app.landy",
  );
});


test("모바일 정책 카드는 지원 기준과 전체 안내를 제공하고 해당 정책을 수정한다", async () => {
  mockViewport = "mobile";
  render(<App><ReleasePolicyList /></App>);
  expect(document.querySelector(".ant-table-wrapper")).not.toBeInTheDocument();
  const card = within(screen.getByRole("article", { name: "릴리즈 정책 ANDROID PREVIEW" }));
  expect(card.getByText("1.3.9 · 빌드 #39")).toBeInTheDocument();
  expect(card.getByText("#20")).toBeInTheDocument();
  fireEvent.click(card.getByText("추가 정보"));
  await waitFor(() => expect(card.getByText(android.forceUpdateMessage)).toBeVisible());
  expect(card.getByRole("link", { name: /play.google.com/ })).toHaveAttribute("href", android.storeUrl);
  fireEvent.click(card.getByRole("button", { name: "수정" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByLabelText("최신 버전")).toHaveValue("1.3.9");
  expect(within(dialog).getByText("PREVIEW")).toBeInTheDocument();
});


test("URL의 플랫폼·채널을 복원하고 페이지 크기를 바꿔도 조건과 복귀 경로를 보존한다", () => {
  mockQuery = "platform=ANDROID&channel=PREVIEW&page=1&size=20&returnTo=%2Fusers";
  const view = render(<App><ReleasePolicyList /></App>);
  expect(screen.getByRole("combobox", { name: "플랫폼" }).closest(".ant-select")).toHaveTextContent("ANDROID");
  expect(within(screen.getByRole("table")).getByText("1.3.9")).toBeInTheDocument();
  expect(within(screen.getByRole("table")).queryByText("1.4.2")).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", { name: "릴리즈 정책 목록 페이지당 항목 수" }), { target: { value: "50" } });
  const next = new URLSearchParams(mockPush.mock.calls.at(-1)![0]);
  expect(Object.fromEntries(next)).toEqual({ platform: "ANDROID", channel: "PREVIEW", page: "1", size: "50", returnTo: "/users" });
  mockQuery = "platform=IOS&channel=PRODUCTION&page=1&size=50";
  view.rerender(<App><ReleasePolicyList /></App>);
  expect(within(screen.getByRole("table")).getByText("1.4.2")).toBeInTheDocument();
  expect(within(screen.getByRole("table")).queryByText("1.3.9")).not.toBeInTheDocument();
});

test("서버의 두 번째 페이지를 다시 자르지 않고 전체 정렬 요청과 필터를 보존한다", () => {
  mockQuery = "platform=ANDROID&channel=PREVIEW&page=2&size=20&sort=updatedAt%2Casc&returnTo=%2Fusers";
  jest.mocked(useReleasePolicies).mockReturnValueOnce({ data: { releasePolicies: [android], page: 2, size: 20, totalElements: 21 }, isLoading: false } as ReturnType<typeof useReleasePolicies>);
  render(<App><ReleasePolicyList /></App>);
  expect(useReleasePolicies).toHaveBeenLastCalledWith({ page: 2, size: 20, platform: "ANDROID", channel: "PREVIEW", sort: "updatedAt,asc" });
  expect(within(screen.getByRole("table")).getByText("1.3.9")).toBeVisible();
  expect(screen.getByText("조회 결과 21건")).toBeVisible();
  expect(screen.getByText("21–21번째 · 2페이지")).toBeVisible();
  fireEvent.change(screen.getByRole("combobox", { name: "릴리즈 정책 목록 정렬 기준" }), { target: { value: "createdAt" } });
  expect(Object.fromEntries(new URLSearchParams(mockPush.mock.calls.at(-1)![0]))).toEqual({ platform: "ANDROID", channel: "PREVIEW", page: "1", size: "20", sort: "createdAt,asc", returnTo: "/users" });
});
