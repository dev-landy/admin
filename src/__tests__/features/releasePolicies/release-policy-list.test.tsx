import { fireEvent, render, screen, within } from "@testing-library/react";
import { App } from "antd";

import { ReleasePolicyList } from "@/features/releasePolicies/components/ReleasePolicyList";
import type { ReleasePolicy } from "@/features/releasePolicies/types";

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
  useReleasePolicies: () => ({ data: { releasePolicies: [ios, android] }, isLoading: false }),
  useUpdateReleasePolicy: () => ({ mutate: jest.fn(), isPending: false }),
}));

test("정책 목록은 릴리즈 정책 제목과 정책마다 수정 버튼을 보여준다", () => {
  render(
    <App>
      <ReleasePolicyList />
    </App>,
  );

  expect(screen.getByRole("heading", { name: "릴리즈 정책" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "수정" })).toHaveLength(2);
});

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
